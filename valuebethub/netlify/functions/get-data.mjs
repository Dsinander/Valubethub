// netlify/functions/get-data.mjs
// Fetches real match data from API-Football, transforms it for our app.
// Cached at Netlify's CDN edge for 12 hours to save API requests.

const API_BASE = "https://v3.football.api-sports.io";

// Major leagues + domestic cups (API-Football league IDs)
const LEAGUE_IDS = {
  39: "Premier League",        // England
  140: "La Liga",              // Spain
  78: "Bundesliga",            // Germany
  135: "Serie A",              // Italy
  61: "Ligue 1",              // France
  113: "Allsvenskan",          // Sweden
  88: "Eredivisie",           // Netherlands
  94: "Primeira Liga",         // Portugal
  203: "Super Lig",            // Turkey
  144: "Jupiler Pro League",   // Belgium
  2: "Champions League",
  3: "Europa League",
  848: "Conference League",
  // Domestic cups
  45: "FA Cup",
  143: "Copa del Rey",
  529: "DFB Pokal",
  137: "Coppa Italia",
  66: "Coupe de France",
  48: "EFL Cup",
};

const LEAGUE_FLAGS = {
  "Premier League": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  "La Liga": "🇪🇸",
  "Bundesliga": "🇩🇪",
  "Serie A": "🇮🇹",
  "Ligue 1": "🇫🇷",
  "Allsvenskan": "🇸🇪",
  "Eredivisie": "🇳🇱",
  "Primeira Liga": "🇵🇹",
  "Super Lig": "🇹🇷",
  "Jupiler Pro League": "🇧🇪",
  "Champions League": "🏆",
  "Europa League": "🏆",
  "Conference League": "🏆",
  "FA Cup": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  "Copa del Rey": "🇪🇸",
  "DFB Pokal": "🇩🇪",
  "Coppa Italia": "🇮🇹",
  "Coupe de France": "🇫🇷",
  "EFL Cup": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
};

// Simple in-memory cache (persists across warm function invocations)
let cache = { data: null, timestamp: 0 };
const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours

// ─── FIX: Timeout wrapper ──────────────────────────────────────────────
// Prevents any single API call from hanging the entire function.
// Netlify free tier has a 10s timeout — every call MUST finish fast.
function withTimeout(promise, ms = 5000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), ms)),
  ]);
}

async function apiFetch(endpoint) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      "x-apisports-key": process.env.API_FOOTBALL_KEY,
    },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json();
  return json.response || [];
}

// Get date string in API format
function getDateStr(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split("T")[0];
}

// ═══════════════════════════════════════════════════════════════════════
// FIX #1: Fetch ALL days in PARALLEL (was serial — 3 round trips)
// FIX #2: Fetch 7 days to match the frontend "Next 7 Days" filter
//         (was only 3 days — "Weekend" and "Next 7 Days" showed empty)
// ═══════════════════════════════════════════════════════════════════════
async function fetchFixtures() {
  const debugLog = [];
  const days = 7;

  // Fire all day-fetches simultaneously instead of one-by-one
  const dayPromises = [];
  for (let i = 0; i < days; i++) {
    const dateStr = getDateStr(i);
    dayPromises.push(
      withTimeout(apiFetch(`/fixtures?date=${dateStr}`), 8000)
        .then(fixtures => {
          debugLog.push(`${dateStr}: ${fixtures.length} fixtures`);
          return fixtures;
        })
        .catch(e => {
          debugLog.push(`${dateStr}: FAILED - ${e.message}`);
          return []; // One failed day won't kill everything
        })
    );
  }

  // All days resolve at once (~1 round trip time instead of 7)
  const results = await Promise.all(dayPromises);
  const allFixtures = results.flat();

  console.log("Fetch debug:", debugLog.join(" | "));

  const foundLeagueIds = [...new Set(allFixtures.map(f => f.league?.id))];
  console.log("League IDs found:", foundLeagueIds.join(", "));

  const matchingFixtures = allFixtures.filter(f => LEAGUE_IDS[f.league?.id]);
  console.log(`Matching supported leagues: ${matchingFixtures.length} of ${allFixtures.length}`);

  // Filter to our supported leagues + only scheduled
  const supported = allFixtures.filter(f => {
    const leagueId = f.league?.id;
    const status = f.fixture?.status?.short;
    return LEAGUE_IDS[leagueId] && ["NS", "TBD", "PST"].includes(status);
  });

  console.log(`After status filter (NS/TBD/PST): ${supported.length} fixtures`);

  // Remove duplicates
  const seen = new Set();
  return supported.filter(f => {
    const id = f.fixture?.id;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

// Fetch predictions for a fixture
async function fetchPrediction(fixtureId) {
  try {
    const data = await withTimeout(apiFetch(`/predictions?fixture=${fixtureId}`), 5000);
    return data[0] || null;
  } catch {
    return null;
  }
}

// Fetch injuries for a fixture
async function fetchInjuries(fixtureId) {
  try {
    return await withTimeout(apiFetch(`/injuries?fixture=${fixtureId}`), 5000);
  } catch {
    return [];
  }
}

// Fetch odds for a fixture
async function fetchOdds(fixtureId) {
  try {
    const data = await withTimeout(apiFetch(`/odds?fixture=${fixtureId}`), 5000);
    return data[0]?.bookmakers || [];
  } catch {
    return [];
  }
}

// Transform API data into our app's format
function transformFixture(fixture, prediction, injuries, odds) {
  const f = fixture.fixture;
  const league = fixture.league;
  const teams = fixture.teams;
  const kickoff = new Date(f.date);
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Extract form from prediction
  const homeForm = prediction?.teams?.home?.league?.form?.slice(-5)?.split("") || [];
  const awayForm = prediction?.teams?.away?.league?.form?.slice(-5)?.split("") || [];

  // Extract H2H
  const h2hMatches = (prediction?.h2h || []).slice(0, 5).map(m => ({
    home: m.teams?.home?.name,
    away: m.teams?.away?.name,
    score: `${m.goals?.home ?? "?"}-${m.goals?.away ?? "?"}`,
    date: m.fixture?.date?.split("T")[0]?.slice(0, 7) || "",
  }));

  const h2hHomeWins = h2hMatches.filter(m => {
    const [hg, ag] = m.score.split("-").map(Number);
    return hg > ag && m.home === teams.home.name;
  }).length;
  const h2hAwayWins = h2hMatches.filter(m => {
    const [hg, ag] = m.score.split("-").map(Number);
    return ag > hg && m.away === teams.away.name;
  }).length;
  const h2hDraws = h2hMatches.length - h2hHomeWins - h2hAwayWins;
  const h2hAvgGoals = h2hMatches.length > 0
    ? +(h2hMatches.reduce((sum, m) => {
        const [hg, ag] = m.score.split("-").map(Number);
        return sum + (isNaN(hg + ag) ? 0 : hg + ag);
      }, 0) / h2hMatches.length).toFixed(1)
    : 2.5;

  // Extract comparison data
  const comp = prediction?.comparison || {};

  // Extract league stats from prediction
  const homeLStats = prediction?.teams?.home?.league || {};
  const awayLStats = prediction?.teams?.away?.league || {};

  // Parse home/away records
  const homeRecord = {
    w: homeLStats.fixtures?.wins?.home ?? 0,
    d: homeLStats.fixtures?.draws?.home ?? 0,
    l: homeLStats.fixtures?.loses?.home ?? 0,
    gf: homeLStats.goals?.for?.total?.home ?? 0,
    ga: homeLStats.goals?.against?.total?.home ?? 0,
  };
  const awayRecord = {
    w: awayLStats.fixtures?.wins?.away ?? 0,
    d: awayLStats.fixtures?.draws?.away ?? 0,
    l: awayLStats.fixtures?.loses?.away ?? 0,
    gf: awayLStats.goals?.for?.total?.away ?? 0,
    ga: awayLStats.goals?.against?.total?.away ?? 0,
  };

  // Parse odds into our format
  const parsedOdds = {};
  (odds || []).forEach(bookie => {
    (bookie.bets || []).forEach(bet => {
      bet.values?.forEach(val => {
        const oddVal = parseFloat(val.odd);
        if (isNaN(oddVal)) return;

        if (bet.name === "Match Winner") {
          if (val.value === "Home") parsedOdds["Home Win"] = oddVal;
          if (val.value === "Draw") parsedOdds["Draw"] = oddVal;
          if (val.value === "Away") parsedOdds["Away Win"] = oddVal;
        }
        if (bet.name === "Goals Over/Under") {
          if (val.value === "Over 1.5") parsedOdds["Over 1.5"] = oddVal;
          if (val.value === "Under 1.5") parsedOdds["Under 1.5"] = oddVal;
          if (val.value === "Over 2.5") parsedOdds["Over 2.5"] = oddVal;
          if (val.value === "Under 2.5") parsedOdds["Under 2.5"] = oddVal;
          if (val.value === "Over 3.5") parsedOdds["Over 3.5"] = oddVal;
          if (val.value === "Under 3.5") parsedOdds["Under 3.5"] = oddVal;
        }
        if (bet.name === "Both Teams Score") {
          if (val.value === "Yes") parsedOdds["BTTS Yes"] = oddVal;
          if (val.value === "No") parsedOdds["BTTS No"] = oddVal;
        }
        if (bet.name === "Double Chance") {
          if (val.value === "Home/Draw") parsedOdds["1X (Home or Draw)"] = oddVal;
          if (val.value === "Draw/Away") parsedOdds["X2 (Draw or Away)"] = oddVal;
          if (val.value === "Home/Away") parsedOdds["12 (Home or Away)"] = oddVal;
        }
        if (bet.name === "Total - Corners") {
          if (val.value === "Over 8.5") parsedOdds["Over 8.5 Corners"] = oddVal;
          if (val.value === "Under 8.5") parsedOdds["Under 8.5 Corners"] = oddVal;
          if (val.value === "Over 10.5") parsedOdds["Over 10.5 Corners"] = oddVal;
          if (val.value === "Under 10.5") parsedOdds["Under 10.5 Corners"] = oddVal;
        }
      });
    });
  });

  // Transform injuries
  const homeInjuries = (injuries || [])
    .filter(inj => inj.team?.id === teams.home.id)
    .map(inj => ({
      player: inj.player?.name || "Unknown",
      position: inj.player?.type || "N/A",
      importance: "starter",
      status: inj.player?.reason?.toLowerCase()?.includes("doubtful") ? "doubtful" : "out",
      returnDate: inj.player?.reason || "Unknown",
    }));

  const awayInjuries = (injuries || [])
    .filter(inj => inj.team?.id === teams.away.id)
    .map(inj => ({
      player: inj.player?.name || "Unknown",
      position: inj.player?.type || "N/A",
      importance: "starter",
      status: inj.player?.reason?.toLowerCase()?.includes("doubtful") ? "doubtful" : "out",
      returnDate: inj.player?.reason || "Unknown",
    }));

  // Prediction percentages from API
  const predHome = parseInt(prediction?.predictions?.percent?.home) || 33;
  const predDraw = parseInt(prediction?.predictions?.percent?.draw) || 33;
  const predAway = parseInt(prediction?.predictions?.percent?.away) || 33;

  return {
    id: f.id,
    home: teams.home.name,
    away: teams.away.name,
    homeLogo: teams.home.logo,
    awayLogo: teams.away.logo,
    league: LEAGUE_IDS[league.id] || league.name,
    leagueFlag: LEAGUE_FLAGS[LEAGUE_IDS[league.id]] || "⚽",
    leagueLogo: league.logo,
    time: kickoff.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
    day: dayNames[kickoff.getDay()],
    date: kickoff.toISOString().split("T")[0],
    sport: "football",

    prediction: {
      homeWinPct: predHome,
      drawPct: predDraw,
      awayWinPct: predAway,
      advice: prediction?.predictions?.advice || "",
      winner: prediction?.predictions?.winner?.name || "",
    },

    homeForm,
    awayForm,

    h2h: {
      last5: h2hMatches,
      homeWins: h2hHomeWins,
      draws: h2hDraws,
      awayWins: h2hAwayWins,
      avgGoals: h2hAvgGoals,
    },

    homeRecord,
    awayRecord,

    comparison: comp,

    homeInjuries,
    awayInjuries,

    odds: parsedOdds,

    homeLeaguePos: homeLStats.fixtures?.played?.total
      ? Math.max(1, Math.round(20 * (1 - (homeLStats.fixtures?.wins?.total || 0) / (homeLStats.fixtures?.played?.total || 1))))
      : null,
    awayLeaguePos: awayLStats.fixtures?.played?.total
      ? Math.max(1, Math.round(20 * (1 - (awayLStats.fixtures?.wins?.total || 0) / (awayLStats.fixtures?.played?.total || 1))))
      : null,

    homeXGFor: homeLStats.goals?.for?.average?.total ? parseFloat(homeLStats.goals.for.average.total) : 1.3,
    homeXGAgainst: homeLStats.goals?.against?.average?.total ? parseFloat(homeLStats.goals.against.average.total) : 1.1,
    awayXGFor: awayLStats.goals?.for?.average?.total ? parseFloat(awayLStats.goals.for.average.total) : 1.2,
    awayXGAgainst: awayLStats.goals?.against?.average?.total ? parseFloat(awayLStats.goals.against.average.total) : 1.2,
  };
}

export default async (req) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
    "Cache-Control": "public, s-maxage=43200, max-age=3600",
    "Netlify-CDN-Cache-Control": "public, s-maxage=43200",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  // Check in-memory cache (only if it has actual data)
  const now = Date.now();
  if (cache.data && cache.data.length > 0 && now - cache.timestamp < CACHE_TTL) {
    return new Response(JSON.stringify({
      success: true,
      cached: true,
      lastUpdated: new Date(cache.timestamp).toISOString(),
      fixtures: cache.data,
    }), { headers });
  }

  try {
    // 1. Fetch upcoming fixtures (all 7 days fire in parallel)
    const rawFixtures = await fetchFixtures();

    // Sort by date (closest first) for enrichment priority
    rawFixtures.sort((a, b) => new Date(a.fixture.date) - new Date(b.fixture.date));

    // 2. Enrich closest fixtures with predictions + odds
    const enrichLimit = Math.min(6, rawFixtures.length);
    const toEnrich = rawFixtures.slice(0, enrichLimit);
    const basicOnly = rawFixtures.slice(enrichLimit);

    // ═══════════════════════════════════════════════════════════════════
    // FIX #3: Enrich ALL fixtures in PARALLEL (was serial for-loop)
    // Old: 6 sequential batches × ~1-2s each = 6-12s (TIMEOUT!)
    // New: all 12 calls fire at once = ~1-2s total
    // ═══════════════════════════════════════════════════════════════════
    const enrichedFixtures = await Promise.all(
      toEnrich.map(async (fixture) => {
        const fixtureId = fixture.fixture.id;
        try {
          const [prediction, oddsData] = await Promise.all([
            fetchPrediction(fixtureId),
            fetchOdds(fixtureId),
          ]);
          return transformFixture(fixture, prediction, [], oddsData);
        } catch (e) {
          return transformFixture(fixture, null, [], []);
        }
      })
    );

    // Basic fixtures (no predictions/odds — appear in picker)
    const basicFixtures = basicOnly.map(fixture => transformFixture(fixture, null, [], []));

    const allFixtures = [...enrichedFixtures, ...basicFixtures];

    // NEVER cache empty results
    if (allFixtures.length > 0) {
      cache = { data: allFixtures, timestamp: now };
    }

    return new Response(JSON.stringify({
      success: true,
      cached: false,
      lastUpdated: new Date(now).toISOString(),
      fixtures: allFixtures,
      debug: {
        rawCount: rawFixtures.length,
        enrichedCount: enrichedFixtures.length,
        basicCount: basicFixtures.length,
        datesFetched: Array.from({ length: 7 }, (_, i) => getDateStr(i)),
      },
    }), { headers });

  } catch (error) {
    console.error("get-data top-level error:", error);

    // If API fails but we have stale cache, serve it
    if (cache.data) {
      return new Response(JSON.stringify({
        success: true,
        cached: true,
        stale: true,
        lastUpdated: new Date(cache.timestamp).toISOString(),
        fixtures: cache.data,
      }), { headers });
    }

    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), { status: 500, headers });
  }
};

export const config = {
  path: "/api/get-data",
};
