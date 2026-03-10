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
// This is honest and realistic — even the best models rarely beat the market by more.

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
  
  switch (market) {
    case "Home Win":
      // Better home form, H2H dominance, and fewer injuries = slight boost
      adjustment = formDiff * 0.04 + h2hHomeDominance * 0.02 + injuryDiff;
      break;
    case "Draw":
      // Draws more likely when teams are close in form
      adjustment = -Math.abs(formDiff) * 0.02;
      break;
    case "Away Win":
      adjustment = -formDiff * 0.04 - h2hHomeDominance * 0.02 - injuryDiff;
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
      adjustment = formDiff * 0.02 + h2hHomeDominance * 0.01;
      break;
    case "X2 (Draw or Away)":
      adjustment = -formDiff * 0.02 - h2hHomeDominance * 0.01;
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

  // ─── LEAGUE POSITION GAP ───────────────────────────────────
  if (homePos && awayPos) {
    const gap = awayPos - homePos;
    if (gap >= 10) {
      insights.push({
        type: "league_gap",
        icon: "📊",
        impact: "positive_home",
        title: "Large league position gap",
        detail: `${home} (${homePos}${ordinal(homePos)}) sit significantly higher than ${away} (${awayPos}${ordinal(awayPos)}). A ${gap}-position gap suggests a clear quality difference.`,
      });
    } else if (gap <= -10) {
      insights.push({
        type: "league_gap",
        icon: "📊",
        impact: "positive_away",
        title: "Away team ranked much higher",
        detail: `${away} (${awayPos}${ordinal(awayPos)}) sit significantly higher than ${home} (${homePos}${ordinal(homePos)}). Despite playing away, the quality gap is notable.`,
      });
    } else if (Math.abs(gap) <= 2) {
      insights.push({
        type: "league_gap",
        icon: "📊",
        impact: "neutral",
        title: "Closely matched teams",
        detail: `${home} (${homePos}${ordinal(homePos)}) and ${away} (${awayPos}${ordinal(awayPos)}) are very close in the standings. Expect a competitive match — draws and tight margins more likely.`,
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


// Generate all opportunities from fixtures
export function generateOpportunities(fixtures, allowedMarkets) {
  const opps = [];

  fixtures.forEach(fix => {
    const allMarkets = Object.values(MARKET_CATEGORIES).flatMap(c => c.markets);
    const markets = allMarkets.filter(m => !allowedMarkets || allowedMarkets.has(m));

    // Generate context insights for this fixture (pass all fixtures for cross-reference)
    const contextInsights = generateContextInsights(fix, fixtures);

    markets.forEach(market => {
      const realOdds = fix.odds?.[market];

      // Skip markets where we don't have real odds
      if (!realOdds || realOdds < 1.01) return;

      const aiProb = calcMarketProb(fix, market, realOdds);
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
        isValue: edge > 0.008,
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

  const tolerance = {
    conservative: { min: Math.max(1.10, targetPerLeg * 0.6), max: targetPerLeg * 1.2 },
    balanced:     { min: Math.max(1.10, targetPerLeg * 0.5), max: targetPerLeg * 1.5 },
    aggressive:   { min: Math.max(1.10, targetPerLeg * 0.4), max: targetPerLeg * 2.0 },
  }[riskLevel];

  // ─── STEP 1: Filter out terrible bets ──────────────────────────────
  // No matter the edge, we never recommend bets below these probability floors
  const minProb = {
    conservative: { match: 50, draw: 28, doubleChance: 60, goals: 45, btts: 45, corners: 45 },
    balanced:     { match: 42, draw: 25, doubleChance: 52, goals: 38, btts: 38, corners: 38 },
    aggressive:   { match: 33, draw: 22, doubleChance: 42, goals: 30, btts: 30, corners: 30 },
  }[riskLevel];

  const passesMinProb = (opp) => {
    const prob = opp.aiProbability;
    const m = opp.market;
    if (m.includes("Home Win") || m.includes("Away Win")) return prob >= minProb.match;
    if (m.includes("Draw")) return prob >= minProb.draw;
    if (m.includes("1X") || m.includes("X2") || m.includes("12") || m.includes("Double")) return prob >= minProb.doubleChance;
    if (m.includes("Over") || m.includes("Under")) return prob >= minProb.goals;
    if (m.includes("BTTS")) return prob >= minProb.btts;
    if (m.includes("Corner")) return prob >= minProb.corners;
    return prob >= minProb.match;
  };

  // ─── STEP 2: Score by BOTH probability and edge ────────────────────
  // A 65% prob bet with +1% edge >> a 35% bet with +3% edge
  const scored = opportunities
    .filter(opp => opp.bookmakerOdds >= 1.05 && passesMinProb(opp))
    .map(opp => {
      const odds = opp.bookmakerOdds;
      const edge = parseFloat(opp.edge);
      const prob = opp.aiProbability;
      const oddsFit = Math.abs(Math.log(odds) - Math.log(targetPerLeg));
      const inRange = odds >= tolerance.min && odds <= tolerance.max;

      // Probability is now the primary factor in ALL modes
      let score = inRange ? 10 : 0;
      score -= oddsFit * 4;
      score += prob * 0.15;              // Probability always matters
      score += edge * 3;                 // Edge matters too
      if (opp.isValue) score += 4;       // Value bet bonus

      // Risk-level adjustments
      if (riskLevel === "conservative") {
        score += prob * 0.10;            // Extra probability weight
        if (prob >= 60) score += 3;      // Bonus for very likely bets
      }
      if (riskLevel === "aggressive") {
        score += edge * 2;               // Extra edge weight
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
    if (market.includes("Home Win") || market.includes("Away Win") || market.includes("Draw")) return "1X2";
    if (market.includes("Over") || market.includes("Under")) return "OU";
    if (market.includes("BTTS")) return "BTTS";
    if (market.includes("1X") || market.includes("X2") || market.includes("12")) return "DC";
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

  const combinedOdds = selected.reduce((acc, m) => acc * m.bookmakerOdds, 1);
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
    // Target too ambitious
    if (targetOdds > 20) {
      const realisticTarget = Math.round(parseFloat(stake) * Math.min(combinedOdds, 10));
      suggestions.push({
        icon: "⚠️", title: "Target may be too ambitious",
        detail: `€${targetWinnings} from €${stake} needs ${targetOdds.toFixed(0)}x odds. With quality bets, we reached ${combinedOdds}x. Consider a target of €${realisticTarget} or increasing your stake.`,
        action: `try_target_${realisticTarget}`,
      });
    }
    if (targetOdds > 5) {
      const neededStake = Math.ceil(parseFloat(targetWinnings || 500) / Math.max(combinedOdds, 5));
      suggestions.push({
        icon: "💰", title: "Increase your stake",
        detail: `€${neededStake} stake at ${combinedOdds}x odds would return €${Math.round(neededStake * combinedOdds)}.`,
        action: `try_stake_${neededStake}`,
      });
    }
    if (numSelections < maxMatches && numSelections < 6) {
      const moreLegs = Math.min(maxMatches, numSelections + 2);
      suggestions.push({
        icon: "➕", title: "Add more selections",
        detail: `More legs = higher combined odds. With ${moreLegs} selections, each leg needs lower individual odds.`,
        action: `try_legs_${moreLegs}`,
      });
    }
    if (riskLevel === "conservative" && targetPerLeg > 2.0) {
      suggestions.push({
        icon: "⚠️", title: "Risk level mismatch",
        detail: `Your target needs ${targetPerLeg.toFixed(2)}x per leg — that's not conservative. Switch to Balanced or Bold to reach higher odds.`,
      });
    }
  }

  if (slipWinProb < 0.03 && selected.length > 1) {
    suggestions.push({
      icon: "⚠️", title: `Win probability is ${(slipWinProb * 100).toFixed(1)}%`,
      detail: `That's roughly 1 in ${Math.round(1 / Math.max(slipWinProb, 0.001))} chance. Consider fewer legs for better odds of winning.`,
      action: selected.length > 2 ? `try_legs_${selected.length - 1}` : undefined,
    });
  }

  if (targetHit && slipWinProb > 0.05 && avgEdge > 0) {
    suggestions.push({
      icon: "✅", title: "Good setup",
      detail: `Target reached at ${combinedOdds}x. ${selected.filter(m => m.isValue).length} value bets with positive edge. Win probability: ${(slipWinProb * 100).toFixed(1)}%.`,
    });
  }

  if (targetHit && avgEdge > 0 && slipWinProb <= 0.05) {
    suggestions.push({
      icon: "✅", title: "Target reached — but high risk",
      detail: `Odds of ${combinedOdds}x hit your target with ${selected.filter(m => m.isValue).length} value bets, but win probability is only ${(slipWinProb * 100).toFixed(1)}%. Consider this an entertainment bet, not an investment.`,
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
