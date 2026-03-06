// src/api.js
// Fetches match data from our Netlify function with client-side caching

const API_URL = "/api/get-data";
const CLIENT_CACHE_TTL = 30 * 60 * 1000; // 30 minutes client-side

let clientCache = { data: null, timestamp: 0 };

export async function fetchMatchData() {
  // Check client cache first
  const now = Date.now();
  if (clientCache.data && now - clientCache.timestamp < CLIENT_CACHE_TTL) {
    return { success: true, fixtures: clientCache.data, cached: true };
  }

  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();

    if (json.success && json.fixtures) {
      clientCache = { data: json.fixtures, timestamp: now };
    }

    return json;
  } catch (error) {
    console.error("Failed to fetch match data:", error);

    // Return stale cache if available
    if (clientCache.data) {
      return { success: true, fixtures: clientCache.data, cached: true, stale: true };
    }

    return { success: false, error: error.message };
  }
}

// ─── ANALYSIS ENGINE ─────────────────────────────────────────────────
// Takes real API data and generates betting opportunities with value analysis

// Market categories the user can toggle
export const MARKET_CATEGORIES = {
  "1X2": {
    label: "1X2 (Match Result)",
    icon: "⚽",
    markets: ["Home Win", "Draw", "Away Win"],
  },
  "OU_GOALS": {
    label: "Over/Under Goals",
    icon: "🎯",
    markets: ["Over 1.5", "Under 1.5", "Over 2.5", "Under 2.5", "Over 3.5", "Under 3.5"],
  },
  "BTTS": {
    label: "Both Teams to Score",
    icon: "🥅",
    markets: ["BTTS Yes", "BTTS No"],
  },
  "DOUBLE_CHANCE": {
    label: "Double Chance",
    icon: "🔄",
    markets: ["1X (Home or Draw)", "X2 (Draw or Away)", "12 (Home or Away)"],
  },
  "CORNERS": {
    label: "Corners",
    icon: "📐",
    markets: ["Over 8.5 Corners", "Under 8.5 Corners", "Over 10.5 Corners", "Under 10.5 Corners"],
  },
};

// Calculate AI probability for each market using the real data
function calcMarketProb(fixture, market) {
  const pred = fixture.prediction || {};
  const homeWin = (pred.homeWinPct || 33) / 100;
  const draw = (pred.drawPct || 33) / 100;
  const awayWin = (pred.awayWinPct || 33) / 100;

  // xG-based goal expectation
  const expectedGoals = ((fixture.homeXGFor || 1.3) + (fixture.awayXGFor || 1.2)) / 2 + (fixture.h2h?.avgGoals || 2.5) * 0.15;

  switch (market) {
    case "Home Win": return homeWin;
    case "Draw": return draw;
    case "Away Win": return awayWin;
    case "Over 1.5": return Math.min(0.92, Math.max(0.40, 0.65 + (expectedGoals - 2.0) * 0.12));
    case "Under 1.5": return 1 - Math.min(0.92, Math.max(0.40, 0.65 + (expectedGoals - 2.0) * 0.12));
    case "Over 2.5": return Math.min(0.80, Math.max(0.20, 0.48 + (expectedGoals - 2.5) * 0.14));
    case "Under 2.5": return 1 - Math.min(0.80, Math.max(0.20, 0.48 + (expectedGoals - 2.5) * 0.14));
    case "Over 3.5": return Math.min(0.60, Math.max(0.10, 0.30 + (expectedGoals - 3.5) * 0.14));
    case "Under 3.5": return 1 - Math.min(0.60, Math.max(0.10, 0.30 + (expectedGoals - 3.5) * 0.14));
    case "BTTS Yes": return Math.min(0.70, Math.max(0.25, 0.50 + (expectedGoals - 2.5) * 0.08));
    case "BTTS No": return 1 - Math.min(0.70, Math.max(0.25, 0.50 + (expectedGoals - 2.5) * 0.08));
    case "1X (Home or Draw)": return Math.min(0.92, homeWin + draw);
    case "X2 (Draw or Away)": return Math.min(0.85, draw + awayWin);
    case "12 (Home or Away)": return Math.min(0.90, homeWin + awayWin);
    case "Over 8.5 Corners": return Math.min(0.75, Math.max(0.30, 0.55 + (expectedGoals - 2.5) * 0.06));
    case "Under 8.5 Corners": return 1 - Math.min(0.75, Math.max(0.30, 0.55 + (expectedGoals - 2.5) * 0.06));
    case "Over 10.5 Corners": return Math.min(0.55, Math.max(0.15, 0.38 + (expectedGoals - 2.5) * 0.06));
    case "Under 10.5 Corners": return 1 - Math.min(0.55, Math.max(0.15, 0.38 + (expectedGoals - 2.5) * 0.06));
    default: return 0.50;
  }
}

// Generate all opportunities from fixtures
export function generateOpportunities(fixtures, allowedMarkets) {
  const opps = [];

  fixtures.forEach(fix => {
    const allMarkets = Object.values(MARKET_CATEGORIES).flatMap(c => c.markets);
    const markets = allMarkets.filter(m => !allowedMarkets || allowedMarkets.has(m));

    markets.forEach(market => {
      const aiProb = calcMarketProb(fix, market);
      const realOdds = fix.odds?.[market];

      // Skip markets where we don't have real odds
      if (!realOdds || realOdds < 1.01) return;

      const impliedProb = 1 / realOdds;
      const edge = aiProb - impliedProb;

      opps.push({
        id: `${fix.id}-${market}`,
        fixtureId: fix.id,
        home: fix.home,
        away: fix.away,
        homeLogo: fix.homeLogo,
        awayLogo: fix.awayLogo,
        league: fix.league,
        leagueFlag: fix.leagueFlag,
        time: fix.time,
        day: fix.day,
        date: fix.date,
        sport: fix.sport || "football",
        market,
        aiProbability: +(aiProb * 100).toFixed(1),
        bookmakerOdds: realOdds,
        impliedProbability: +(impliedProb * 100).toFixed(1),
        edge: +(edge * 100).toFixed(1),
        isValue: edge > 0.015,
        // Analysis data for breakdown
        analysis: {
          homeForm: fix.homeForm,
          awayForm: fix.awayForm,
          homeRecentForm: fix.homeForm,
          awayRecentForm: fix.awayForm,
          h2hData: fix.h2h,
          homeRecord: fix.homeRecord,
          awayRecord: fix.awayRecord,
          homeInjuries: fix.homeInjuries || [],
          awayInjuries: fix.awayInjuries || [],
          homeSuspensions: [],
          awaySuspensions: [],
          homeXGFor: fix.homeXGFor,
          homeXGAgainst: fix.homeXGAgainst,
          awayXGFor: fix.awayXGFor,
          awayXGAgainst: fix.awayXGAgainst,
          homeContext: "",
          awayContext: "",
          homeLeaguePos: fix.homeLeaguePos,
          awayLeaguePos: fix.awayLeaguePos,
          expectedGoals: ((fix.homeXGFor || 1.3) + (fix.awayXGFor || 1.2)),
          prediction: fix.prediction,
          comparison: fix.comparison,
          factors: {
            form: { home: 0.5, away: 0.5, weight: 0.2 },
            h2h: { home: 0.5, away: 0.5, weight: 0.12 },
            homeAway: { home: 0.5, away: 0.5, weight: 0.18 },
            xG: { home: 0.5, away: 0.5, weight: 0.2 },
            injuries: { home: 1, away: 1, weight: 0.12 },
          },
        },
      });
    });
  });

  return opps;
}

// Build a slip targeting the user's desired return
export function buildSlip(opportunities, numSelections, riskLevel, targetOdds, targetWinnings, stake) {
  const targetPerLeg = Math.pow(targetOdds, 1 / numSelections);

  const tolerance = {
    conservative: { min: Math.max(1.10, targetPerLeg * 0.6), max: targetPerLeg * 1.2 },
    balanced:     { min: Math.max(1.10, targetPerLeg * 0.5), max: targetPerLeg * 1.5 },
    aggressive:   { min: Math.max(1.10, targetPerLeg * 0.4), max: targetPerLeg * 2.0 },
  }[riskLevel];

  const scored = opportunities.map(opp => {
    const odds = opp.bookmakerOdds;
    const edge = parseFloat(opp.edge);
    const oddsFit = Math.abs(Math.log(odds) - Math.log(targetPerLeg));
    const inRange = odds >= tolerance.min && odds <= tolerance.max;

    let score = inRange ? 10 : 0;
    score -= oddsFit * 5;
    score += edge * 2;
    if (opp.isValue) score += 3;
    if (riskLevel === "conservative") score += opp.aiProbability * 0.05;
    if (riskLevel === "aggressive") score += edge * 1.5;

    return { ...opp, _score: score };
  });

  scored.sort((a, b) => b._score - a._score);

  const selected = [];
  const usedMatches = new Set();
  let currentCombinedOdds = 1;

  for (const opp of scored) {
    if (selected.length >= numSelections) break;
    const key = `${opp.home}-${opp.away}`;
    if (usedMatches.has(key)) continue;

    const wouldBe = currentCombinedOdds * opp.bookmakerOdds;
    const remainingLegs = numSelections - selected.length - 1;

    if (remainingLegs > 0) {
      const neededPerRemaining = Math.pow(targetOdds / wouldBe, 1 / remainingLegs);
      if (neededPerRemaining < 1.05) continue;
      if (neededPerRemaining > 6.0 && riskLevel !== "aggressive") continue;
    } else {
      const ratio = wouldBe / targetOdds;
      if (ratio > 2.5 || ratio < 0.3) continue;
    }

    usedMatches.add(key);
    selected.push(opp);
    currentCombinedOdds = wouldBe;
  }

  // Fill remaining if needed
  if (selected.length < numSelections) {
    for (const opp of scored) {
      if (selected.length >= numSelections) break;
      const key = `${opp.home}-${opp.away}`;
      if (usedMatches.has(key)) continue;
      usedMatches.add(key);
      selected.push(opp);
    }
  }

  const combinedOdds = selected.reduce((acc, m) => acc * m.bookmakerOdds, 1);
  const avgEdge = selected.length ? selected.reduce((a, m) => a + parseFloat(m.edge), 0) / selected.length : 0;
  const slipWinProb = selected.reduce((acc, m) => acc * (m.aiProbability / 100), 1);
  const targetRatio = combinedOdds / targetOdds;
  const targetHit = targetRatio >= 0.7 && targetRatio <= 1.5;

  // Smart suggestions
  const maxMatches = new Set(opportunities.map(o => `${o.home}-${o.away}`)).size;
  const suggestions = [];

  if (!targetHit || slipWinProb < 0.03) {
    if (numSelections < maxMatches) {
      const moreLegs = Math.min(maxMatches, numSelections + 2);
      const perLegWithMore = Math.pow(targetOdds, 1 / moreLegs);
      if (perLegWithMore < targetPerLeg) {
        suggestions.push({
          icon: "➕", title: "Add more selections",
          detail: `With ${moreLegs} legs instead of ${numSelections}, each needs ${perLegWithMore.toFixed(2)}x (vs ${targetPerLeg.toFixed(2)}x now).`,
          action: `try_legs_${moreLegs}`,
        });
      }
    }
    if (targetOdds > 5) {
      const neededStake = Math.ceil(parseFloat(targetWinnings || 500) / 5);
      suggestions.push({
        icon: "💰", title: "Increase your stake",
        detail: `€${neededStake} stake would only need 5x odds to hit your target.`,
        action: `try_stake_${neededStake}`,
      });
    }
    if (riskLevel === "conservative" && targetPerLeg > 2.0) {
      suggestions.push({
        icon: "⚠️", title: "Risk level mismatch",
        detail: `Your target requires ${targetPerLeg.toFixed(2)}x per leg, but "Safe" mode prefers under 2.0x. This slip isn't truly "safe."`,
      });
    }
  }

  if (targetHit && slipWinProb > 0.05 && avgEdge > 0) {
    suggestions.push({
      icon: "✅", title: "Good setup",
      detail: `Target is realistic. ${selected.filter(m => m.isValue).length} value bets with positive edge.`,
    });
  }

  return {
    selections: selected,
    combinedOdds: +combinedOdds.toFixed(2),
    avgEdge: +avgEdge.toFixed(1),
    slipWinProbability: +(slipWinProb * 100).toFixed(1),
    valueCount: selected.filter(m => m.isValue).length,
    targetOdds: +targetOdds.toFixed(2),
    targetHit,
    targetPerLeg: +targetPerLeg.toFixed(2),
    suggestions,
  };
}
