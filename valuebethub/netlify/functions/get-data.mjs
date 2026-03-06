// netlify/functions/get-data.mjs
// Fetches real match data from API-Football, transforms it for our app.
// Cached at Netlify's CDN edge for 6 hours to save API requests.

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

// Get today's date in API format
function getDateStr(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split("T")[0];
}

// Fetch fixtures — hybrid approach: date-based (fewer API calls) + wide net
// Uses 7 API calls (one per day) instead of 19+ (one per league)
async function fetchFixtures() {
  const today = getDateStr(0);
  const endDate = getDateStr(6);
  
  // Fetch all fixtures for next 7 days in one call using date range
  // This is much more API-efficient than per-league fetching
  const allFixtures = [];
  
  // Fetch day by day (7 calls total — safe for rate limits)
  for (let i = 0; i < 7; i++) {
    try {
      const dayFixtures = await apiFetch(`/fixtures?date=${getDateStr(i)}`);
      allFixtures.push(...dayFixtures);
    } catch (e) {
      console.error(`Failed to fetch day ${i}:`, e.message);
    }
    // Small delay between calls to respect rate limits
    if (i < 6) await new Promise(r => setTimeout(r, 200));
  }

  // Filter to our supported leagues + only scheduled/not started
  const supported = allFixtures.filter(f => {
    const leagueId = f.league?.id;
    const status = f.fixture?.status?.short;
    return LEAGUE_IDS[leagueId] && ["NS", "TBD", "PST"].includes(status);
  });

  // Remove duplicates
  const seen = new Set();
  return supported.filter(f => {
    const id = f.fixture?.id;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

// Fetch predictions for a fixture (includes form, H2H, comparison)
async function fetchPrediction(fixtureId) {
  try {
    const data = await apiFetch(`/predictions?fixture=${fixtureId}`);
    return data[0] || null;
  } catch {
    return null;
  }
}

// Fetch injuries for a fixture
async function fetchInjuries(fixtureId) {
  try {
    return await apiFetch(`/injuries?fixture=${fixtureId}`);
  } catch {
    return [];
  }
}

// Fetch odds for a fixture
async function fetchOdds(fixtureId) {
  try {
    const data = await apiFetch(`/odds?fixture=${fixtureId}`);
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

  // Parse home/away records from fixtures data
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

        // Map bookie market names to our market names
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
      importance: "starter", // API doesn't always give this
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

    // Prediction data
    prediction: {
      homeWinPct: predHome,
      drawPct: predDraw,
      awayWinPct: predAway,
      advice: prediction?.predictions?.advice || "",
      winner: prediction?.predictions?.winner?.name || "",
    },

    // Form
    homeForm,
    awayForm,

    // H2H
    h2h: {
      last5: h2hMatches,
      homeWins: h2hHomeWins,
      draws: h2hDraws,
      awayWins: h2hAwayWins,
      avgGoals: h2hAvgGoals,
    },

    // Records
    homeRecord,
    awayRecord,

    // Comparison (from API predictions)
    comparison: comp,

    // Injuries
    homeInjuries,
    awayInjuries,

    // Real bookmaker odds
    odds: parsedOdds,

    // Team league positions
    homeLeaguePos: homeLStats.fixtures?.played?.total
      ? Math.max(1, Math.round(20 * (1 - (homeLStats.fixtures?.wins?.total || 0) / (homeLStats.fixtures?.played?.total || 1))))
      : null,
    awayLeaguePos: awayLStats.fixtures?.played?.total
      ? Math.max(1, Math.round(20 * (1 - (awayLStats.fixtures?.wins?.total || 0) / (awayLStats.fixtures?.played?.total || 1))))
      : null,

    // xG approximation from goals data
    homeXGFor: homeLStats.goals?.for?.average?.total ? parseFloat(homeLStats.goals.for.average.total) : 1.3,
    homeXGAgainst: homeLStats.goals?.against?.average?.total ? parseFloat(homeLStats.goals.against.average.total) : 1.1,
    awayXGFor: awayLStats.goals?.for?.average?.total ? parseFloat(awayLStats.goals.for.average.total) : 1.2,
    awayXGAgainst: awayLStats.goals?.against?.average?.total ? parseFloat(awayLStats.goals.against.average.total) : 1.2,
  };
}

export default async (req) => {
  // CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
    // Cache at Netlify CDN edge for 12 hours
    "Cache-Control": "public, s-maxage=43200, max-age=3600",
    "Netlify-CDN-Cache-Control": "public, s-maxage=43200",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  // Check in-memory cache
  const now = Date.now();
  if (cache.data && now - cache.timestamp < CACHE_TTL) {
    return new Response(JSON.stringify({
      success: true,
      cached: true,
      lastUpdated: new Date(cache.timestamp).toISOString(),
      fixtures: cache.data,
    }), { headers });
  }

  try {
    // 1. Fetch upcoming fixtures from all supported leagues
    const rawFixtures = await fetchFixtures();
    // API budget: 7 calls (one per day)

    // Sort by date (closest first) for enrichment priority
    rawFixtures.sort((a, b) => new Date(a.fixture.date) - new Date(b.fixture.date));

    // 2. Enrich closest fixtures with full data (predictions, injuries, odds)
    // Sequential with delays to respect rate limits (10 req/min on free tier)
    // Each fixture needs 3 calls. We enrich up to 6 fixtures = 18 calls.
    // Total: 7 + 18 = 25 calls per refresh. Safe for free tier.
    const enrichLimit = Math.min(6, rawFixtures.length);
    const toEnrich = rawFixtures.slice(0, enrichLimit);
    const basicOnly = rawFixtures.slice(enrichLimit);

    const enrichedFixtures = [];
    for (const fixture of toEnrich) {
      const fixtureId = fixture.fixture.id;
      try {
        const [prediction, injuriesData, oddsData] = await Promise.all([
          fetchPrediction(fixtureId),
          fetchInjuries(fixtureId),
          fetchOdds(fixtureId),
        ]);
        enrichedFixtures.push(transformFixture(fixture, prediction, injuriesData, oddsData));
      } catch (e) {
        // If enrichment fails, add with basic data
        enrichedFixtures.push(transformFixture(fixture, null, [], []));
      }
      // Small delay between fixture batches to respect rate limits
      await new Promise(r => setTimeout(r, 300));
    }

    // Basic fixtures (no predictions/odds — appear in picker but can't generate bets)
    const basicFixtures = basicOnly.map(fixture => transformFixture(fixture, null, [], []));

    const allFixtures = [...enrichedFixtures, ...basicFixtures];

    // Update cache
    cache = { data: allFixtures, timestamp: now };

    return new Response(JSON.stringify({
      success: true,
      cached: false,
      lastUpdated: new Date(now).toISOString(),
      fixtures: allFixtures,
    }), { headers });

  } catch (error) {
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
