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
  "COMBO_1X2_OU": {
    label: "1X2 + Over/Under",
    icon: "🔗",
    markets: ["Home Win & Over 2.5", "Home Win & Under 2.5", "Draw & Over 2.5", "Draw & Under 2.5", "Away Win & Over 2.5", "Away Win & Under 2.5"],
  },
  "COMBO_1X2_BTTS": {
    label: "1X2 + BTTS",
    icon: "🔗",
    markets: ["Home Win & BTTS Yes", "Home Win & BTTS No", "Draw & BTTS Yes", "Draw & BTTS No", "Away Win & BTTS Yes", "Away Win & BTTS No"],
  },
  "ASIAN_HANDICAP": {
    label: "Asian Handicap",
    icon: "📊",
    markets: ["AH Home -0.5", "AH Away +0.5", "AH Home -1", "AH Away +1", "AH Home -1.5", "AH Away +1.5", "AH Home -2", "AH Away +2", "AH Home +0.5", "AH Away -0.5", "AH Home +1", "AH Away -1", "AH Home +1.5", "AH Away -1.5"],
  },
  "DRAW_NO_BET": {
    label: "Draw No Bet",
    icon: "🚫",
    markets: ["Draw No Bet Home", "Draw No Bet Away"],
  },
  "CORNERS": {
    label: "Corners",
    icon: "📐",
    markets: ["Over 8.5 Corners", "Under 8.5 Corners", "Over 10.5 Corners", "Under 10.5 Corners"],
  },
};

// ─── MARKET DISPLAY NAMES ───────────────────────────────────────────
// Converts internal market keys to clean, user-friendly labels
export function marketDisplayName(market) {
  const map = {
    // 1X2
    "Home Win": "Home Win",
    "Away Win": "Away Win",
    "Draw": "Draw",
    // Over/Under
    "Over 1.5": "Over 1.5 Goals",
    "Under 1.5": "Under 1.5 Goals",
    "Over 2.5": "Over 2.5 Goals",
    "Under 2.5": "Under 2.5 Goals",
    "Over 3.5": "Over 3.5 Goals",
    "Under 3.5": "Under 3.5 Goals",
    // BTTS
    "BTTS Yes": "Both Teams to Score",
    "BTTS No": "Both Teams Not to Score",
    // Double Chance
    "1X (Home or Draw)": "Home or Draw",
    "X2 (Draw or Away)": "Draw or Away",
    "12 (Home or Away)": "Home or Away (No Draw)",
    // Combos
    "Home Win & Over 2.5": "Home Win & Over 2.5 Goals",
    "Home Win & Under 2.5": "Home Win & Under 2.5 Goals",
    "Draw & Over 2.5": "Draw & Over 2.5 Goals",
    "Draw & Under 2.5": "Draw & Under 2.5 Goals",
    "Away Win & Over 2.5": "Away Win & Over 2.5 Goals",
    "Away Win & Under 2.5": "Away Win & Under 2.5 Goals",
    "Home Win & BTTS Yes": "Home Win & Both to Score",
    "Home Win & BTTS No": "Home Win & Clean Sheet",
    "Draw & BTTS Yes": "Draw & Both to Score",
    "Draw & BTTS No": "Draw & Clean Sheet",
    "Away Win & BTTS Yes": "Away Win & Both to Score",
    "Away Win & BTTS No": "Away Win & Clean Sheet",
    // Asian Handicap
    "AH Home -0.5": "Home -0.5 Handicap",
    "AH Home -1": "Home -1 Handicap",
    "AH Home -1.5": "Home -1.5 Handicap",
    "AH Home -2": "Home -2 Handicap",
    "AH Home +0.5": "Home +0.5 Handicap",
    "AH Home +1": "Home +1 Handicap",
    "AH Home +1.5": "Home +1.5 Handicap",
    "AH Away -0.5": "Away -0.5 Handicap",
    "AH Away -1": "Away -1 Handicap",
    "AH Away -1.5": "Away -1.5 Handicap",
    "AH Away +0.5": "Away +0.5 Handicap",
    "AH Away +1": "Away +1 Handicap",
    "AH Away +1.5": "Away +1.5 Handicap",
    "AH Away +2": "Away +2 Handicap",
    // Draw No Bet
    "Draw No Bet Home": "Home (Draw No Bet)",
    "Draw No Bet Away": "Away (Draw No Bet)",
    // Corners
    "Over 8.5 Corners": "Over 8.5 Corners",
    "Under 8.5 Corners": "Under 8.5 Corners",
    "Over 10.5 Corners": "Over 10.5 Corners",
    "Under 10.5 Corners": "Under 10.5 Corners",
  };
  return map[market] || market;
}

// ─── REALISTIC AI PROBABILITY ENGINE ─────────────────────────────────
// 
// KEY PRINCIPLE: Bookmaker odds are the anchor. They have teams of analysts
// and billions in data. Our AI looks for small edges (1-5%) where our data
// suggests the bookmaker might be slightly off — NOT 20-30% disagreements.
//
// The AI adjusts the bookmaker's implied probability based on:
// 1. Recent form (are they on a streak the odds haven't fully priced in?)
// 2. Goals data (xG, recent scoring patterns)
// 3. H2H history (does the matchup historically favor one side?)
// 4. Injuries (key players missing can shift things)
//
// Maximum adjustment: ±5% from bookmaker implied probability
// + ±3% from league strength in European comps
// + ±2.5% from club power rating in European comps
// + ±5% from European campaign performance (giant kills override league penalties)
// Combined max in European matches: ~±15% for extreme cases
// For same-league domestic matches: max ±5% (no league/power/campaign adjustments)
// The campaign boost is CRITICAL: Bodø/Glimt beating Inter should override
// the "Norwegian league penalty" — judge teams by what they've DONE, not where they're from.

function calcFormStrength(form) {
  // Convert form array ["W","D","L",...] to a 0-1 score, weighting recent matches more
  if (!form || !form.length) return 0.5;
  const pts = { W: 1, D: 0.4, L: 0 };
  const weights = [1.5, 1.3, 1.1, 0.9, 0.7];
  let score = 0, maxScore = 0;
  form.forEach((r, i) => {
    const w = weights[i] || 0.5;
    score += (pts[r] || 0.3) * w;
    maxScore += w;
  });
  return maxScore > 0 ? score / maxScore : 0.5;
}

function calcRecentGoalsPerMatch(fixture) {
  // Use actual goals-per-game averages from the API data
  const homeGF = fixture.homeXGFor || 1.3;
  const awayGF = fixture.awayXGFor || 1.1;
  const homeGA = fixture.homeXGAgainst || 1.1;
  const awayGA = fixture.awayXGAgainst || 1.2;
  
  // Expected total goals = average of (home attack + away attack) and (home defense concedes + away defense concedes)
  const attackBased = homeGF + awayGF;
  const defenseBased = homeGA + awayGA;
  return (attackBased + defenseBased) / 2;
}

function calcMarketProb(fixture, market, bookmakerOdds) {
  // Start with bookmaker's implied probability as our anchor
  const impliedProb = bookmakerOdds ? 1 / bookmakerOdds : 0.5;
  
  // Remove bookmaker margin (~5%) to get fairer base probability
  // Bookmakers overround means implied probs sum to ~105%, so each is ~2.5% too high
  const fairProb = Math.min(0.95, Math.max(0.05, impliedProb * 0.96));
  
  // Calculate our data-driven adjustment (will be small: -0.05 to +0.05)
  let adjustment = 0;
  
  const homeForm = calcFormStrength(fixture.homeForm);
  const awayForm = calcFormStrength(fixture.awayForm);
  const formDiff = homeForm - awayForm; // positive = home in better form
  
  const expectedGoals = calcRecentGoalsPerMatch(fixture);
  const h2hAvgGoals = fixture.h2h?.avgGoals || 2.5;
  
  // H2H factor
  const h2h = fixture.h2h || {};
  const h2hTotal = (h2h.homeWins || 0) + (h2h.draws || 0) + (h2h.awayWins || 0);
  const h2hHomeDominance = h2hTotal > 0 ? ((h2h.homeWins || 0) - (h2h.awayWins || 0)) / h2hTotal : 0;
  
  // Injury impact (rough: each injury = small penalty)
  const homeInjCount = (fixture.homeInjuries || []).length;
  const awayInjCount = (fixture.awayInjuries || []).length;
  const injuryDiff = (awayInjCount - homeInjCount) * 0.008; // more away injuries = slight home boost
  
  // League strength (European comps only)
  // A Premier League team vs a Czech league team = significant advantage
  // Max impact: ±3% adjustment (0.30 coefficient gap * 0.10 = 0.03)
  const leagueStrengthDiff = fixture._leagueStrengthDiff || 0;
  const leagueAdj = leagueStrengthDiff * 0.10; // coefficient diff → probability adjustment

  // Club Power Rating (European comps only)
  // Captures squad value + European pedigree + continental experience
  // Max impact: ±2.5% (50-point gap * 0.0005 = 0.025)
  // Real Madrid (98) vs Bodø/Glimt (42) = 56 * 0.0005 = +2.8% boost for Real
  // Real Madrid (98) vs Inter (84) = 14 * 0.0005 = +0.7% — small but meaningful
  const powerRatingDiff = fixture._powerRatingDiff || 0;
  const powerAdj = powerRatingDiff * 0.0005;

  // European Campaign Performance (European comps only)
  // If Bodø/Glimt beat Inter and Man City, they get boosted despite low Power rating
  // This COUNTERACTS the league strength and power rating penalties for overperformers
  // Max impact: ±5% (capped in analyzeEuropeanCampaign)
  const campaignBoostDiff = fixture._campaignBoostDiff || 0;
  const campaignAdj = campaignBoostDiff; // Already in 0-0.05 range
  
  switch (market) {
    case "Home Win":
      // Better home form, H2H dominance, fewer injuries, stronger league, higher power, AND better European campaign
      adjustment = formDiff * 0.04 + h2hHomeDominance * 0.02 + injuryDiff + leagueAdj + powerAdj + campaignAdj;
      break;
    case "Draw":
      // Draws more likely when teams are close in form AND league strength
      adjustment = -Math.abs(formDiff) * 0.02 - Math.abs(leagueAdj) * 0.5 - Math.abs(powerAdj) * 0.4 - Math.abs(campaignAdj) * 0.3;
      break;
    case "Away Win":
      adjustment = -formDiff * 0.04 - h2hHomeDominance * 0.02 - injuryDiff - leagueAdj - powerAdj - campaignAdj;
      break;
    case "Over 1.5":
    case "Over 2.5":
    case "Over 3.5":
      // High-scoring teams/H2H = slight boost to overs
      adjustment = (expectedGoals - 2.5) * 0.015 + (h2hAvgGoals - 2.5) * 0.008;
      break;
    case "Under 1.5":
    case "Under 2.5":
    case "Under 3.5":
      // Low-scoring teams/H2H = slight boost to unders
      adjustment = -(expectedGoals - 2.5) * 0.015 - (h2hAvgGoals - 2.5) * 0.008;
      break;
    case "BTTS Yes":
      // Both teams scoring regularly = slight boost
      const bothScoring = Math.min(fixture.homeXGFor || 1, fixture.awayXGFor || 1);
      adjustment = (bothScoring - 1.0) * 0.02;
      break;
    case "BTTS No":
      const lowestScorer = Math.min(fixture.homeXGFor || 1, fixture.awayXGFor || 1);
      adjustment = -(lowestScorer - 1.0) * 0.02;
      break;
    case "1X (Home or Draw)":
      adjustment = formDiff * 0.02 + h2hHomeDominance * 0.01 + leagueAdj * 0.5 + powerAdj * 0.4 + campaignAdj * 0.3;
      break;
    case "X2 (Draw or Away)":
      adjustment = -formDiff * 0.02 - h2hHomeDominance * 0.01 - leagueAdj * 0.5 - powerAdj * 0.4 - campaignAdj * 0.3;
      break;
    case "12 (Home or Away)":
      adjustment = Math.abs(formDiff) * 0.01; // bigger form gap = less likely draw
      break;
    case "Over 8.5 Corners":
    case "Over 10.5 Corners":
      adjustment = (expectedGoals - 2.5) * 0.01;
      break;
    case "Under 8.5 Corners":
    case "Under 10.5 Corners":
      adjustment = -(expectedGoals - 2.5) * 0.01;
      break;
    // ─── COMBO: 1X2 + Over/Under 2.5 ────────────────────────
    case "Home Win & Over 2.5":
      adjustment = formDiff * 0.03 + (expectedGoals - 2.5) * 0.012 + h2hHomeDominance * 0.015 + leagueAdj * 0.7 + powerAdj * 0.5 + campaignAdj * 0.4;
      break;
    case "Home Win & Under 2.5":
      adjustment = formDiff * 0.03 - (expectedGoals - 2.5) * 0.012 + h2hHomeDominance * 0.01 + leagueAdj * 0.7 + powerAdj * 0.5 + campaignAdj * 0.4;
      break;
    case "Draw & Over 2.5":
      adjustment = -Math.abs(formDiff) * 0.015 + (expectedGoals - 2.5) * 0.012;
      break;
    case "Draw & Under 2.5":
      adjustment = -Math.abs(formDiff) * 0.015 - (expectedGoals - 2.5) * 0.012;
      break;
    case "Away Win & Over 2.5":
      adjustment = -formDiff * 0.03 + (expectedGoals - 2.5) * 0.012 - h2hHomeDominance * 0.015 - leagueAdj * 0.7 - powerAdj * 0.5 - campaignAdj * 0.4;
      break;
    case "Away Win & Under 2.5":
      adjustment = -formDiff * 0.03 - (expectedGoals - 2.5) * 0.012 - h2hHomeDominance * 0.01 - leagueAdj * 0.7 - powerAdj * 0.5 - campaignAdj * 0.4;
      break;
    // ─── COMBO: 1X2 + BTTS ──────────────────────────────────
    case "Home Win & BTTS Yes": {
      const bs1 = Math.min(fixture.homeXGFor || 1, fixture.awayXGFor || 1);
      adjustment = formDiff * 0.03 + (bs1 - 1.0) * 0.015 + h2hHomeDominance * 0.01;
      break;
    }
    case "Home Win & BTTS No": {
      const ls1 = Math.min(fixture.homeXGFor || 1, fixture.awayXGFor || 1);
      adjustment = formDiff * 0.03 - (ls1 - 1.0) * 0.015 + h2hHomeDominance * 0.01;
      break;
    }
    case "Draw & BTTS Yes": {
      const bs2 = Math.min(fixture.homeXGFor || 1, fixture.awayXGFor || 1);
      adjustment = -Math.abs(formDiff) * 0.015 + (bs2 - 1.0) * 0.015;
      break;
    }
    case "Draw & BTTS No":
      adjustment = -Math.abs(formDiff) * 0.015;
      break;
    case "Away Win & BTTS Yes": {
      const bs3 = Math.min(fixture.homeXGFor || 1, fixture.awayXGFor || 1);
      adjustment = -formDiff * 0.03 + (bs3 - 1.0) * 0.015 - h2hHomeDominance * 0.01;
      break;
    }
    case "Away Win & BTTS No": {
      const ls3 = Math.min(fixture.homeXGFor || 1, fixture.awayXGFor || 1);
      adjustment = -formDiff * 0.03 - (ls3 - 1.0) * 0.015 - h2hHomeDominance * 0.01;
      break;
    }
    // ─── ASIAN HANDICAP ─────────────────────────────────────
    case "AH Home -0.5":   // same as Home Win effectively
    case "AH Away +0.5":
      adjustment = formDiff * 0.04 + h2hHomeDominance * 0.02 + injuryDiff + leagueAdj + powerAdj + campaignAdj;
      break;
    case "AH Home -1":
    case "AH Away +1":
      adjustment = formDiff * 0.035 + h2hHomeDominance * 0.02 + injuryDiff + leagueAdj * 0.9 + powerAdj * 0.7 + campaignAdj * 0.6;
      break;
    case "AH Home -1.5":
    case "AH Away +1.5":
      adjustment = formDiff * 0.03 + h2hHomeDominance * 0.015 + injuryDiff + leagueAdj * 0.8 + powerAdj * 0.6 + campaignAdj * 0.5;
      break;
    case "AH Home -2":
    case "AH Away +2":
      adjustment = formDiff * 0.025 + h2hHomeDominance * 0.01 + injuryDiff + leagueAdj * 0.7 + powerAdj * 0.5 + campaignAdj * 0.4;
      break;
    case "AH Home +0.5":  // home or draw effectively
    case "AH Away -0.5":
      adjustment = formDiff * 0.02 + h2hHomeDominance * 0.01 + leagueAdj * 0.5 + powerAdj * 0.4 + campaignAdj * 0.3;
      break;
    case "AH Home +1":
    case "AH Away -1":
      adjustment = -formDiff * 0.035 - h2hHomeDominance * 0.02 - injuryDiff - leagueAdj * 0.9 - powerAdj * 0.7 - campaignAdj * 0.6;
      break;
    case "AH Home +1.5":
    case "AH Away -1.5":
      adjustment = -formDiff * 0.03 - h2hHomeDominance * 0.015 - injuryDiff - leagueAdj * 0.8 - powerAdj * 0.6 - campaignAdj * 0.5;
      break;
    // ─── DRAW NO BET ────────────────────────────────────────
    case "Draw No Bet Home":
      adjustment = formDiff * 0.03 + h2hHomeDominance * 0.015 + injuryDiff + leagueAdj * 0.8 + powerAdj * 0.6 + campaignAdj * 0.5;
      break;
    case "Draw No Bet Away":
      adjustment = -formDiff * 0.03 - h2hHomeDominance * 0.015 - injuryDiff - leagueAdj * 0.8 - powerAdj * 0.6 - campaignAdj * 0.5;
      break;
    default:
      adjustment = 0;
  }
  
  // CRITICAL: Cap adjustment to ±5% — we're not smarter than the entire market
  adjustment = Math.max(-0.05, Math.min(0.05, adjustment));
  
  // Final probability = fair bookmaker prob + our small adjustment
  const finalProb = Math.max(0.03, Math.min(0.97, fairProb + adjustment));
  
  return finalProb;
}

// ═══════════════════════════════════════════════════════════════════════
// CONTEXT INSIGHTS ENGINE
// Generates smart observations about each fixture by cross-referencing
// all available data. These surface as "AI Reasoning" in the analysis.
// ═══════════════════════════════════════════════════════════════════════

const EUROPEAN_COMPS = ["Champions League", "Europa League", "Conference League"];

// ─── LEAGUE STRENGTH TIERS ──────────────────────────────────────────
// Used in European competitions to adjust predictions based on domestic league quality.
// Tier 1 = elite leagues (top 5), Tier 5 = smaller leagues. 
// A 1st-place team in Serie A is far stronger than a 1st-place team in the Swedish league.
const LEAGUE_STRENGTH = {
  // Tier 1 — Elite (coefficient ~1.0)
  "Premier League": { tier: 1, coefficient: 1.00, label: "Elite" },
  "La Liga":        { tier: 1, coefficient: 0.98, label: "Elite" },
  "Serie A":        { tier: 1, coefficient: 0.95, label: "Elite" },
  "Bundesliga":     { tier: 1, coefficient: 0.93, label: "Elite" },
  "Ligue 1":        { tier: 1, coefficient: 0.88, label: "Elite" },
  // Tier 2 — Strong
  "Eredivisie":     { tier: 2, coefficient: 0.75, label: "Strong" },
  "Primeira Liga":  { tier: 2, coefficient: 0.78, label: "Strong" },
  "Super Lig":      { tier: 2, coefficient: 0.70, label: "Strong" },
  "Jupiler Pro League": { tier: 2, coefficient: 0.68, label: "Strong" },
  // Tier 3+ — default for unknown leagues
};
const DEFAULT_LEAGUE = { tier: 3, coefficient: 0.55, label: "Mid-tier" };

// ─── CLUB POWER RATINGS ─────────────────────────────────────────────
// Combined metric: squad market value + European pedigree + recent form in continental comps.
// Scale: 0-100. Updated once per season (summer 2025 values).
//
// Formula concept:
//   40% squad value (normalized 0-100)
//   35% European pedigree (CL/EL titles, semi-final appearances last 10 years)
//   25% recent European performance (last 2-3 campaigns)
//
// This is the tiebreaker when league strength, form, and H2H can't split teams.
// Real Madrid (98) vs Inter (84) in a "50/50" on paper → slight Madrid edge.
// Inter (84) vs Bodø/Glimt (35) → significant gap even if Bodø have good form.

const CLUB_POWER_RATINGS = {
  // ═══ TIER 1: European Elite (90-100) ═══════════════════════════════
  // Multiple CL titles or consistent finalists, €800M+ squads
  "Real Madrid":           { rating: 98, value: "€1.2B", pedigree: "15× CL, 6 in last 12 years", tier: "European Elite" },
  "Manchester City":       { rating: 96, value: "€1.3B", pedigree: "1× CL, 4 consecutive semis+", tier: "European Elite" },
  "Bayern München":        { rating: 95, value: "€900M", pedigree: "6× CL, perennial semis", tier: "European Elite" },
  "Liverpool":             { rating: 93, value: "€950M", pedigree: "6× CL, 2× recent finals", tier: "European Elite" },
  "Barcelona":             { rating: 92, value: "€1.0B", pedigree: "5× CL, rebuilding but DNA intact", tier: "European Elite" },
  "Paris Saint Germain":   { rating: 91, value: "€1.0B", pedigree: "1× CL final, consistent QFs", tier: "European Elite" },
  "Chelsea":               { rating: 90, value: "€1.1B", pedigree: "2× CL (2012, 2021)", tier: "European Elite" },

  // ═══ TIER 2: Continental Heavyweights (80-89) ══════════════════════
  // CL semi-finalists, strong squads, proven European pedigree
  "Arsenal":               { rating: 88, value: "€1.0B", pedigree: "Never won CL, recent semi runs", tier: "Continental Heavyweight" },
  "Inter":                 { rating: 84, value: "€700M", pedigree: "3× CL (last 2010), 2023 final", tier: "Continental Heavyweight" },
  "Atletico Madrid":       { rating: 85, value: "€750M", pedigree: "2× CL final (2014, 2016)", tier: "Continental Heavyweight" },
  "Juventus":              { rating: 83, value: "€650M", pedigree: "2× CL (last 1996), 2× recent finals", tier: "Continental Heavyweight" },
  "Borussia Dortmund":     { rating: 82, value: "€600M", pedigree: "1× CL (1997), 2024 final", tier: "Continental Heavyweight" },
  "AC Milan":              { rating: 82, value: "€550M", pedigree: "7× CL (last 2007), 2023 semi", tier: "Continental Heavyweight" },
  "Tottenham":             { rating: 81, value: "€800M", pedigree: "1× CL final (2019)", tier: "Continental Heavyweight" },
  "Napoli":                { rating: 81, value: "€650M", pedigree: "Limited CL history, 2023 QF run", tier: "Continental Heavyweight" },
  "Bayer Leverkusen":      { rating: 80, value: "€600M", pedigree: "2024 EL final, rising force", tier: "Continental Heavyweight" },

  // ═══ TIER 3: Established European Clubs (68-79) ════════════════════
  // Regular European group stage, occasional knockout runs
  "Benfica":               { rating: 78, value: "€450M", pedigree: "2× CL, consistent R16/QF", tier: "Established European" },
  "FC Porto":              { rating: 76, value: "€350M", pedigree: "2× CL (last 2004), always qualify", tier: "Established European" },
  "Newcastle":             { rating: 76, value: "€700M", pedigree: "Limited Euro history, new investment", tier: "Established European" },
  "Aston Villa":           { rating: 74, value: "€650M", pedigree: "1× CL (1982), European return", tier: "Established European" },
  "AS Roma":               { rating: 73, value: "€450M", pedigree: "2022 Conference, 2023 EL final", tier: "Established European" },
  "Atalanta":              { rating: 73, value: "€500M", pedigree: "2024 EL winner, CL debutant", tier: "Established European" },
  "Sporting CP":           { rating: 72, value: "€350M", pedigree: "CL regulars, talent factory", tier: "Established European" },
  "Ajax":                  { rating: 72, value: "€300M", pedigree: "4× CL (last 1995), 2019 semi", tier: "Established European" },
  "RB Leipzig":            { rating: 72, value: "€550M", pedigree: "2020 CL semi", tier: "Established European" },
  "Villarreal":            { rating: 71, value: "€400M", pedigree: "2021 EL winner, 2022 CL semi", tier: "Established European" },
  "Fiorentina":            { rating: 70, value: "€350M", pedigree: "2× Conference League finals", tier: "Established European" },
  "Eintracht Frankfurt":   { rating: 70, value: "€350M", pedigree: "2022 EL winner", tier: "Established European" },
  "Nottingham Forest":     { rating: 69, value: "€400M", pedigree: "2× CL (1979-80), long absence", tier: "Established European" },
  "VfB Stuttgart":         { rating: 68, value: "€350M", pedigree: "Limited modern Euro pedigree", tier: "Established European" },
  "Monaco":                { rating: 68, value: "€350M", pedigree: "2017 CL semi, inconsistent", tier: "Established European" },
  "Marseille":             { rating: 68, value: "€300M", pedigree: "1× CL (1993), EL regulars", tier: "Established European" },
  "PSV Eindhoven":         { rating: 68, value: "€280M", pedigree: "1× CL (1988), consistent qualifiers", tier: "Established European" },
  "Club Brugge KV":        { rating: 66, value: "€200M", pedigree: "CL group stage regulars", tier: "Established European" },
  "SC Braga":              { rating: 65, value: "€180M", pedigree: "EL/Conference regulars", tier: "Established European" },
  "Lyon":                  { rating: 68, value: "€300M", pedigree: "2020 CL semi, strong history", tier: "Established European" },
  "Crystal Palace":        { rating: 65, value: "€400M", pedigree: "Minimal European history", tier: "Established European" },
  "Lille":                 { rating: 67, value: "€350M", pedigree: "CL group stage, solid squad", tier: "Established European" },
  "Bologna":               { rating: 64, value: "€300M", pedigree: "CL debut 2024", tier: "Established European" },
  "Real Betis":            { rating: 66, value: "€350M", pedigree: "EL regulars", tier: "Established European" },
  "SC Freiburg":           { rating: 63, value: "€280M", pedigree: "EL debut recent", tier: "Established European" },
  "Genk":                  { rating: 60, value: "€180M", pedigree: "CL group stage occasionally", tier: "Established European" },

  // ═══ TIER 4: European Regulars (50-67) ═════════════════════════════
  // Qualify through domestic league, limited knockout experience
  "Galatasaray":           { rating: 62, value: "€250M", pedigree: "2000 UEFA Cup, CL groups", tier: "European Regular" },
  "Fenerbahçe":            { rating: 58, value: "€200M", pedigree: "CL/EL group stage", tier: "European Regular" },
  "AZ Alkmaar":            { rating: 58, value: "€150M", pedigree: "Conference League competitor", tier: "European Regular" },
  "Feyenoord":             { rating: 64, value: "€200M", pedigree: "2002 UEFA Cup, recent CL return", tier: "European Regular" },
  "Panathinaikos":         { rating: 50, value: "€80M", pedigree: "1971 CL final, limited modern", tier: "European Regular" },
  "Ferencvarosi TC":       { rating: 48, value: "€60M", pedigree: "EL/Conference group stage", tier: "European Regular" },
  "Shakhtar Donetsk":      { rating: 55, value: "€120M", pedigree: "2009 UEFA Cup, CL R16 runs", tier: "European Regular" },
  "Rayo Vallecano":        { rating: 52, value: "€150M", pedigree: "Rare European appearances", tier: "European Regular" },
  "FC Midtjylland":        { rating: 45, value: "€80M", pedigree: "CL debut recent", tier: "European Regular" },
  "Samsunspor":            { rating: 40, value: "€50M", pedigree: "Limited European history", tier: "European Regular" },
  "Lech Poznan":           { rating: 44, value: "€50M", pedigree: "Conference League regulars", tier: "European Regular" },
  "AEK Athens FC":         { rating: 48, value: "€60M", pedigree: "1971 UEFA Cup finalist", tier: "European Regular" },
  "AEK Larnaca":           { rating: 35, value: "€25M", pedigree: "Conference League qualifier", tier: "European Regular" },
  "Celta Vigo":            { rating: 58, value: "€200M", pedigree: "EL semi (2017)", tier: "European Regular" },
  "Raków Częstochowa":     { rating: 38, value: "€35M", pedigree: "Conference League debut", tier: "European Regular" },
  "FSV Mainz 05":          { rating: 55, value: "€200M", pedigree: "EL group stage", tier: "European Regular" },
  "Sparta Praha":          { rating: 48, value: "€70M", pedigree: "CL group stage 2024", tier: "European Regular" },
  "HNK Rijeka":            { rating: 38, value: "€30M", pedigree: "Conference League qualifier", tier: "European Regular" },
  "Strasbourg":            { rating: 52, value: "€150M", pedigree: "Limited European history", tier: "European Regular" },
  "Sigma Olomouc":         { rating: 35, value: "€25M", pedigree: "Conference League qualifier", tier: "European Regular" },
  "Celje":                 { rating: 30, value: "€15M", pedigree: "Conference League debut", tier: "European Regular" },
  "Bodo/Glimt":            { rating: 42, value: "€40M", pedigree: "Conference League semi 2022", tier: "European Regular" },

  // ═══ DOMESTIC-ONLY CLUBS (no rating — won't appear in European comps) ═══
  // These use league strength only, no power rating needed
};

const DEFAULT_POWER_RATING = { rating: 45, value: "Unknown", pedigree: "Limited European history", tier: "Unrated" };

function getClubPowerRating(teamName) {
  // Try exact match first
  if (CLUB_POWER_RATINGS[teamName]) return CLUB_POWER_RATINGS[teamName];
  // Try partial match (API sometimes uses slightly different names)
  const key = Object.keys(CLUB_POWER_RATINGS).find(k =>
    teamName.includes(k) || k.includes(teamName)
  );
  return key ? CLUB_POWER_RATINGS[key] : DEFAULT_POWER_RATING;
}

function getLeagueStrength(leagueName) {
  return LEAGUE_STRENGTH[leagueName] || DEFAULT_LEAGUE;
}

// Get the domestic league of a team in a European competition
// by looking at their other fixtures in the dataset
function getTeamDomesticLeague(teamName, allFixtures) {
  const domesticFixture = allFixtures.find(f =>
    (f.home === teamName || f.away === teamName) &&
    !EUROPEAN_COMPS.includes(f.league)
  );
  return domesticFixture?.league || null;
}

// ─── EUROPEAN CAMPAIGN PERFORMANCE ANALYZER ─────────────────────────
// Looks at a team's results IN THIS European campaign against other teams
// in our dataset. Beating Inter Milan (Power 84) matters more than beating
// a Conference League minnow. This overrides league strength penalties
// when a "small" team has proven they can compete at the highest level.
function analyzeEuropeanCampaign(teamName, allFixtures) {
  const euroFixtures = allFixtures.filter(f =>
    EUROPEAN_COMPS.includes(f.league) &&
    (f.home === teamName || f.away === teamName)
  );

  if (euroFixtures.length === 0) return null;

  const results = [];
  let giantKills = 0;      // Wins against teams rated 80+
  let strongWins = 0;       // Wins against teams rated 65-79
  let impressiveDraws = 0;  // Draws against teams rated 80+
  let totalEuroWins = 0;
  let totalEuroMatches = euroFixtures.length;

  for (const fix of euroFixtures) {
    const isHome = fix.home === teamName;
    const opponent = isHome ? fix.away : fix.home;
    const oppPower = getClubPowerRating(opponent);
    const form = isHome ? fix.homeForm : fix.awayForm;
    const oppForm = isHome ? fix.awayForm : fix.homeForm;

    // Check H2H for actual results between these two in this competition
    const h2h = fix.h2h?.last5 || [];
    for (const match of h2h) {
      if (!match.score) continue;
      const [homeGoals, awayGoals] = match.score.split("-").map(Number);
      if (isNaN(homeGoals) || isNaN(awayGoals)) continue;

      const isTeamHome = match.home === teamName || (isHome && match.home === fix.home);
      const teamGoals = isTeamHome ? homeGoals : awayGoals;
      const oppGoals = isTeamHome ? awayGoals : homeGoals;
      const won = teamGoals > oppGoals;
      const drew = teamGoals === oppGoals;

      if (won) {
        totalEuroWins++;
        if (oppPower.rating >= 80) {
          giantKills++;
          results.push({ opponent, oppRating: oppPower.rating, result: "W", score: match.score, type: "giant_kill" });
        } else if (oppPower.rating >= 65) {
          strongWins++;
          results.push({ opponent, oppRating: oppPower.rating, result: "W", score: match.score, type: "strong_win" });
        }
      } else if (drew && oppPower.rating >= 80) {
        impressiveDraws++;
        results.push({ opponent, oppRating: oppPower.rating, result: "D", score: match.score, type: "impressive_draw" });
      }
    }
  }

  // Also check form for wins (W in form = won recent European match)
  // This catches results not in H2H data
  const teamPower = getClubPowerRating(teamName);

  // Calculate campaign boost
  // Each giant kill = +1.5%, strong win = +0.8%, impressive draw = +0.4%
  // Capped at +5% total
  const rawBoost = (giantKills * 1.5) + (strongWins * 0.8) + (impressiveDraws * 0.4);
  const campaignBoost = Math.min(5, rawBoost) / 100; // convert to 0-0.05

  return {
    teamName,
    teamPower: teamPower.rating,
    euroMatches: totalEuroMatches,
    giantKills,
    strongWins,
    impressiveDraws,
    notableResults: results.slice(0, 5), // Top 5 most impressive
    campaignBoost, // 0 to 0.05
    isOverperformer: campaignBoost > 0.015 && teamPower.rating < 70, // "Small" team doing big things
  };
}

function generateContextInsights(fixture, allFixtures) {
  const insights = [];
  const home = fixture.home;
  const away = fixture.away;
  const homePos = fixture.homeLeaguePos;
  const awayPos = fixture.awayLeaguePos;
  const homeForm = fixture.homeForm || [];
  const awayForm = fixture.awayForm || [];
  const h2h = fixture.h2h || {};
  const homeInj = fixture.homeInjuries || [];
  const awayInj = fixture.awayInjuries || [];
  const isEuropean = EUROPEAN_COMPS.includes(fixture.league);
  const fixtureDate = new Date(fixture.date);

  // ─── LEAGUE POSITION / STRENGTH GAP ──────────────────────────
  if (isEuropean) {
    // In European comps, compare DOMESTIC LEAGUE STRENGTH, not positions
    const homeDomestic = getTeamDomesticLeague(home, allFixtures);
    const awayDomestic = getTeamDomesticLeague(away, allFixtures);
    const homeLeague = homeDomestic ? getLeagueStrength(homeDomestic) : DEFAULT_LEAGUE;
    const awayLeague = awayDomestic ? getLeagueStrength(awayDomestic) : DEFAULT_LEAGUE;
    const coeffDiff = homeLeague.coefficient - awayLeague.coefficient;

    if (Math.abs(coeffDiff) >= 0.15) {
      const stronger = coeffDiff > 0 ? home : away;
      const weaker = coeffDiff > 0 ? away : home;
      const strongerLeague = coeffDiff > 0 ? (homeDomestic || "unknown") : (awayDomestic || "unknown");
      const weakerLeague = coeffDiff > 0 ? (awayDomestic || "unknown") : (homeDomestic || "unknown");
      const strongerTier = coeffDiff > 0 ? homeLeague : awayLeague;
      const weakerTier = coeffDiff > 0 ? awayLeague : homeLeague;
      insights.push({
        type: "league_strength",
        icon: "🏟️",
        impact: coeffDiff > 0 ? "positive_home" : "positive_away",
        title: `Domestic league advantage: ${stronger}`,
        detail: `${stronger} play in ${strongerLeague} (${strongerTier.label}), while ${weaker} come from ${weakerLeague} (${weakerTier.label}). In European competition, teams from stronger domestic leagues tend to have deeper squads and higher quality overall.`,
      });
    } else if (Math.abs(coeffDiff) < 0.05 && homeDomestic && awayDomestic) {
      insights.push({
        type: "league_strength",
        icon: "🏟️",
        impact: "neutral",
        title: "Similar domestic league quality",
        detail: `Both teams come from comparable domestic leagues (${homeDomestic || "N/A"} vs ${awayDomestic || "N/A"}). No significant quality gap from league strength alone.`,
      });
    }

    // Also show league positions if available but label them correctly
    if (homePos && awayPos) {
      insights.push({
        type: "league_positions",
        icon: "📊",
        impact: "neutral",
        title: "Domestic league positions",
        detail: `${home} sit ${homePos}${ordinal(homePos)} in ${homeDomestic || "their league"}, while ${away} are ${awayPos}${ordinal(awayPos)} in ${awayDomestic || "their league"}. Note: positions are in different leagues and not directly comparable.`,
      });
    }

    // ─── CLUB POWER RATING (squad value + European pedigree) ────
    const homePower = getClubPowerRating(home);
    const awayPower = getClubPowerRating(away);
    const powerGap = homePower.rating - awayPower.rating;

    if (Math.abs(powerGap) >= 15) {
      const stronger = powerGap > 0 ? home : away;
      const weaker = powerGap > 0 ? away : home;
      const strongerPwr = powerGap > 0 ? homePower : awayPower;
      const weakerPwr = powerGap > 0 ? awayPower : homePower;
      insights.push({
        type: "club_power",
        icon: "💎",
        impact: powerGap > 0 ? "positive_home" : "positive_away",
        title: `Club power advantage: ${stronger}`,
        detail: `${stronger} (Power ${strongerPwr.rating}/100, squad ~${strongerPwr.value}) significantly outrank ${weaker} (Power ${weakerPwr.rating}/100, squad ~${weakerPwr.value}). ${strongerPwr.pedigree}. Squad depth and European experience matter in continental competition.`,
      });
    } else if (Math.abs(powerGap) >= 5) {
      const slight = powerGap > 0 ? home : away;
      const slightPwr = powerGap > 0 ? homePower : awayPower;
      insights.push({
        type: "club_power",
        icon: "💎",
        impact: powerGap > 0 ? "positive_home" : "positive_away",
        title: `Slight squad quality edge: ${slight}`,
        detail: `${slight} (Power ${slightPwr.rating}/100) have a modest edge in squad value and European pedigree. ${slightPwr.pedigree}. This could be the difference in a tight match.`,
      });
    } else if (homePower.rating >= 80 && awayPower.rating >= 80) {
      insights.push({
        type: "club_power",
        icon: "💎",
        impact: "neutral",
        title: "Two European heavyweights",
        detail: `${home} (Power ${homePower.rating}) vs ${away} (Power ${awayPower.rating}) — both are elite clubs with deep squads and serious European pedigree. Expect a high-quality, tactically complex match. Small margins will decide it.`,
      });
    }

    // ─── EUROPEAN CAMPAIGN PERFORMANCE ────────────────────────
    // Has either team punched above their weight in this competition?
    const homeCampaign = analyzeEuropeanCampaign(home, allFixtures);
    const awayCampaign = analyzeEuropeanCampaign(away, allFixtures);

    if (homeCampaign?.isOverperformer) {
      const notable = homeCampaign.notableResults.slice(0, 3).map(r => `${r.result === "W" ? "beat" : "drew with"} ${r.opponent} (${r.score})`).join(", ");
      insights.push({
        type: "euro_campaign",
        icon: "🏆",
        impact: "positive_home",
        title: `${home} — European giant killers`,
        detail: `Don't let their domestic league fool you. ${home} have been exceptional in Europe this season — they ${notable}. Their European form far exceeds what their Power rating (${homeCampaign.teamPower}) would suggest. ${homeCampaign.giantKills} win(s) against teams rated 80+.`,
      });
    } else if (homeCampaign && homeCampaign.giantKills >= 1) {
      const notable = homeCampaign.notableResults.slice(0, 2).map(r => `${r.result === "W" ? "beat" : "drew with"} ${r.opponent}`).join(", ");
      insights.push({
        type: "euro_campaign",
        icon: "🏆",
        impact: "positive_home",
        title: `${home} — proven in Europe`,
        detail: `${home} have notable European scalps this season: ${notable}. They've shown they can compete at the highest level regardless of their domestic league standing.`,
      });
    }

    if (awayCampaign?.isOverperformer) {
      const notable = awayCampaign.notableResults.slice(0, 3).map(r => `${r.result === "W" ? "beat" : "drew with"} ${r.opponent} (${r.score})`).join(", ");
      insights.push({
        type: "euro_campaign",
        icon: "🏆",
        impact: "positive_away",
        title: `${away} — European giant killers`,
        detail: `Don't let their domestic league fool you. ${away} have been exceptional in Europe this season — they ${notable}. Their European form far exceeds what their Power rating (${awayCampaign.teamPower}) would suggest. ${awayCampaign.giantKills} win(s) against teams rated 80+.`,
      });
    } else if (awayCampaign && awayCampaign.giantKills >= 1) {
      const notable = awayCampaign.notableResults.slice(0, 2).map(r => `${r.result === "W" ? "beat" : "drew with"} ${r.opponent}`).join(", ");
      insights.push({
        type: "euro_campaign",
        icon: "🏆",
        impact: "positive_away",
        title: `${away} — proven in Europe`,
        detail: `${away} have notable European scalps this season: ${notable}. They've shown they can compete at the highest level regardless of their domestic league standing.`,
      });
    }

    // If BOTH teams have strong campaigns, note it
    if (homeCampaign?.giantKills >= 1 && awayCampaign?.giantKills >= 1) {
      insights.push({
        type: "euro_campaign",
        icon: "🏆",
        impact: "neutral",
        title: "Both teams battle-tested in Europe",
        detail: `Both ${home} and ${away} have beaten strong opposition this campaign. Form in this competition matters more than domestic league standings at this stage.`,
      });
    }
  } else if (homePos && awayPos) {
    // Same domestic league — positions ARE comparable
    const gap = awayPos - homePos;
    if (gap >= 10) {
      insights.push({
        type: "league_gap",
        icon: "📊",
        impact: "positive_home",
        title: "Large league position gap",
        detail: `${home} (${homePos}${ordinal(homePos)}) sit significantly higher than ${away} (${awayPos}${ordinal(awayPos)}) in the ${fixture.league}. A ${gap}-position gap suggests a clear quality difference.`,
      });
    } else if (gap <= -10) {
      insights.push({
        type: "league_gap",
        icon: "📊",
        impact: "positive_away",
        title: "Away team ranked much higher",
        detail: `${away} (${awayPos}${ordinal(awayPos)}) sit significantly higher than ${home} (${homePos}${ordinal(homePos)}) in the ${fixture.league}. Despite playing away, the quality gap is notable.`,
      });
    } else if (Math.abs(gap) <= 2) {
      insights.push({
        type: "league_gap",
        icon: "📊",
        impact: "neutral",
        title: "Closely matched teams",
        detail: `${home} (${homePos}${ordinal(homePos)}) and ${away} (${awayPos}${ordinal(awayPos)}) are very close in the ${fixture.league} standings. Expect a competitive match.`,
      });
    }
  }

  // ─── UPCOMING EUROPEAN FIXTURE (ROTATION RISK) ──────────────
  if (!isEuropean) {
    // Check if either team has a European match within 4 days
    const homeEuropean = allFixtures.find(f =>
      (f.home === home || f.away === home) &&
      EUROPEAN_COMPS.includes(f.league) &&
      f.id !== fixture.id
    );
    const awayEuropean = allFixtures.find(f =>
      (f.home === away || f.away === away) &&
      EUROPEAN_COMPS.includes(f.league) &&
      f.id !== fixture.id
    );

    if (homeEuropean) {
      insights.push({
        type: "rotation_risk",
        icon: "🔄",
        impact: "negative_home",
        title: `${home} — European fixture detected`,
        detail: `${home} also have a ${homeEuropean.league} match (${homeEuropean.home} vs ${homeEuropean.away}, ${homeEuropean.day} ${homeEuropean.time}). Key player rotation is possible as the manager may prioritise the European tie. This could weaken their domestic lineup.`,
      });
    }
    if (awayEuropean) {
      insights.push({
        type: "rotation_risk",
        icon: "🔄",
        impact: "negative_away",
        title: `${away} — European fixture detected`,
        detail: `${away} also have a ${awayEuropean.league} match (${awayEuropean.home} vs ${awayEuropean.away}, ${awayEuropean.day} ${awayEuropean.time}). Rotation risk is real — expect some squad changes.`,
      });
    }
  }

  // ─── FORM STREAKS ──────────────────────────────────────────
  const homeWinStreak = countStreak(homeForm, "W");
  const homeLossStreak = countStreak(homeForm, "L");
  const awayWinStreak = countStreak(awayForm, "W");
  const awayLossStreak = countStreak(awayForm, "L");

  if (homeWinStreak >= 3) {
    insights.push({
      type: "form_streak",
      icon: "🔥",
      impact: "positive_home",
      title: `${home} on a ${homeWinStreak}-game winning streak`,
      detail: `Strong momentum — ${home} have won their last ${homeWinStreak} matches. Teams on winning runs tend to carry confidence, though streaks always end eventually.`,
    });
  }
  if (homeLossStreak >= 3) {
    insights.push({
      type: "form_streak",
      icon: "📉",
      impact: "negative_home",
      title: `${home} on a ${homeLossStreak}-game losing streak`,
      detail: `Concerning form — ${home} have lost their last ${homeLossStreak} matches. Confidence may be low, though desperation can also produce strong performances at home.`,
    });
  }
  if (awayWinStreak >= 3) {
    insights.push({
      type: "form_streak",
      icon: "🔥",
      impact: "positive_away",
      title: `${away} on a ${awayWinStreak}-game winning streak`,
      detail: `${away} arrive in strong form with ${awayWinStreak} consecutive wins. Travelling teams with momentum can be dangerous opponents.`,
    });
  }
  if (awayLossStreak >= 3) {
    insights.push({
      type: "form_streak",
      icon: "📉",
      impact: "negative_away",
      title: `${away} on a ${awayLossStreak}-game losing streak`,
      detail: `${away} have lost their last ${awayLossStreak} matches and face a difficult away trip. Low confidence combined with travelling doesn't bode well.`,
    });
  }

  // ─── GOALS TREND ───────────────────────────────────────────
  const avgGoals = ((fixture.homeXGFor || 1.3) + (fixture.awayXGFor || 1.2));
  if (avgGoals > 3.2) {
    insights.push({
      type: "goals_trend",
      icon: "⚽",
      impact: "high_scoring",
      title: "High-scoring matchup expected",
      detail: `${home} average ${fixture.homeXGFor || '?'} goals/game and ${away} average ${fixture.awayXGFor || '?'}. Combined average of ${avgGoals.toFixed(1)} goals suggests an open, attacking game. Over markets could have value.`,
    });
  } else if (avgGoals < 2.0) {
    insights.push({
      type: "goals_trend",
      icon: "🛡️",
      impact: "low_scoring",
      title: "Low-scoring matchup expected",
      detail: `Both teams have modest scoring records (combined avg ${avgGoals.toFixed(1)} goals/game). Expect a tighter, more defensive contest. Under markets could be worth considering.`,
    });
  }

  // ─── H2H DOMINANCE ─────────────────────────────────────────
  const h2hTotal = (h2h.homeWins || 0) + (h2h.draws || 0) + (h2h.awayWins || 0);
  if (h2hTotal >= 3) {
    if ((h2h.homeWins || 0) >= 4) {
      insights.push({
        type: "h2h",
        icon: "📜",
        impact: "positive_home",
        title: `${home} dominate the H2H record`,
        detail: `${home} have won ${h2h.homeWins} of the last ${h2hTotal} meetings against ${away}. Historical dominance in a fixture can carry psychological weight, though past results don't guarantee future outcomes.`,
      });
    } else if ((h2h.awayWins || 0) >= 3) {
      insights.push({
        type: "h2h",
        icon: "📜",
        impact: "positive_away",
        title: `${away} have a strong H2H record here`,
        detail: `${away} have won ${h2h.awayWins} of the last ${h2hTotal} meetings. They seem to match up well against ${home}, which is notable even in an away fixture.`,
      });
    }
    if (h2h.avgGoals > 3.5) {
      insights.push({
        type: "h2h_goals",
        icon: "💥",
        impact: "high_scoring",
        title: "This fixture historically produces goals",
        detail: `The last ${h2hTotal} meetings averaged ${h2h.avgGoals} goals per game. This matchup tends to be open and entertaining, favouring over-goals markets.`,
      });
    } else if (h2h.avgGoals < 2.0) {
      insights.push({
        type: "h2h_goals",
        icon: "🔒",
        impact: "low_scoring",
        title: "Historically tight fixture",
        detail: `The last ${h2hTotal} meetings averaged just ${h2h.avgGoals} goals per game. This matchup tends to be cagey, favouring under-goals and BTTS No markets.`,
      });
    }
  }

  // ─── INJURY IMPACT ─────────────────────────────────────────
  if (homeInj.length >= 3) {
    insights.push({
      type: "injuries",
      icon: "🏥",
      impact: "negative_home",
      title: `${home} have ${homeInj.length} players injured`,
      detail: `A significant injury list for ${home} (${homeInj.map(i => i.player).join(", ")}). Squad depth will be tested, which could impact their performance.`,
    });
  }
  if (awayInj.length >= 3) {
    insights.push({
      type: "injuries",
      icon: "🏥",
      impact: "negative_away",
      title: `${away} have ${awayInj.length} players injured`,
      detail: `${away} are dealing with ${awayInj.length} injuries (${awayInj.map(i => i.player).join(", ")}). Travelling with a weakened squad makes an already difficult away fixture harder.`,
    });
  }

  // ─── HOME/AWAY RECORD EXTREMES ─────────────────────────────
  const homeRec = fixture.homeRecord || {};
  const awayRec = fixture.awayRecord || {};
  const homeTotalGames = (homeRec.w || 0) + (homeRec.d || 0) + (homeRec.l || 0);
  const awayTotalGames = (awayRec.w || 0) + (awayRec.d || 0) + (awayRec.l || 0);

  if (homeTotalGames >= 5) {
    const homeWinRate = (homeRec.w || 0) / homeTotalGames;
    if (homeWinRate >= 0.8) {
      insights.push({
        type: "home_fortress",
        icon: "🏟️",
        impact: "positive_home",
        title: `${home} are a fortress at home`,
        detail: `${home} have won ${homeRec.w} of ${homeTotalGames} home matches this season (${Math.round(homeWinRate * 100)}% win rate). Their home ground is a significant advantage.`,
      });
    }
    if ((homeRec.l || 0) === 0) {
      insights.push({
        type: "home_unbeaten",
        icon: "🏟️",
        impact: "positive_home",
        title: `${home} are unbeaten at home`,
        detail: `${home} haven't lost a single home match this season (${homeRec.w}W ${homeRec.d}D in ${homeTotalGames} games). A remarkable record that ${away} will need to overcome.`,
      });
    }
  }

  if (awayTotalGames >= 5) {
    const awayWinRate = (awayRec.w || 0) / awayTotalGames;
    if (awayWinRate <= 0.15) {
      insights.push({
        type: "poor_away",
        icon: "✈️",
        impact: "negative_away",
        title: `${away} struggle away from home`,
        detail: `${away} have only won ${awayRec.w} of ${awayTotalGames} away matches this season. Poor travellers face an uphill battle here.`,
      });
    }
  }

  return insights;
}

// Helper: count consecutive streak from start of form array
function countStreak(form, result) {
  let count = 0;
  for (const r of form) {
    if (r === result) count++;
    else break;
  }
  return count;
}

// Helper: ordinal suffix
function ordinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

// ═══════════════════════════════════════════════════════════════════════
// NARRATIVE ENGINE
// Generates human-readable analysis text for each prediction.
// Not just bullet points — a paragraph that tells a story and gives
// the reader confidence in WHY this bet was selected.
// ═══════════════════════════════════════════════════════════════════════
export function generateNarrative(fix, market, aiProb, impliedProb, edge) {
  const home = fix.home;
  const away = fix.away;
  const homeForm = fix.homeForm || [];
  const awayForm = fix.awayForm || [];
  const homeRec = fix.homeRecord || {};
  const awayRec = fix.awayRecord || {};
  const h2h = fix.h2h || {};
  const homePos = fix.homeLeaguePos;
  const awayPos = fix.awayLeaguePos;
  const prediction = fix.prediction || {};
  const isEuropean = EUROPEAN_COMPS.includes(fix.league);
  const homeWins = homeForm.filter(r => r === "W").length;
  const awayWins = awayForm.filter(r => r === "W").length;
  const homeLosses = homeForm.filter(r => r === "L").length;
  const awayLosses = awayForm.filter(r => r === "L").length;
  const homeFormStr = homeForm.join("");
  const awayFormStr = awayForm.join("");
  const homeGF = fix.homeXGFor || 1.3;
  const awayGF = fix.awayXGFor || 1.2;
  const totalXG = homeGF + awayGF;
  const homeGA = fix.homeXGAgainst || 1.1;
  const awayGA = fix.awayXGAgainst || 1.2;
  const homeInj = (fix.homeInjuries || []).length;
  const awayInj = (fix.awayInjuries || []).length;
  const h2hTotal = (h2h.homeWins || 0) + (h2h.draws || 0) + (h2h.awayWins || 0);

  // Power rating context for European matches
  const homePower = isEuropean ? getClubPowerRating(home) : null;
  const awayPower = isEuropean ? getClubPowerRating(away) : null;

  const parts = [];

  // ─── OPENING: Team situation ──────────────────────────────
  // Which team does the market favour?
  const isHomeBet = market.includes("Home Win") || market.includes("AH Home -") || market.includes("Draw No Bet Home");
  const isAwayBet = market.includes("Away Win") || market.includes("AH Away -") || market.includes("Draw No Bet Away");
  const isGoalsBet = market.includes("Over") || market.includes("Under") || market.includes("BTTS");
  const isDrawBet = market === "Draw";
  const isDoubleBet = market.includes("1X") || market.includes("X2") || market.includes("12");
  const isComboBet = market.includes("&");

  // Form description helpers
  const describeForm = (name, form, wins, losses, pos, league) => {
    const total = form.length;
    if (total === 0) return "";
    const formStr = form.join("");
    if (pos && !isEuropean) {
      if (wins >= 4) return `${name} are flying — ${wins} wins from their last ${total} (${formStr}), sitting ${pos}${ordinal(pos)} in the ${league || "league"}.`;
      if (wins >= 3) return `${name} come into this in solid form with ${wins} wins from ${total} (${formStr}), placed ${pos}${ordinal(pos)} in the ${league || "league"}.`;
      if (losses >= 3) return `${name} have been struggling lately with ${losses} defeats in their last ${total} (${formStr}), down in ${pos}${ordinal(pos)} place.`;
      return `${name} sit ${pos}${ordinal(pos)} in the ${league || "league"} with mixed recent form (${formStr}).`;
    }
    if (wins >= 4) return `${name} are in outstanding form — ${wins} wins from their last ${total} (${formStr}).`;
    if (wins >= 3) return `${name} have been solid recently with ${wins} wins from ${total} (${formStr}).`;
    if (losses >= 3) return `${name} are struggling — just ${wins} win(s) in their last ${total} (${formStr}).`;
    if (wins === losses) return `${name} have been inconsistent, managing ${wins} win(s) and ${losses} loss(es) from ${total} (${formStr}).`;
    return `${name} come into this with ${wins} win(s) from their last ${total} (${formStr}).`;
  };

  // ─── HOME/AWAY BET NARRATIVE ──────────────────────────────
  if (isHomeBet) {
    parts.push(describeForm(home, homeForm, homeWins, homeLosses, homePos, fix.league));
    if (awayForm.length > 0) {
      if (awayLosses >= 3) parts.push(`Their opponents ${away} have been poor on the road with ${awayLosses} defeats recently (${awayFormStr}), which further strengthens the home case.`);
      else if (awayWins >= 3) parts.push(`${away} arrive in good form (${awayFormStr}), so this won't be straightforward — but the data still leans ${home}'s way.`);
      else parts.push(`${away} have been hit-and-miss lately (${awayFormStr}).`);
    }
  } else if (isAwayBet) {
    parts.push(describeForm(away, awayForm, awayWins, awayLosses, awayPos, fix.league));
    if (homeForm.length > 0) {
      if (homeLosses >= 3) parts.push(`${home} have been poor at home with ${homeLosses} defeats recently (${homeFormStr}), making this a good opportunity for the visitors.`);
      else if (homeWins >= 3) parts.push(`${home} are in decent home form (${homeFormStr}), so ${away} will need to be at their best.`);
      else parts.push(`${home} have been inconsistent at home (${homeFormStr}).`);
    }
  } else if (isGoalsBet) {
    if (totalXG > 2.8) parts.push(`This fixture profiles as a high-scoring affair — ${home} average ${homeGF.toFixed(1)} goals per game while ${away} contribute ${awayGF.toFixed(1)}, giving a combined expected total of ${totalXG.toFixed(1)} goals.`);
    else if (totalXG < 2.2) parts.push(`Both sides tend toward tighter, lower-scoring matches — ${home} average ${homeGF.toFixed(1)} goals and ${away} ${awayGF.toFixed(1)}, with a combined expectation of just ${totalXG.toFixed(1)} goals.`);
    else parts.push(`The expected goals data is balanced here (${totalXG.toFixed(1)} combined), suggesting a match that could go either way on the goals front.`);
    if (market.includes("BTTS")) {
      if (homeGA > 1.3 && awayGA > 1.3) parts.push(`Both defences leak goals — ${home} concede ${homeGA.toFixed(1)}/game and ${away} concede ${awayGA.toFixed(1)}/game. Both teams finding the net looks probable.`);
      else if (homeGA < 0.8 || awayGA < 0.8) parts.push(`One of these defences is tight (${home}: ${homeGA.toFixed(1)} conceded/game, ${away}: ${awayGA.toFixed(1)}), which could prevent both teams from scoring.`);
    }
  } else if (isDrawBet) {
    parts.push(`This profiles as a tight match where neither side has a commanding edge.`);
    if (Math.abs(homeWins - awayWins) <= 1 && homeForm.length >= 3) parts.push(`${home} (${homeFormStr}) and ${away} (${awayFormStr}) are in remarkably similar form, pointing to a cagey affair.`);
  } else if (isDoubleBet) {
    if (market.includes("1X")) parts.push(`${home} at home are difficult to beat and ${away} may struggle to take all three points here.`);
    else if (market.includes("X2")) parts.push(`${away} should be competitive enough to avoid defeat, and may well take all three points.`);
    else parts.push(`Both sides have enough quality to prevent a draw, making a decisive result likely.`);
    parts.push(describeForm(home, homeForm, homeWins, homeLosses, homePos, fix.league));
  }

  // ─── COMBO BET NARRATIVE ──────────────────────────────────
  if (isComboBet) {
    const [resultPart, statPart] = market.split(" & ");
    if (resultPart.includes("Home")) parts.push(describeForm(home, homeForm, homeWins, homeLosses, homePos, fix.league));
    if (resultPart.includes("Away")) parts.push(describeForm(away, awayForm, awayWins, awayLosses, awayPos, fix.league));
    if (statPart?.includes("Over")) parts.push(`Combined expected goals of ${totalXG.toFixed(1)} support the over — this could be an open, attacking game.`);
    if (statPart?.includes("Under")) parts.push(`Despite the result lean, goals could be scarce with ${totalXG.toFixed(1)} combined expected total.`);
    if (statPart?.includes("BTTS Yes")) parts.push(`Both defences have vulnerabilities (${home}: ${homeGA.toFixed(1)} conceded/game, ${away}: ${awayGA.toFixed(1)}), making both teams scoring a realistic proposition.`);
    if (statPart?.includes("BTTS No")) parts.push(`One of these sides could keep a clean sheet — ${homeGA < 1.0 ? home + " only concede " + homeGA.toFixed(1) + "/game" : awayGA < 1.0 ? away + " only concede " + awayGA.toFixed(1) + "/game" : "the favourite may dominate possession and limit chances"}.`);
  }

  // ─── EUROPEAN CONTEXT ─────────────────────────────────────
  if (isEuropean && homePower && awayPower) {
    const powerGap = homePower.rating - awayPower.rating;
    if (Math.abs(powerGap) >= 20) {
      const stronger = powerGap > 0 ? home : away;
      const weaker = powerGap > 0 ? away : home;
      const strongerP = powerGap > 0 ? homePower : awayPower;
      const weakerP = powerGap > 0 ? awayPower : homePower;
      parts.push(`In terms of overall quality, ${stronger} (squad ~${strongerP.value}) are a level above ${weaker} (squad ~${weakerP.value}). ${strongerP.pedigree} — that kind of European experience often proves decisive in continental competition.`);
    } else if (Math.abs(powerGap) >= 8) {
      const stronger = powerGap > 0 ? home : away;
      const strongerP = powerGap > 0 ? homePower : awayPower;
      parts.push(`${stronger} have a squad quality edge (Power ${strongerP.rating}/100) and stronger European pedigree. ${strongerP.pedigree}.`);
    } else if (homePower.rating >= 85 && awayPower.rating >= 85) {
      parts.push(`Two genuine European heavyweights going head-to-head. Both squads are stacked with international talent — expect a tactically intense battle where fine margins decide it.`);
    }

    // European Campaign Performance — actual results in this competition
    const homeCampaign = fix._homeCampaign;
    const awayCampaign = fix._awayCampaign;

    if (isHomeBet && awayCampaign?.isOverperformer) {
      const notable = awayCampaign.notableResults.slice(0, 2).map(r => `${r.result === "W" ? "beating" : "drawing with"} ${r.opponent}`).join(" and ");
      parts.push(`However, don't underestimate ${away} — they've punched well above their weight in this competition, ${notable}. Their European form suggests they're better than their league standing implies.`);
    } else if (isAwayBet && homeCampaign?.isOverperformer) {
      const notable = homeCampaign.notableResults.slice(0, 2).map(r => `${r.result === "W" ? "beating" : "drawing with"} ${r.opponent}`).join(" and ");
      parts.push(`That said, ${home} have been impressive in Europe, ${notable}. Playing at home with European momentum behind them makes this a tougher away trip than it looks on paper.`);
    } else if (isHomeBet && homeCampaign?.giantKills >= 1) {
      const notable = homeCampaign.notableResults[0];
      parts.push(`${home} have proven they can beat top opposition in this competition${notable ? ` (${notable.result === "W" ? "beat" : "drew"} ${notable.opponent})` : ""}, which backs up the selection.`);
    } else if (isAwayBet && awayCampaign?.giantKills >= 1) {
      const notable = awayCampaign.notableResults[0];
      parts.push(`${away} have already taken notable scalps in this competition${notable ? ` (${notable.result === "W" ? "beat" : "drew"} ${notable.opponent})` : ""}, showing they can perform away from home in Europe.`);
    }
  }

  // ─── H2H CONTEXT ──────────────────────────────────────────
  if (h2hTotal >= 3) {
    if (h2h.homeWins >= 3) parts.push(`The head-to-head record strongly favours ${home} with ${h2h.homeWins} wins from the last ${h2hTotal} meetings.`);
    else if (h2h.awayWins >= 3) parts.push(`${away} dominate the recent head-to-head with ${h2h.awayWins} wins from ${h2hTotal} encounters.`);
    else if (h2h.draws >= 2) parts.push(`These two have shared the spoils often — ${h2h.draws} draws from ${h2hTotal} recent meetings, suggesting another tight contest.`);
    if (h2h.avgGoals && h2h.avgGoals > 3.0 && isGoalsBet) parts.push(`Their recent meetings have averaged ${h2h.avgGoals} goals, which is well above the norm.`);
  }

  // ─── INJURIES ─────────────────────────────────────────────
  if (homeInj >= 3 && (isAwayBet || (isHomeBet && false))) {
    parts.push(`${home} are also dealing with ${homeInj} injured players, which could weaken their starting XI.`);
  }
  if (awayInj >= 3 && (isHomeBet || (isAwayBet && false))) {
    parts.push(`${away} are missing ${awayInj} players through injury, travelling with a depleted squad.`);
  }

  // ─── HOME RECORD CONTEXT ──────────────────────────────────
  const homeTotal = (homeRec.w || 0) + (homeRec.d || 0) + (homeRec.l || 0);
  const awayTotal = (awayRec.w || 0) + (awayRec.d || 0) + (awayRec.l || 0);
  if (isHomeBet && homeTotal >= 5 && (homeRec.w || 0) / homeTotal >= 0.7) {
    parts.push(`${home}'s home record this season is impressive — ${homeRec.w} wins from ${homeTotal} at their ground.`);
  }
  if (isAwayBet && awayTotal >= 5 && (awayRec.l || 0) / awayTotal >= 0.6) {
    parts.push(`${away}'s away record has been poor (${awayRec.l} losses from ${awayTotal} on the road), but the odds may already reflect this.`);
  }

  // ─── CLOSING: Value verdict ───────────────────────────────
  const edgeVal = typeof edge === "number" ? edge : parseFloat(edge);
  if (edgeVal > 2) {
    parts.push(`Our model sees genuine value here — at ${fix.odds?.[market] || "these odds"}, the bookmaker may be underestimating this outcome by ${edgeVal.toFixed(1)}%.`);
  } else if (edgeVal > 0) {
    parts.push(`There's a small edge in the odds (${edgeVal.toFixed(1)}%) — not a huge mispricing, but enough to make this a smart selection.`);
  } else if (aiProb >= 55) {
    parts.push(`While the odds are fairly priced, the high probability (${(aiProb).toFixed(0)}%) makes this a solid pick for accumulator building.`);
  } else {
    parts.push(`The value here comes from the combination of factors above rather than a single standout edge.`);
  }

  return parts.filter(p => p.length > 0).join(" ");
}

// ═══════════════════════════════════════════════════════════════════════
// PROS / CONS GENERATOR
// Generates supporting bullets (pros) and risk factors (cons) for each bet.
// Honest cons build trust — users respect transparency.
// ═══════════════════════════════════════════════════════════════════════
export function generateProsCons(fix, market, aiProb, edge) {
  const pros = [];
  const cons = [];
  const home = fix.home;
  const away = fix.away;
  const homeForm = fix.homeForm || [];
  const awayForm = fix.awayForm || [];
  const h2h = fix.h2h || {};
  const homeRec = fix.homeRecord || {};
  const awayRec = fix.awayRecord || {};
  const homeInj = (fix.homeInjuries || []).length;
  const awayInj = (fix.awayInjuries || []).length;
  const homeGF = fix.homeXGFor || 1.3;
  const awayGF = fix.awayXGFor || 1.2;
  const homeGA = fix.homeXGAgainst || 1.1;
  const awayGA = fix.awayXGAgainst || 1.2;
  const totalXG = homeGF + awayGF;
  const isEuropean = EUROPEAN_COMPS.includes(fix.league);
  const homeWins = homeForm.filter(r => r === "W").length;
  const awayWins = awayForm.filter(r => r === "W").length;
  const homeLosses = homeForm.filter(r => r === "L").length;
  const awayLosses = awayForm.filter(r => r === "L").length;
  const h2hTotal = (h2h.homeWins || 0) + (h2h.draws || 0) + (h2h.awayWins || 0);
  const homeTotal = (homeRec.w || 0) + (homeRec.d || 0) + (homeRec.l || 0);
  const awayTotal = (awayRec.w || 0) + (awayRec.d || 0) + (awayRec.l || 0);

  const isHomeBet = market.includes("Home Win") || market.includes("AH Home -") || market.includes("Draw No Bet Home");
  const isAwayBet = market.includes("Away Win") || market.includes("AH Away -") || market.includes("Draw No Bet Away");
  const isOverBet = market.includes("Over");
  const isUnderBet = market.includes("Under");
  const isBTTS = market.includes("BTTS");

  // ─── PROS ─────────────────────────────────────────────────
  if (isHomeBet) {
    if (homeWins >= 3) pros.push(`${home} have won ${homeWins} of their last ${homeForm.length}`);
    if (homeTotal >= 5 && (homeRec.w || 0) / homeTotal >= 0.6) pros.push(`Strong home record: ${homeRec.w}W from ${homeTotal} at home`);
    if (awayLosses >= 3) pros.push(`${away} have lost ${awayLosses} of their last ${awayForm.length}`);
    if (h2hTotal >= 3 && h2h.homeWins >= 2) pros.push(`H2H: ${home} won ${h2h.homeWins} of last ${h2hTotal} meetings`);
    if (awayInj >= 2) pros.push(`${away} missing ${awayInj} players through injury`);
    if (edge > 1) pros.push(`Positive value edge: +${edge.toFixed(1)}%`);
  }
  if (isAwayBet) {
    if (awayWins >= 3) pros.push(`${away} have won ${awayWins} of their last ${awayForm.length}`);
    if (awayTotal >= 5 && (awayRec.w || 0) / awayTotal >= 0.4) pros.push(`Solid away form: ${awayRec.w}W from ${awayTotal} away`);
    if (homeLosses >= 3) pros.push(`${home} have lost ${homeLosses} of their last ${homeForm.length}`);
    if (h2hTotal >= 3 && h2h.awayWins >= 2) pros.push(`H2H: ${away} won ${h2h.awayWins} of last ${h2hTotal} meetings`);
    if (homeInj >= 2) pros.push(`${home} missing ${homeInj} players through injury`);
    if (edge > 1) pros.push(`Positive value edge: +${edge.toFixed(1)}%`);
  }
  if (isOverBet) {
    if (totalXG > 2.8) pros.push(`Combined expected goals: ${totalXG.toFixed(1)} per game`);
    if (homeGF >= 1.8) pros.push(`${home} average ${homeGF.toFixed(1)} goals per game`);
    if (awayGF >= 1.5) pros.push(`${away} average ${awayGF.toFixed(1)} goals per game`);
    if (h2h.avgGoals && h2h.avgGoals >= 3.0) pros.push(`H2H average: ${h2h.avgGoals} goals per meeting`);
  }
  if (isUnderBet) {
    if (totalXG < 2.3) pros.push(`Low combined expected goals: ${totalXG.toFixed(1)}`);
    if (homeGA < 0.9) pros.push(`${home} concede only ${homeGA.toFixed(1)} goals per game`);
    if (awayGA < 0.9) pros.push(`${away} concede only ${awayGA.toFixed(1)} goals per game`);
  }
  if (isBTTS) {
    if (market.includes("Yes")) {
      if (homeGA > 1.2) pros.push(`${home} concede ${homeGA.toFixed(1)} goals per game`);
      if (awayGA > 1.2) pros.push(`${away} concede ${awayGA.toFixed(1)} goals per game`);
    } else {
      if (homeGA < 0.8) pros.push(`${home} have a tight defence: ${homeGA.toFixed(1)} conceded/game`);
      if (awayGF < 0.9) pros.push(`${away} struggle to score: ${awayGF.toFixed(1)} goals/game`);
    }
  }

  // European pedigree pro
  if (isEuropean) {
    const homePower = getClubPowerRating(home);
    const awayPower = getClubPowerRating(away);
    if (isHomeBet && homePower.rating - awayPower.rating >= 15) {
      pros.push(`Squad quality advantage (Power ${homePower.rating} vs ${awayPower.rating})`);
    }
    if (isAwayBet && awayPower.rating - homePower.rating >= 15) {
      pros.push(`Squad quality advantage (Power ${awayPower.rating} vs ${homePower.rating})`);
    }

    // European campaign performance
    const homeCampaign = fix._homeCampaign;
    const awayCampaign = fix._awayCampaign;

    if (isHomeBet && homeCampaign?.giantKills >= 1) {
      const notable = homeCampaign.notableResults[0];
      pros.push(`Proven in Europe: beat ${notable?.opponent || "top opposition"} this campaign`);
    }
    if (isAwayBet && awayCampaign?.giantKills >= 1) {
      const notable = awayCampaign.notableResults[0];
      pros.push(`Proven in Europe: beat ${notable?.opponent || "top opposition"} this campaign`);
    }
    // Campaign as a con — opponent has giant-killer status
    if (isHomeBet && awayCampaign?.isOverperformer) {
      cons.push(`${away} are European giant killers — they've beaten ${awayCampaign.giantKills} team(s) rated 80+`);
    }
    if (isAwayBet && homeCampaign?.isOverperformer) {
      cons.push(`${home} are European giant killers at home — dangerous opponents despite lower Power rating`);
    }
  }

  // ─── CONS (honest risk factors) ───────────────────────────
  if (isHomeBet) {
    if (homeLosses >= 2) cons.push(`${home} have lost ${homeLosses} of their last ${homeForm.length} — form is patchy`);
    if (awayWins >= 3) cons.push(`${away} arrive in strong form: ${awayWins}W from ${awayForm.length}`);
    if (h2hTotal >= 3 && h2h.awayWins >= 2) cons.push(`${away} have a decent H2H record: ${h2h.awayWins}W from ${h2hTotal}`);
    if (homeInj >= 2) cons.push(`${home} missing ${homeInj} players through injury`);
  }
  if (isAwayBet) {
    if (awayLosses >= 2) cons.push(`${away} have lost ${awayLosses} of their last ${awayForm.length}`);
    if (homeWins >= 3) cons.push(`${home} are in good form: ${homeWins}W from ${homeForm.length}`);
    if (homeTotal >= 5 && (homeRec.w || 0) / homeTotal >= 0.6) cons.push(`${home} have a strong home record this season`);
    if (awayInj >= 2) cons.push(`${away} missing ${awayInj} players through injury`);
  }
  if (isOverBet) {
    if (totalXG < 2.5) cons.push(`Combined expected goals (${totalXG.toFixed(1)}) not especially high`);
    if (homeGA < 0.8 || awayGA < 0.8) cons.push(`One side has a tight defence which could limit scoring`);
  }
  if (isUnderBet) {
    if (totalXG > 2.8) cons.push(`Combined expected goals (${totalXG.toFixed(1)}) suggest this could be open`);
  }

  // Generic risk cons
  if (edge < 0) cons.push(`Bookmakers give this a slightly higher probability than our model`);

  // European travel/rotation
  if (isEuropean && isAwayBet) cons.push(`European away matches are inherently unpredictable`);

  // Limit to reasonable count
  return {
    pros: pros.slice(0, 4),
    cons: cons.slice(0, 3),
  };
}


// Generate all opportunities from fixtures
export function generateOpportunities(fixtures, allowedMarkets) {
  const opps = [];

  fixtures.forEach(fix => {
    const allMarkets = Object.values(MARKET_CATEGORIES).flatMap(c => c.markets);
    const markets = allMarkets.filter(m => !allowedMarkets || allowedMarkets.has(m));

    // Compute league strength differential for European competitions
    // This is critical: Inter Milan (Serie A) vs a Swedish team = huge quality gap
    const isEuropean = EUROPEAN_COMPS.includes(fix.league);
    if (isEuropean) {
      const homeDomestic = getTeamDomesticLeague(fix.home, fixtures);
      const awayDomestic = getTeamDomesticLeague(fix.away, fixtures);
      fix._homeLeagueCoeff = (homeDomestic ? getLeagueStrength(homeDomestic) : DEFAULT_LEAGUE).coefficient;
      fix._awayLeagueCoeff = (awayDomestic ? getLeagueStrength(awayDomestic) : DEFAULT_LEAGUE).coefficient;
      fix._leagueStrengthDiff = fix._homeLeagueCoeff - fix._awayLeagueCoeff; // positive = home from stronger league

      // Club Power Rating: squad value + European pedigree
      // Real Madrid (98) vs Bodø/Glimt (42) = +56 → significant home edge
      // Real Madrid (98) vs Inter (84) = +14 → slight home edge
      const homePower = getClubPowerRating(fix.home);
      const awayPower = getClubPowerRating(fix.away);
      fix._powerRatingDiff = homePower.rating - awayPower.rating; // positive = home stronger

      // European Campaign Performance: actual results in this competition
      // Bodø/Glimt beat Inter? That overrides the "weak Norwegian team" penalty
      const homeCampaign = analyzeEuropeanCampaign(fix.home, fixtures);
      const awayCampaign = analyzeEuropeanCampaign(fix.away, fixtures);
      const homeBoost = homeCampaign?.campaignBoost || 0;
      const awayBoost = awayCampaign?.campaignBoost || 0;
      fix._campaignBoostDiff = homeBoost - awayBoost; // positive = home has better European results
      fix._homeCampaign = homeCampaign;
      fix._awayCampaign = awayCampaign;
    } else {
      fix._leagueStrengthDiff = 0; // Same league, no adjustment needed
      fix._powerRatingDiff = 0;    // Power ratings only apply in European comps
      fix._campaignBoostDiff = 0;
    }

    // Generate context insights for this fixture (pass all fixtures for cross-reference)
    const contextInsights = generateContextInsights(fix, fixtures);

    markets.forEach(market => {
      const realOdds = fix.odds?.[market];

      // Skip markets where we don't have real odds
      if (!realOdds || realOdds < 1.01) return;

      const aiProb = calcMarketProb(fix, market, realOdds);
      const impliedProb = 1 / realOdds;
      const edge = aiProb - impliedProb;

      // Generate human-readable narrative for this pick
      const narrative = generateNarrative(fix, market, aiProb * 100, impliedProb * 100, edge * 100);
      const { pros, cons } = generateProsCons(fix, market, aiProb * 100, edge * 100);

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
        isValue: edge > 0.008,
        narrative, // AI-written analysis paragraph
        pros,     // Supporting bullets (2-4)
        cons,     // Risk factors (1-3)
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
          contextInsights, // NEW: smart AI reasoning
          factors: {
            form: { home: calcFormStrength(fix.homeForm), away: calcFormStrength(fix.awayForm), weight: 0.2 },
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

  // How ambitious is this target?
  const isHighTarget = targetPerLeg > 2.5;      // e.g. 4 legs at 3x each = 81x
  const isExtremeTarget = targetPerLeg > 4.0;    // e.g. 4 legs at 5x each = 625x

  const tolerance = {
    conservative: { min: Math.max(1.10, targetPerLeg * 0.6), max: targetPerLeg * 1.2 },
    balanced:     { min: Math.max(1.10, targetPerLeg * 0.5), max: targetPerLeg * 1.5 },
    aggressive:   { min: Math.max(1.10, targetPerLeg * 0.4), max: targetPerLeg * 2.0 },
  }[riskLevel];

  // For high targets, widen the range even more
  if (isHighTarget || isExtremeTarget) {
    tolerance.min = Math.max(1.10, targetPerLeg * 0.3);
    tolerance.max = targetPerLeg * 2.5;
  }

  // ─── STEP 1: Filter out terrible bets ──────────────────────────────
  // Probability floors are ADAPTIVE based on target odds.
  // Normal targets (2-10x): strict floors — only recommend likely bets
  // High targets (10-50x): relaxed floors — allow riskier picks but still rank by quality
  // Extreme targets (50x+): minimal floors — build the best possible long shot
  
  // How ambitious is this target? Per-leg odds tell us.
  // (already defined above)

  const baseMinProb = {
    conservative: { match: 50, draw: 28, doubleChance: 60, goals: 45, btts: 45, corners: 45 },
    balanced:     { match: 42, draw: 25, doubleChance: 52, goals: 38, btts: 38, corners: 38 },
    aggressive:   { match: 33, draw: 22, doubleChance: 42, goals: 30, btts: 30, corners: 30 },
  }[riskLevel];

  // Scale down floors for ambitious targets (minimum 15% for match results, 10% for draws)
  const scaleFactor = isExtremeTarget ? 0.4 : isHighTarget ? 0.65 : 1.0;
  const minProb = {};
  for (const key of Object.keys(baseMinProb)) {
    const floor = key === "draw" ? 10 : key === "doubleChance" ? 20 : 15;
    minProb[key] = Math.max(floor, Math.round(baseMinProb[key] * scaleFactor));
  }

  const passesMinProb = (opp) => {
    const prob = opp.aiProbability;
    const m = opp.market;
    if (m.includes("Home Win") || m.includes("Away Win")) {
      if (m.includes("&")) return prob >= Math.max(10, minProb.goals * 0.6);  // Combo bets
      return prob >= minProb.match;
    }
    if (m.includes("Draw") && !m.includes("Draw No Bet")) {
      if (m.includes("&")) return prob >= 8;  // Draw combos are naturally rare
      return prob >= minProb.draw;
    }
    if (m.includes("1X") || m.includes("X2") || m.includes("12") || m.includes("Double")) return prob >= minProb.doubleChance;
    if (m.includes("Over") || m.includes("Under")) return prob >= minProb.goals;
    if (m.includes("BTTS")) return prob >= minProb.btts;
    if (m.includes("Corner")) return prob >= minProb.corners;
    if (m.startsWith("AH")) return prob >= minProb.goals;
    if (m.includes("Draw No Bet")) return prob >= minProb.match;
    return prob >= minProb.match;
  };

  // ─── STEP 2: Score by BOTH probability and edge ────────────────────
  // For normal targets: probability dominates scoring
  // For high targets: odds-fit becomes critical (we NEED to reach the target)
  //   but within the right odds range, probability still picks the best bet
  const scored = opportunities
    .filter(opp => opp.bookmakerOdds >= 1.05 && passesMinProb(opp))
    .map(opp => {
      const odds = opp.bookmakerOdds;
      const edge = parseFloat(opp.edge);
      const prob = opp.aiProbability;
      const oddsFit = Math.abs(Math.log(odds) - Math.log(targetPerLeg));
      const inRange = odds >= tolerance.min && odds <= tolerance.max;

      let score = inRange ? 10 : 0;

      if (isExtremeTarget) {
        // Extreme targets: odds-fit is king, but pick highest prob within range
        score += inRange ? 15 : -oddsFit * 8;
        score += prob * 0.08;              // Prob still matters but less
        score += edge * 2;
      } else if (isHighTarget) {
        // High targets: balance odds-fit with probability
        score -= oddsFit * 6;
        score += prob * 0.12;
        score += edge * 2.5;
        if (opp.isValue) score += 3;
      } else {
        // Normal targets: probability dominates
        score -= oddsFit * 4;
        score += prob * 0.15;
        score += edge * 3;
        if (opp.isValue) score += 4;
      }

      // Risk-level adjustments
      if (riskLevel === "conservative") {
        score += prob * 0.10;
        if (prob >= 60) score += 3;
      }
      if (riskLevel === "aggressive") {
        score += edge * 2;
      }

      return { ...opp, _score: score };
    });

  scored.sort((a, b) => b._score - a._score);

  // Count unique matches available
  const uniqueMatches = new Set(scored.map(o => `${o.home}-${o.away}`)).size;
  const effectiveSelections = Math.min(numSelections, scored.length);

  // ─── STRATEGY: Two-pass selection ──────────────────────────────────
  // Pass 1: Try to hit target odds with one bet per match
  // Pass 2: If not enough unique matches, allow multiple DIFFERENT markets
  //         from the same match (e.g. "Liverpool Win" + "Over 2.5" is fine,
  //         but not two 1X2 bets from the same match)

  const selected = [];
  const usedMatches = new Set();        // track match keys
  const usedMarketPerMatch = {};        // track market TYPES per match
  let currentCombinedOdds = 1;

  // Helper: get market category for a market name
  const getMarketCategory = (market) => {
    if (market.includes("&") && market.includes("Over")) return "COMBO_OU";
    if (market.includes("&") && market.includes("Under")) return "COMBO_OU";
    if (market.includes("&") && market.includes("BTTS")) return "COMBO_BTTS";
    if (market.includes("Home Win") || market.includes("Away Win") || market.includes("Draw")) return "1X2";
    if (market.includes("Over") || market.includes("Under")) return "OU";
    if (market.includes("BTTS")) return "BTTS";
    if (market.includes("1X") || market.includes("X2") || market.includes("12")) return "DC";
    if (market.startsWith("AH")) return "AH";
    if (market.includes("Draw No Bet")) return "DNB";
    if (market.includes("Corner")) return "CORNERS";
    return "OTHER";
  };

  // Pass 1: One bet per match, try to approach target
  for (const opp of scored) {
    if (selected.length >= effectiveSelections) break;
    const matchKey = `${opp.home}-${opp.away}`;
    if (usedMatches.has(matchKey)) continue;

    // Soft odds check — don't skip good bets just because odds don't perfectly fit
    const wouldBe = currentCombinedOdds * opp.bookmakerOdds;
    if (selected.length > 0 && wouldBe > targetOdds * 3 && riskLevel !== "aggressive") continue;

    usedMatches.add(matchKey);
    usedMarketPerMatch[matchKey] = new Set([getMarketCategory(opp.market)]);
    selected.push(opp);
    currentCombinedOdds = wouldBe;
  }

  // Pass 2: If we need more selections than unique matches,
  // add DIFFERENT market types from already-used matches
  if (selected.length < effectiveSelections && uniqueMatches < numSelections) {
    for (const opp of scored) {
      if (selected.length >= effectiveSelections) break;
      const matchKey = `${opp.home}-${opp.away}`;
      const cat = getMarketCategory(opp.market);

      // Skip if we already used this exact market type on this match
      if (usedMarketPerMatch[matchKey]?.has(cat)) continue;
      // Skip if this exact bet is already selected
      if (selected.find(s => s.id === opp.id)) continue;

      if (!usedMarketPerMatch[matchKey]) usedMarketPerMatch[matchKey] = new Set();
      usedMarketPerMatch[matchKey].add(cat);
      selected.push(opp);
      currentCombinedOdds *= opp.bookmakerOdds;
    }
  }

  const combinedOdds = +selected.reduce((acc, m) => acc * m.bookmakerOdds, 1).toFixed(2);
  const avgEdge = selected.length ? selected.reduce((a, m) => a + parseFloat(m.edge), 0) / selected.length : 0;
  const slipWinProb = selected.reduce((acc, m) => acc * (m.aiProbability / 100), 1);
  const targetRatio = combinedOdds / targetOdds;
  const targetHit = targetRatio >= 0.7 && targetRatio <= 1.5;

  // Smart suggestions
  const maxMatches = new Set(opportunities.map(o => `${o.home}-${o.away}`)).size;
  const suggestions = [];

  // Warn if not enough matches for unique-per-match selections
  if (numSelections > maxMatches && maxMatches > 0) {
    suggestions.push({
      icon: "ℹ️", title: `Only ${maxMatches} matches available`,
      detail: `You asked for ${numSelections} selections but there are only ${maxMatches} unique matches. We've mixed different market types from the same matches to build your slip.`,
    });
  }

  if (!targetHit) {
    // Target not reached
    if (combinedOdds >= targetOdds * 0.5) {
      // Close to target — encouraging
      suggestions.push({
        icon: "📊", title: `Close to target: ${combinedOdds}x of ${targetOdds.toFixed(0)}x`,
        detail: `We got to ${combinedOdds}x with the best available picks. Adding more legs or switching to Bold mode could close the gap.`,
      });
    } else if (targetOdds > 20) {
      const realisticTarget = Math.round(parseFloat(stake) * combinedOdds);
      suggestions.push({
        icon: "⚠️", title: "Target is very ambitious",
        detail: `€${targetWinnings} from €${stake} needs ${targetOdds.toFixed(0)}x odds. We built the best ${combinedOdds}x slip possible. This would return €${realisticTarget}.`,
      });
    }
    if (targetOdds > 5) {
      const neededStake = Math.ceil(parseFloat(targetWinnings || 500) / Math.max(combinedOdds, 2));
      suggestions.push({
        icon: "💰", title: "Increase your stake",
        detail: `€${neededStake} stake at ${combinedOdds}x odds would return €${Math.round(neededStake * combinedOdds)}.`,
        action: `try_stake_${neededStake}`,
      });
    }
    if (numSelections < maxMatches && numSelections < 8) {
      const moreLegs = Math.min(maxMatches, numSelections + 2);
      suggestions.push({
        icon: "➕", title: "Add more selections",
        detail: `More legs = higher combined odds. With ${moreLegs} selections, each leg needs lower individual odds.`,
        action: `try_legs_${moreLegs}`,
      });
    }
    if (riskLevel !== "aggressive" && targetPerLeg > 2.0) {
      suggestions.push({
        icon: "🔥", title: riskLevel === "conservative" ? "Switch to Bold mode" : "Switch to Bold mode",
        detail: `Your target needs ${targetPerLeg.toFixed(2)}x per leg. Bold mode allows riskier picks that can reach higher odds.`,
      });
    }
  }

  if (slipWinProb < 0.03 && selected.length > 1) {
    if (targetOdds > 50) {
      // High-odds slip — don't lecture them, they know it's a long shot
      suggestions.push({
        icon: "🚀", title: `Long shot: ${(slipWinProb * 100).toFixed(1)}% win probability`,
        detail: `Roughly 1 in ${Math.round(1 / Math.max(slipWinProb, 0.001))} chance — but these are the statistically best picks at these odds. Small stake only.`,
      });
    } else {
      suggestions.push({
        icon: "⚠️", title: `Win probability is ${(slipWinProb * 100).toFixed(1)}%`,
        detail: `That's roughly 1 in ${Math.round(1 / Math.max(slipWinProb, 0.001))} chance. Consider fewer legs for better odds of winning.`,
        action: selected.length > 2 ? `try_legs_${selected.length - 1}` : undefined,
      });
    }
  }

  if (targetHit && slipWinProb > 0.05 && avgEdge > 0) {
    suggestions.push({
      icon: "✅", title: "Good setup",
      detail: `Target reached at ${combinedOdds}x. ${selected.filter(m => m.isValue).length} value bets with positive edge. Win probability: ${(slipWinProb * 100).toFixed(1)}%.`,
    });
  }

  if (targetHit && slipWinProb > 0.05 && avgEdge <= 0) {
    suggestions.push({
      icon: "✅", title: "Target reached",
      detail: `Combined odds of ${combinedOdds}x hit your target. Win probability: ${(slipWinProb * 100).toFixed(1)}%.`,
    });
  }

  if (targetHit && slipWinProb <= 0.05 && slipWinProb > 0.01) {
    suggestions.push({
      icon: "✅", title: "Target reached — high risk",
      detail: `${combinedOdds}x odds hit your target. Win probability: ${(slipWinProb * 100).toFixed(1)}%. This is an entertainment bet — keep the stake small.`,
    });
  }

  if (targetHit && slipWinProb <= 0.01) {
    suggestions.push({
      icon: "🚀", title: "Target reached — extreme long shot",
      detail: `${combinedOdds}x odds! Win probability: ${(slipWinProb * 100).toFixed(2)}% (~1 in ${Math.round(1 / Math.max(slipWinProb, 0.0001))}). We picked the best possible legs at these odds. Bet only what you can afford to lose.`,
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
