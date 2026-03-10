// netlify/functions/team-stats.mjs
// Background enrichment: fetches last 5 match statistics per team
// Runs every 6 hours via Netlify Scheduled Functions
// Stores computed averages in Supabase for fast frontend access

const API_BASE = "https://v3.football.api-sports.io";
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const API_KEY = process.env.API_FOOTBALL_KEY;

// Supported leagues (same as get-data.mjs)
const LEAGUE_IDS = {
  39: "Premier League", 140: "La Liga", 135: "Serie A",
  78: "Bundesliga", 61: "Ligue 1", 88: "Eredivisie",
  94: "Primeira Liga", 203: "Super Lig", 144: "Jupiler Pro League",
  2: "Champions League", 3: "Europa League", 848: "Conference League",
};

async function apiFetch(endpoint) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { "x-apisports-key": API_KEY },
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  const json = await res.json();
  return json.response || [];
}

async function supabaseUpsert(data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/team_stats`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "resolution=merge-duplicates",
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error("Supabase upsert error:", text);
  }
}

function safeNum(val) {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

async function processTeam(teamId, teamName, teamLogo, leagueId, leagueName, leagueLogo) {
  try {
    // Fetch last 5 finished fixtures for this team
    const fixtures = await apiFetch(
      `/fixtures?team=${teamId}&last=5&status=FT-AET-PEN`
    );

    if (!fixtures.length) return null;

    // Fetch statistics for each fixture
    const matchDetails = [];
    let totalGoalsFor = 0, totalGoalsAgainst = 0;
    let totalCornersFor = 0, totalCornersAgainst = 0;
    let totalYellow = 0, totalRed = 0, totalCardsMatch = 0;
    let totalFoulsFor = 0, totalFoulsAgainst = 0;
    let totalShots = 0, totalShotsOnTarget = 0;
    let totalPossession = 0, totalOffsides = 0;
    let cleanSheets = 0;
    let over05 = 0, over15 = 0, over25 = 0, over35 = 0, bttsYes = 0;
    let over75c = 0, over85c = 0, over95c = 0, over105c = 0;
    let over25cards = 0, over35cards = 0, over45cards = 0;

    // Process in batches of 3 to avoid rate limits
    for (let i = 0; i < fixtures.length; i += 3) {
      const batch = fixtures.slice(i, i + 3);
      const statsResults = await Promise.all(
        batch.map(fix => apiFetch(`/fixtures/statistics?fixture=${fix.fixture.id}`).catch(() => []))
      );

      for (let j = 0; j < batch.length; j++) {
        const fix = batch[j];
        const allStats = statsResults[j];
        
        const isHome = fix.teams.home.id === teamId;
        const homeGoals = fix.goals.home || 0;
        const awayGoals = fix.goals.away || 0;
        const goalsFor = isHome ? homeGoals : awayGoals;
        const goalsAgainst = isHome ? awayGoals : homeGoals;
        const won = goalsFor > goalsAgainst;
        const drew = goalsFor === goalsAgainst;
        const totalMatchGoals = homeGoals + awayGoals;

        // Find our team's stats and opponent's stats
        const teamStats = allStats.find(s => s.team?.id === teamId);
        const oppStats = allStats.find(s => s.team?.id !== teamId);

        const getStat = (stats, name) => {
          if (!stats?.statistics) return 0;
          const found = stats.statistics.find(s => s.type === name);
          if (!found) return 0;
          const val = found.value;
          if (typeof val === "string" && val.includes("%")) return parseFloat(val) || 0;
          return safeNum(val);
        };

        const cornersFor = getStat(teamStats, "Corner Kicks");
        const cornersAgainst = getStat(oppStats, "Corner Kicks");
        const totalCorners = cornersFor + cornersAgainst;
        const yellowCards = getStat(teamStats, "Yellow Cards");
        const redCards = getStat(teamStats, "Red Cards");
        const oppYellow = getStat(oppStats, "Yellow Cards");
        const oppRed = getStat(oppStats, "Red Cards");
        const matchCards = yellowCards + redCards + oppYellow + oppRed;
        const foulsFor = getStat(teamStats, "Fouls");
        const foulsAgainst = getStat(oppStats, "Fouls");
        const shots = getStat(teamStats, "Total Shots");
        const shotsOnTarget = getStat(teamStats, "Shots on Goal");
        const possession = getStat(teamStats, "Ball Possession");
        const offsides = getStat(teamStats, "Offsides");

        // Accumulate
        totalGoalsFor += goalsFor;
        totalGoalsAgainst += goalsAgainst;
        totalCornersFor += cornersFor;
        totalCornersAgainst += cornersAgainst;
        totalYellow += yellowCards;
        totalRed += redCards;
        totalCardsMatch += matchCards;
        totalFoulsFor += foulsFor;
        totalFoulsAgainst += foulsAgainst;
        totalShots += shots;
        totalShotsOnTarget += shotsOnTarget;
        totalPossession += possession;
        totalOffsides += offsides;

        if (goalsAgainst === 0) cleanSheets++;

        // Over/Under tallies
        if (totalMatchGoals > 0.5) over05++;
        if (totalMatchGoals > 1.5) over15++;
        if (totalMatchGoals > 2.5) over25++;
        if (totalMatchGoals > 3.5) over35++;
        if (homeGoals > 0 && awayGoals > 0) bttsYes++;
        if (totalCorners > 7.5) over75c++;
        if (totalCorners > 8.5) over85c++;
        if (totalCorners > 9.5) over95c++;
        if (totalCorners > 10.5) over105c++;
        if (matchCards > 2.5) over25cards++;
        if (matchCards > 3.5) over35cards++;
        if (matchCards > 4.5) over45cards++;

        matchDetails.push({
          fixture_id: fix.fixture.id,
          date: fix.fixture.date?.split("T")[0],
          home: fix.teams.home.name,
          away: fix.teams.away.name,
          score: `${homeGoals}-${awayGoals}`,
          result: won ? "W" : drew ? "D" : "L",
          is_home: isHome,
          goals_for: goalsFor,
          goals_against: goalsAgainst,
          corners_for: cornersFor,
          corners_against: cornersAgainst,
          corners_total: totalCorners,
          yellow_cards: yellowCards,
          red_cards: redCards,
          match_cards: matchCards,
          fouls: foulsFor,
          shots: shots,
          shots_on_target: shotsOnTarget,
          possession: possession,
        });
      }
    }

    const n = fixtures.length;

    // Fetch season standings for league position
    let leaguePosition = null;
    let seasonW = 0, seasonD = 0, seasonL = 0, seasonGF = 0, seasonGA = 0, seasonP = 0;
    try {
      if (leagueId && !([2, 3, 848].includes(leagueId))) {
        const standings = await apiFetch(`/standings?league=${leagueId}&season=2025&team=${teamId}`);
        const teamStanding = standings[0]?.league?.standings?.[0]?.find(s => s.team?.id === teamId);
        if (teamStanding) {
          leaguePosition = teamStanding.rank;
          seasonW = teamStanding.all?.win || 0;
          seasonD = teamStanding.all?.draw || 0;
          seasonL = teamStanding.all?.lose || 0;
          seasonGF = teamStanding.all?.goals?.for || 0;
          seasonGA = teamStanding.all?.goals?.against || 0;
          seasonP = teamStanding.all?.played || 0;
        }
      }
    } catch (e) {
      // standings not critical
    }

    return {
      team_id: teamId,
      team_name: teamName,
      team_logo: teamLogo,
      league: leagueName,
      league_id: leagueId,
      league_logo: leagueLogo,
      season: 2025,
      matches_analyzed: n,
      goals_scored_avg: +(totalGoalsFor / n).toFixed(2),
      goals_conceded_avg: +(totalGoalsAgainst / n).toFixed(2),
      corners_for_avg: +(totalCornersFor / n).toFixed(1),
      corners_against_avg: +(totalCornersAgainst / n).toFixed(1),
      corners_total_avg: +((totalCornersFor + totalCornersAgainst) / n).toFixed(1),
      cards_yellow_avg: +(totalYellow / n).toFixed(1),
      cards_red_avg: +(totalRed / n).toFixed(2),
      cards_total_match_avg: +(totalCardsMatch / n).toFixed(1),
      fouls_committed_avg: +(totalFoulsFor / n).toFixed(1),
      fouls_drawn_avg: +(totalFoulsAgainst / n).toFixed(1),
      shots_total_avg: +(totalShots / n).toFixed(1),
      shots_on_target_avg: +(totalShotsOnTarget / n).toFixed(1),
      possession_avg: +(totalPossession / n).toFixed(1),
      offsides_avg: +(totalOffsides / n).toFixed(1),
      clean_sheets: cleanSheets,
      over_05_goals: over05,
      over_15_goals: over15,
      over_25_goals: over25,
      over_35_goals: over35,
      btts_yes: bttsYes,
      over_75_corners: over75c,
      over_85_corners: over85c,
      over_95_corners: over95c,
      over_105_corners: over105c,
      over_25_cards: over25cards,
      over_35_cards: over35cards,
      over_45_cards: over45cards,
      recent_matches: matchDetails,
      season_played: seasonP,
      season_wins: seasonW,
      season_draws: seasonD,
      season_losses: seasonL,
      season_goals_for: seasonGF,
      season_goals_against: seasonGA,
      league_position: leaguePosition,
      updated_at: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`Error processing team ${teamName}:`, error.message);
    return null;
  }
}

export default async (req) => {
  const headers = { "Content-Type": "application/json" };

  try {
    // Get all teams from current fixtures (via our own API)
    const dataRes = await fetch("https://valuebethub.com/api/get-data");
    const data = await dataRes.json();

    if (!data.success || !data.fixtures?.length) {
      return new Response(JSON.stringify({ success: false, error: "No fixtures" }), { headers });
    }

    // Build unique team list
    const teams = new Map();
    data.fixtures.forEach(fix => {
      // Find domestic league for each team
      const leagueId = Object.entries(LEAGUE_IDS).find(([, name]) => name === fix.league)?.[0];
      
      if (!teams.has(fix.home)) {
        teams.set(fix.home, {
          name: fix.home,
          logo: fix.homeLogo,
          league: fix.league,
          leagueId: leagueId ? parseInt(leagueId) : null,
          leagueLogo: fix.leagueLogo,
        });
      }
      if (!teams.has(fix.away)) {
        teams.set(fix.away, {
          name: fix.away,
          logo: fix.awayLogo,
          league: fix.league,
          leagueId: leagueId ? parseInt(leagueId) : null,
          leagueLogo: fix.leagueLogo,
        });
      }
    });

    // We need team IDs — extract from fixture data
    // API-Football fixture data has team IDs in the URL pattern
    const teamList = [];
    const seenIds = new Set();
    
    // Fetch one day of raw fixtures to get team IDs
    const today = new Date().toISOString().split("T")[0];
    for (const leagueId of Object.keys(LEAGUE_IDS)) {
      try {
        const fixtures = await apiFetch(`/fixtures?league=${leagueId}&season=2025&from=${today}&to=${new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]}`);
        fixtures.forEach(fix => {
          const homeTeam = fix.teams?.home;
          const awayTeam = fix.teams?.away;
          if (homeTeam && !seenIds.has(homeTeam.id)) {
            seenIds.add(homeTeam.id);
            const info = teams.get(homeTeam.name);
            teamList.push({
              id: homeTeam.id,
              name: homeTeam.name,
              logo: homeTeam.logo,
              league: info?.league || LEAGUE_IDS[fix.league?.id] || "Unknown",
              leagueId: fix.league?.id || parseInt(leagueId),
              leagueLogo: fix.league?.logo || info?.leagueLogo,
            });
          }
          if (awayTeam && !seenIds.has(awayTeam.id)) {
            seenIds.add(awayTeam.id);
            const info = teams.get(awayTeam.name);
            teamList.push({
              id: awayTeam.id,
              name: awayTeam.name,
              logo: awayTeam.logo,
              league: info?.league || LEAGUE_IDS[fix.league?.id] || "Unknown",
              leagueId: fix.league?.id || parseInt(leagueId),
              leagueLogo: fix.league?.logo || info?.leagueLogo,
            });
          }
        });
      } catch (e) {
        console.error(`Failed to fetch fixtures for league ${leagueId}:`, e.message);
      }
    }

    console.log(`Found ${teamList.length} unique teams to process`);

    // Process in batches of 3 teams (each team = ~6 API calls)
    let processed = 0;
    const startTime = Date.now();

    for (let i = 0; i < teamList.length; i += 3) {
      // Time guard: stop after 20 seconds to stay within Netlify limits
      if (Date.now() - startTime > 20000) {
        console.log(`Time guard: processed ${processed}/${teamList.length} teams`);
        break;
      }

      const batch = teamList.slice(i, i + 3);
      const results = await Promise.all(
        batch.map(t => processTeam(t.id, t.name, t.logo, t.leagueId, t.league, t.leagueLogo))
      );

      // Upsert results to Supabase
      const valid = results.filter(Boolean);
      if (valid.length > 0) {
        await supabaseUpsert(valid);
        processed += valid.length;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      teams_processed: processed,
      total_teams: teamList.length,
      duration: `${((Date.now() - startTime) / 1000).toFixed(1)}s`,
    }), { headers });

  } catch (error) {
    console.error("team-stats error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), { status: 500, headers });
  }
};

export const config = {
  // Run every 6 hours
  schedule: "0 */6 * * *",
};
