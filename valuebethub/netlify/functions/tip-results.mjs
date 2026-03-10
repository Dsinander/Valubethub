// netlify/functions/tip-results.mjs
// Manages daily tip history: saves today's AI picks + checks results of past tips
// Called on a schedule (Netlify Scheduled Functions) or manually via /api/tip-results

const API_BASE = "https://v3.football.api-sports.io";
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // Service role for write access

async function apiFetch(endpoint) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json();
  return json.response || [];
}

async function supabaseQuery(path, method = "GET", body = null) {
  const opts = {
    method,
    headers: {
      "apikey": SUPABASE_SERVICE_KEY,
      "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": method === "POST" ? "return=representation" : "return=minimal",
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, opts);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase error: ${res.status} ${text}`);
  }
  if (method === "GET" || method === "POST") {
    return res.json().catch(() => null);
  }
  return null;
}

// ─── SAVE TODAY'S TIPS ─────────────────────────────────────────────────
async function saveDailyTips() {
  const today = new Date().toISOString().split("T")[0];

  // Check if we already saved today's tips
  const existing = await supabaseQuery(`daily_tips?tip_date=eq.${today}&select=id&limit=1`);
  if (existing?.length > 0) {
    return { saved: 0, message: "Tips already saved for today" };
  }

  // Fetch today's data from our own API
  const dataRes = await fetch(`https://valuebethub.com/api/get-data`);
  const data = await dataRes.json();

  if (!data.success || !data.fixtures?.length) {
    return { saved: 0, message: "No fixtures available" };
  }

  // Generate tips using same logic as frontend (simplified version)
  const tips = [];
  for (const fix of data.fixtures) {
    if (!fix.odds || Object.keys(fix.odds).length === 0) continue;

    // Find best market for this fixture
    let bestMarket = null;
    let bestScore = -Infinity;

    for (const [market, odds] of Object.entries(fix.odds)) {
      if (odds < 1.10) continue;
      const impliedProb = (1 / odds) * 100;
      const fairProb = impliedProb * 0.96; // Remove margin estimate
      const edge = fairProb - impliedProb;

      // Score by probability * edge (same philosophy as frontend)
      const score = (fairProb * 0.6) + (edge * 8);

      // Probability floors
      if (market.includes("Home Win") || market.includes("Away Win")) {
        if (fairProb < 42) continue;
      } else if (market.includes("Draw") && !market.includes("Draw No Bet")) {
        if (fairProb < 25) continue;
      } else if (fairProb < 35) {
        continue;
      }

      if (score > bestScore) {
        bestScore = score;
        bestMarket = {
          market,
          odds,
          aiProb: +fairProb.toFixed(1),
          impliedProb: +impliedProb.toFixed(1),
          edge: +(fairProb - impliedProb).toFixed(1),
        };
      }
    }

    if (bestMarket) {
      const conf =
        bestMarket.edge > 2 && bestMarket.aiProb >= 55 ? "strong" :
        bestMarket.edge > 0 && bestMarket.aiProb >= 45 ? "value" :
        bestMarket.aiProb >= 55 ? "high_prob" :
        bestMarket.edge > 0 ? "slight" : "ai_pick";

      tips.push({
        tip_date: today,
        fixture_id: fix.id,
        home_team: fix.home,
        away_team: fix.away,
        league: fix.league,
        league_flag: fix.leagueFlag,
        match_date: fix.date,
        match_time: fix.time,
        market: bestMarket.market,
        bookmaker_odds: bestMarket.odds,
        ai_probability: bestMarket.aiProb,
        implied_probability: bestMarket.impliedProb,
        edge: bestMarket.edge,
        confidence: conf,
        result: "pending",
      });
    }
  }

  // Take top 8 tips (one per match, best scores)
  const topTips = tips.slice(0, 8);

  if (topTips.length > 0) {
    await supabaseQuery("daily_tips", "POST", topTips);
  }

  return { saved: topTips.length, message: `Saved ${topTips.length} tips for ${today}` };
}

// ─── CHECK RESULTS ────────────────────────────────────────────────────
async function checkResults() {
  // Get pending tips from the last 3 days
  const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString().split("T")[0];
  const pending = await supabaseQuery(
    `daily_tips?result=eq.pending&match_date=gte.${threeDaysAgo}&select=*`
  );

  if (!pending?.length) return { checked: 0, updated: 0 };

  let updated = 0;

  for (const tip of pending) {
    try {
      // Fetch fixture result from API
      const fixtureData = await apiFetch(`/fixtures?id=${tip.fixture_id}`);
      const fixture = fixtureData[0];

      if (!fixture) continue;

      const status = fixture.fixture?.status?.short;
      // Only process finished matches
      if (!["FT", "AET", "PEN"].includes(status)) {
        // Check for postponed
        if (["PST", "CANC", "ABD", "AWD", "WO"].includes(status)) {
          await supabaseQuery(
            `daily_tips?id=eq.${tip.id}`,
            "PATCH",
            { result: "postponed", settled_at: new Date().toISOString() }
          );
          updated++;
        }
        continue;
      }

      const homeGoals = fixture.goals?.home ?? null;
      const awayGoals = fixture.goals?.away ?? null;

      if (homeGoals === null || awayGoals === null) continue;

      const score = `${homeGoals}-${awayGoals}`;
      const totalGoals = homeGoals + awayGoals;

      // Determine if tip won or lost
      let result = "lost";
      const m = tip.market;

      // 1X2
      if (m === "Home Win" && homeGoals > awayGoals) result = "won";
      if (m === "Away Win" && awayGoals > homeGoals) result = "won";
      if (m === "Draw" && homeGoals === awayGoals) result = "won";

      // Over/Under
      if (m === "Over 1.5" && totalGoals > 1.5) result = "won";
      if (m === "Under 1.5" && totalGoals < 1.5) result = "won";
      if (m === "Over 2.5" && totalGoals > 2.5) result = "won";
      if (m === "Under 2.5" && totalGoals < 2.5) result = "won";
      if (m === "Over 3.5" && totalGoals > 3.5) result = "won";
      if (m === "Under 3.5" && totalGoals < 3.5) result = "won";

      // BTTS
      if (m === "BTTS Yes" && homeGoals > 0 && awayGoals > 0) result = "won";
      if (m === "BTTS No" && (homeGoals === 0 || awayGoals === 0)) result = "won";

      // Double Chance
      if (m === "1X (Home or Draw)" && homeGoals >= awayGoals) result = "won";
      if (m === "X2 (Draw or Away)" && awayGoals >= homeGoals) result = "won";
      if (m === "12 (Home or Away)" && homeGoals !== awayGoals) result = "won";

      // Draw No Bet
      if (m === "Draw No Bet Home") {
        if (homeGoals > awayGoals) result = "won";
        else if (homeGoals === awayGoals) result = "void";
      }
      if (m === "Draw No Bet Away") {
        if (awayGoals > homeGoals) result = "won";
        else if (homeGoals === awayGoals) result = "void";
      }

      // Combos
      if (m === "Home Win & Over 2.5" && homeGoals > awayGoals && totalGoals > 2.5) result = "won";
      if (m === "Home Win & Under 2.5" && homeGoals > awayGoals && totalGoals < 2.5) result = "won";
      if (m === "Away Win & Over 2.5" && awayGoals > homeGoals && totalGoals > 2.5) result = "won";
      if (m === "Away Win & Under 2.5" && awayGoals > homeGoals && totalGoals < 2.5) result = "won";
      if (m === "Draw & Over 2.5" && homeGoals === awayGoals && totalGoals > 2.5) result = "won";
      if (m === "Draw & Under 2.5" && homeGoals === awayGoals && totalGoals < 2.5) result = "won";
      if (m === "Home Win & BTTS Yes" && homeGoals > awayGoals && homeGoals > 0 && awayGoals > 0) result = "won";
      if (m === "Home Win & BTTS No" && homeGoals > awayGoals && (homeGoals === 0 || awayGoals === 0)) result = "won";
      if (m === "Away Win & BTTS Yes" && awayGoals > homeGoals && homeGoals > 0 && awayGoals > 0) result = "won";
      if (m === "Away Win & BTTS No" && awayGoals > homeGoals && (homeGoals === 0 || awayGoals === 0)) result = "won";

      // Asian Handicap (simplified — doesn't handle half-win/half-loss)
      const ahMatch = m.match(/AH (Home|Away) ([+-]?\d+\.?\d*)/);
      if (ahMatch) {
        const side = ahMatch[1];
        const line = parseFloat(ahMatch[2]);
        const diff = homeGoals - awayGoals;
        if (side === "Home" && (diff + line) > 0) result = "won";
        if (side === "Away" && (-diff + line) > 0) result = "won";
        if (side === "Home" && (diff + line) === 0) result = "void";
        if (side === "Away" && (-diff + line) === 0) result = "void";
      }

      await supabaseQuery(
        `daily_tips?id=eq.${tip.id}`,
        "PATCH",
        {
          result,
          actual_score: score,
          home_goals: homeGoals,
          away_goals: awayGoals,
          settled_at: new Date().toISOString(),
        }
      );
      updated++;
    } catch (e) {
      console.error(`Error checking tip ${tip.id}:`, e.message);
    }
  }

  return { checked: pending.length, updated };
}

// ─── HANDLER ──────────────────────────────────────────────────────────
export default async (req) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });

  try {
    // Do both: save today's tips + check results
    const [saveResult, checkResult] = await Promise.all([
      saveDailyTips(),
      checkResults(),
    ]);

    return new Response(JSON.stringify({
      success: true,
      saved: saveResult,
      results: checkResult,
      timestamp: new Date().toISOString(),
    }), { headers });
  } catch (error) {
    console.error("tip-results error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), { status: 500, headers });
  }
};

export const config = {
  schedule: "0 */4 * * *",
};
