// src/TeamsPage.jsx
// Browse teams by league. Full statistics for each team.
// Data comes from Supabase team_stats table (populated by team-stats.mjs)

import { useState, useEffect } from "react";
import { supabase } from "./supabase.js";
import { FormPills, FullTeamStats } from "./TeamStatsCard.jsx";

const LEAGUES = [
  { key: "Premier League", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", label: "Premier League" },
  { key: "La Liga", flag: "🇪🇸", label: "La Liga" },
  { key: "Serie A", flag: "🇮🇹", label: "Serie A" },
  { key: "Bundesliga", flag: "🇩🇪", label: "Bundesliga" },
  { key: "Ligue 1", flag: "🇫🇷", label: "Ligue 1" },
  { key: "Eredivisie", flag: "🇳🇱", label: "Eredivisie" },
  { key: "Primeira Liga", flag: "🇵🇹", label: "Primeira Liga" },
  { key: "Super Lig", flag: "🇹🇷", label: "Süper Lig" },
  { key: "Jupiler Pro League", flag: "🇧🇪", label: "Jupiler Pro League" },
  { key: "Champions League", flag: "🏆", label: "Champions League" },
  { key: "Europa League", flag: "🏆", label: "Europa League" },
  { key: "Conference League", flag: "🏆", label: "Conference League" },
];

export default function TeamsPage() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      if (!supabase) { setLoading(false); return; }
      setLoading(true);
      const { data } = await supabase
        .from("team_stats")
        .select("team_name, team_logo, league, league_position, goals_scored_avg, goals_conceded_avg, corners_total_avg, cards_total_match_avg, matches_analyzed, season_wins, season_draws, season_losses, recent_matches")
        .order("league")
        .order("league_position", { ascending: true, nullsFirst: false });
      if (data) setTeams(data);
      setLoading(false);
    }
    load();
  }, []);

  // Filter
  const leagueTeams = selectedLeague
    ? teams.filter(t => t.league === selectedLeague)
    : teams;
  const filtered = search.length >= 2
    ? leagueTeams.filter(t => t.team_name.toLowerCase().includes(search.toLowerCase()))
    : leagueTeams;

  // Available leagues (only show leagues we have data for)
  const availableLeagues = [...new Set(teams.map(t => t.league))];
  const leagueOptions = LEAGUES.filter(l => availableLeagues.includes(l.key));

  // Extract form from recent_matches
  const getForm = (team) => {
    const rm = team.recent_matches;
    if (!rm || !Array.isArray(rm) || rm.length === 0) return [];
    return rm.slice(0, 5).map(m => m.result);
  };

  return (
    <>
      <style>{TEAMS_CSS}</style>

      <div className="tp-hero">
        <div className="tp-badge">📊 Team Statistics</div>
        <h1 className="tp-title">Team Browser</h1>
        <p className="tp-subtitle">
          Full statistics for every team in our system. Goals, corners, cards, form, and
          over/under hit rates — everything a statistical bettor needs.
        </p>
      </div>

      {/* Search */}
      <div className="tp-search">
        <input
          type="text"
          placeholder="Search team name..."
          value={search}
          onChange={e => { setSearch(e.target.value); setSelectedTeam(null); }}
          className="tp-search-input"
        />
      </div>

      {/* League Selector */}
      <div className="tp-leagues">
        <button
          className={`tp-league-btn ${!selectedLeague ? "active" : ""}`}
          onClick={() => { setSelectedLeague(null); setSelectedTeam(null); }}
        >
          All
        </button>
        {leagueOptions.map(l => (
          <button
            key={l.key}
            className={`tp-league-btn ${selectedLeague === l.key ? "active" : ""}`}
            onClick={() => { setSelectedLeague(l.key); setSelectedTeam(null); }}
          >
            {l.flag} {l.label}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>
          <div className="spinner" style={{ margin: "0 auto 12px" }} />
          Loading team data...
        </div>
      )}

      {!loading && teams.length === 0 && (
        <div className="card" style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>No team data yet</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>
            Team statistics are computed in the background and refresh every 6 hours.
            Check back soon — data is being populated now.
          </div>
        </div>
      )}

      {/* Selected Team — Full Stats */}
      {selectedTeam && (
        <div style={{ marginBottom: 16 }}>
          <button
            className="tp-back-btn"
            onClick={() => setSelectedTeam(null)}
          >
            ← Back to teams
          </button>
          <FullTeamStats teamName={selectedTeam} />
        </div>
      )}

      {/* Team Grid */}
      {!selectedTeam && !loading && filtered.length > 0 && (
        <div className="tp-grid">
          {filtered.map(team => {
            const form = getForm(team);
            return (
              <div
                key={team.team_name}
                className="tp-team-card"
                onClick={() => setSelectedTeam(team.team_name)}
              >
                <div className="tp-team-header">
                  {team.team_logo && <img src={team.team_logo} className="tp-team-logo" alt="" />}
                  <div>
                    <div className="tp-team-name">{team.team_name}</div>
                    <div className="tp-team-league">
                      {team.league}
                      {team.league_position && ` · ${team.league_position}${ordSuffix(team.league_position)}`}
                      {team.season_wins > 0 && ` · ${team.season_wins}W ${team.season_draws}D ${team.season_losses}L`}
                    </div>
                  </div>
                </div>
                {form.length > 0 && (
                  <div style={{ margin: "8px 0" }}>
                    <FormPills form={form} size="sm" />
                  </div>
                )}
                <div className="tp-team-stats-row">
                  <div className="tp-mini-stat">
                    <span className="tp-mini-icon">⚽</span>
                    <span>{team.goals_scored_avg} gls</span>
                  </div>
                  <div className="tp-mini-stat">
                    <span className="tp-mini-icon">⛳</span>
                    <span>{team.corners_total_avg} corners</span>
                  </div>
                  <div className="tp-mini-stat">
                    <span className="tp-mini-icon">🟨</span>
                    <span>{team.cards_total_match_avg} cards</span>
                  </div>
                </div>
                <div className="tp-view-more">View full stats →</div>
              </div>
            );
          })}
        </div>
      )}

      {!selectedTeam && !loading && filtered.length === 0 && teams.length > 0 && (
        <div style={{ textAlign: "center", padding: 30, color: "var(--text-muted)", fontSize: 13 }}>
          No teams found{search ? ` matching "${search}"` : " in this league"}.
        </div>
      )}
    </>
  );
}

function ordSuffix(n) {
  if (!n) return "";
  const s = ["th","st","nd","rd"];
  const v = n % 100;
  return s[(v-20)%10]||s[v]||s[0];
}

const TEAMS_CSS = `
  .tp-hero { text-align: center; padding: 8px 0 24px; }
  .tp-badge { display: inline-block; padding: 5px 14px; border-radius: 20px; background: rgba(59,130,246,0.1); border: 1px solid rgba(59,130,246,0.2); color: var(--blue-500); font-size: 12px; font-weight: 600; margin-bottom: 12px; }
  .tp-title { font-size: 28px; font-weight: 700; margin-bottom: 4px; }
  .tp-subtitle { font-size: 13px; color: var(--text-muted); max-width: 560px; margin: 0 auto; line-height: 1.6; }

  .tp-search { margin-bottom: 12px; }
  .tp-search-input {
    width: 100%; padding: 12px 16px; border-radius: 10px;
    background: var(--navy-800); border: 1px solid var(--navy-600);
    color: var(--text-primary); font-family: 'DM Sans', sans-serif;
    font-size: 14px; outline: none; transition: border-color 0.2s;
  }
  .tp-search-input:focus { border-color: var(--gold-500); }
  .tp-search-input::placeholder { color: var(--text-muted); }

  .tp-leagues { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 16px; }
  .tp-league-btn {
    padding: 7px 14px; border-radius: 8px; border: 1px solid var(--navy-600);
    background: var(--navy-800); color: var(--text-secondary);
    font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 500;
    cursor: pointer; transition: all 0.2s;
  }
  .tp-league-btn:hover { border-color: var(--navy-400); }
  .tp-league-btn.active { border-color: var(--gold-500); background: rgba(212,175,55,0.12); color: var(--gold-400); }

  .tp-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 10px;
  }
  .tp-team-card {
    padding: 16px; border-radius: 12px;
    background: var(--glass); border: 1px solid var(--glass-border);
    cursor: pointer; transition: all 0.2s;
  }
  .tp-team-card:hover { border-color: var(--gold-500); transform: translateY(-1px); }

  .tp-team-header { display: flex; align-items: center; gap: 10px; margin-bottom: 4px; }
  .tp-team-logo { width: 32px; height: 32px; object-fit: contain; border-radius: 4px; }
  .tp-team-name { font-size: 15px; font-weight: 700; }
  .tp-team-league { font-size: 11px; color: var(--text-muted); }

  .tp-team-stats-row { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 4px; }
  .tp-mini-stat { font-size: 11px; color: var(--text-secondary); display: flex; align-items: center; gap: 3px; }
  .tp-mini-icon { font-size: 12px; }

  .tp-view-more { font-size: 11px; color: var(--gold-400); font-weight: 500; margin-top: 8px; }

  .tp-back-btn {
    background: none; border: none; color: var(--gold-400); font-family: 'DM Sans', sans-serif;
    font-size: 13px; font-weight: 500; cursor: pointer; padding: 6px 0; margin-bottom: 10px;
  }
  .tp-back-btn:hover { color: var(--gold-300); }

  @media (max-width: 640px) { .tp-grid { grid-template-columns: 1fr; } }
`;
