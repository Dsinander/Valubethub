// src/MatchPreview.jsx
// Detailed match preview page — full analysis for a single fixture.
// Can be opened from league tips, today's tips, or directly.

import { useState, useEffect } from "react";
import { fetchMatchData, generateOpportunities, MARKET_CATEGORIES } from "./api.js";

// ═══════════════════════════════════════════════════════════════════════
// MATCH PREVIEW PAGE
// ═══════════════════════════════════════════════════════════════════════
export default function MatchPreviewPage({ matchTip, allFixtures, onBack }) {
  const [fixtures, setFixtures] = useState(allFixtures || []);
  const [loading, setLoading] = useState(!allFixtures?.length);
  const [selectedFixtureId, setSelectedFixtureId] = useState(matchTip?.fixtureId || null);
  const [opportunities, setOpportunities] = useState([]);

  useEffect(() => {
    if (fixtures.length > 0) {
      const allMarkets = new Set(Object.values(MARKET_CATEGORIES).flatMap(c => c.markets));
      const opps = generateOpportunities(fixtures, allMarkets);
      setOpportunities(opps);
      return;
    }
    async function load() {
      setLoading(true);
      const result = await fetchMatchData();
      if (result.success && result.fixtures?.length) {
        setFixtures(result.fixtures);
        const allMarkets = new Set(Object.values(MARKET_CATEGORIES).flatMap(c => c.markets));
        setOpportunities(generateOpportunities(result.fixtures, allMarkets));
      }
      setLoading(false);
    }
    load();
  }, []);

  // Get the fixture data
  const fixture = fixtures.find(f => f.id === selectedFixtureId) || (matchTip ? fixtures.find(f => f.home === matchTip.home && f.away === matchTip.away) : null);

  // Get all market opportunities for this match
  const matchOpps = fixture ? opportunities.filter(o => o.fixtureId === fixture.id || (o.home === fixture.home && o.away === fixture.away)).sort((a, b) => parseFloat(b.edge) - parseFloat(a.edge)) : [];

  // Get context insights from first opportunity
  const insights = matchOpps[0]?.analysis?.contextInsights || [];

  // Available matches for selector
  const availableMatches = fixtures.filter(f => f.odds && Object.keys(f.odds).length > 0);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>
        <div className="spinner" style={{ margin: "0 auto 12px" }} />
        Loading match data...
      </div>
    );
  }

  return (
    <>
      <style>{PREVIEW_CSS}</style>

      <div className="mp-hero">
        <div className="mp-badge">📋 Match Preview</div>
        <h1 className="mp-title">Match Previews</h1>
        <p className="mp-subtitle">In-depth AI analysis for every fixture — form, H2H, odds comparison, and value opportunities.</p>
      </div>

      {/* Match Selector */}
      <div className="mp-selector">
        <div className="mp-selector-label">Select a match</div>
        <div className="mp-match-grid">
          {availableMatches.map(f => (
            <button
              key={f.id}
              className={`mp-match-btn ${fixture?.id === f.id ? "active" : ""}`}
              onClick={() => setSelectedFixtureId(f.id)}
            >
              <div className="mp-match-btn-teams">{f.homeLogo && <img src={f.homeLogo} style={{ width: 16, height: 16, objectFit: "contain", verticalAlign: "middle", marginRight: 4, borderRadius: 2 }} alt="" />}{f.home} vs {f.away}{f.awayLogo && <img src={f.awayLogo} style={{ width: 16, height: 16, objectFit: "contain", verticalAlign: "middle", marginLeft: 4, borderRadius: 2 }} alt="" />}</div>
              <div className="mp-match-btn-meta">{f.leagueFlag} {f.league} · {f.day} {f.time}</div>
            </button>
          ))}
          {availableMatches.length === 0 && (
            <div style={{ padding: 20, color: "var(--text-muted)", fontSize: 13 }}>
              No matches with odds available right now.
            </div>
          )}
        </div>
      </div>

      {/* Match Preview Content */}
      {fixture && (
        <div className="mp-content" key={fixture.id}>
          {/* Match Header */}
          <div className="mp-match-header">
            <div className="mp-team">
              <div className="mp-team-name">{fixture.homeLogo && <img src={fixture.homeLogo} style={{ width: 28, height: 28, objectFit: "contain", verticalAlign: "middle", marginRight: 8, borderRadius: 3 }} alt="" />}{fixture.home}</div>
              <div className="mp-team-form">
                {(fixture.homeForm || []).map((r, i) => (
                  <span key={i} className={`form-pill pill-${r}`}>{r}</span>
                ))}
              </div>
            </div>
            <div className="mp-vs-block">
              <div className="mp-vs">VS</div>
              <div className="mp-match-info">{fixture.leagueFlag} {fixture.league}</div>
              <div className="mp-match-info">{fixture.day} · {fixture.time}</div>
              <div className="mp-match-date">{fixture.date}</div>
            </div>
            <div className="mp-team" style={{ textAlign: "right" }}>
              <div className="mp-team-name">{fixture.away}{fixture.awayLogo && <img src={fixture.awayLogo} style={{ width: 28, height: 28, objectFit: "contain", verticalAlign: "middle", marginLeft: 8, borderRadius: 3 }} alt="" />}</div>
              <div className="mp-team-form" style={{ justifyContent: "flex-end" }}>
                {(fixture.awayForm || []).map((r, i) => (
                  <span key={i} className={`form-pill pill-${r}`}>{r}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Prediction Summary */}
          {fixture.prediction?.advice && (
            <div className="mp-prediction">
              <div className="mp-pred-label">AI Prediction</div>
              <div className="mp-pred-text">{fixture.prediction.advice}</div>
              <div className="mp-pred-probs">
                <div className="mp-pred-item">
                  <div className="mp-pred-pct" style={{ color: "var(--green-400)" }}>{fixture.prediction.homeWinPct}%</div>
                  <div className="mp-pred-name">Home</div>
                </div>
                <div className="mp-pred-item">
                  <div className="mp-pred-pct" style={{ color: "var(--text-muted)" }}>{fixture.prediction.drawPct}%</div>
                  <div className="mp-pred-name">Draw</div>
                </div>
                <div className="mp-pred-item">
                  <div className="mp-pred-pct" style={{ color: "var(--blue-500)" }}>{fixture.prediction.awayWinPct}%</div>
                  <div className="mp-pred-name">Away</div>
                </div>
              </div>
            </div>
          )}

          {/* Stats Grid */}
          <div className="mp-stats-grid">
            <div className="mp-stat-card">
              <div className="mp-stat-title">Goals Scored (avg)</div>
              <div className="mp-stat-row">
                <span>{fixture.home}</span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", color: "var(--green-400)" }}>{fixture.homeXGFor || "—"}</span>
              </div>
              <div className="mp-stat-row">
                <span>{fixture.away}</span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", color: "var(--green-400)" }}>{fixture.awayXGFor || "—"}</span>
              </div>
            </div>
            <div className="mp-stat-card">
              <div className="mp-stat-title">Goals Conceded (avg)</div>
              <div className="mp-stat-row">
                <span>{fixture.home}</span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", color: "var(--red-400)" }}>{fixture.homeXGAgainst || "—"}</span>
              </div>
              <div className="mp-stat-row">
                <span>{fixture.away}</span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", color: "var(--red-400)" }}>{fixture.awayXGAgainst || "—"}</span>
              </div>
            </div>
            <div className="mp-stat-card">
              <div className="mp-stat-title">Home Record</div>
              <div className="mp-stat-row">
                <span>{fixture.home}</span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace" }}>{fixture.homeRecord?.w || 0}W {fixture.homeRecord?.d || 0}D {fixture.homeRecord?.l || 0}L</span>
              </div>
            </div>
            <div className="mp-stat-card">
              <div className="mp-stat-title">Away Record</div>
              <div className="mp-stat-row">
                <span>{fixture.away}</span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace" }}>{fixture.awayRecord?.w || 0}W {fixture.awayRecord?.d || 0}D {fixture.awayRecord?.l || 0}L</span>
              </div>
            </div>
          </div>

          {/* H2H */}
          {fixture.h2h?.last5?.length > 0 && (
            <div className="mp-section">
              <div className="mp-section-title">Head to Head</div>
              <div className="mp-h2h-summary">
                <span style={{ color: "var(--green-400)" }}>{fixture.home}: {fixture.h2h.homeWins}W</span>
                <span style={{ color: "var(--text-muted)" }}>Draws: {fixture.h2h.draws}</span>
                <span style={{ color: "var(--blue-500)" }}>{fixture.away}: {fixture.h2h.awayWins}W</span>
                <span style={{ color: "var(--text-muted)" }}>Avg goals: {fixture.h2h.avgGoals}</span>
              </div>
              {fixture.h2h.last5.map((m, i) => (
                <div key={i} className="mp-h2h-row">{m.home} <strong>{m.score}</strong> {m.away} <span className="mp-h2h-date">{m.date}</span></div>
              ))}
            </div>
          )}

          {/* Injuries */}
          {(fixture.homeInjuries?.length > 0 || fixture.awayInjuries?.length > 0) && (
            <div className="mp-section">
              <div className="mp-section-title">Injuries & Absences</div>
              {fixture.homeInjuries?.map((inj, i) => (
                <div key={`hi${i}`} className="mp-inj">{inj.status === 'out' ? '🔴' : '🟡'} <strong>{fixture.home}</strong> — {inj.player} — {inj.status} ({inj.returnDate})</div>
              ))}
              {fixture.awayInjuries?.map((inj, i) => (
                <div key={`ai${i}`} className="mp-inj">{inj.status === 'out' ? '🔴' : '🟡'} <strong>{fixture.away}</strong> — {inj.player} — {inj.status} ({inj.returnDate})</div>
              ))}
              {fixture.homeInjuries?.length === 0 && fixture.awayInjuries?.length === 0 && (
                <div style={{ fontSize: 13, color: "var(--text-muted)" }}>No injury data available for this fixture.</div>
              )}
            </div>
          )}

          {/* AI Insights */}
          {insights.length > 0 && (
            <div className="mp-section">
              <div className="mp-section-title">🧠 AI Analysis</div>
              {insights.map((insight, i) => {
                const bgColor = insight.impact?.includes("positive") ? "rgba(34,197,94,0.06)" : insight.impact?.includes("negative") ? "rgba(239,68,68,0.06)" : insight.impact?.includes("high_scoring") ? "rgba(245,158,11,0.06)" : insight.impact?.includes("low_scoring") ? "rgba(59,130,246,0.06)" : "rgba(148,163,184,0.06)";
                const borderColor = insight.impact?.includes("positive") ? "rgba(34,197,94,0.12)" : insight.impact?.includes("negative") ? "rgba(239,68,68,0.12)" : insight.impact?.includes("high_scoring") ? "rgba(245,158,11,0.12)" : insight.impact?.includes("low_scoring") ? "rgba(59,130,246,0.12)" : "rgba(148,163,184,0.12)";
                return (
                  <div key={i} style={{ padding: "10px 12px", borderRadius: 10, background: bgColor, border: `1px solid ${borderColor}`, marginBottom: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 3 }}>{insight.icon} {insight.title}</div>
                    <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text-secondary)" }}>{insight.detail}</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* All Markets */}
          {matchOpps.length > 0 && (
            <div className="mp-section">
              <div className="mp-section-title">All Markets — Odds & Value</div>
              <div className="mp-markets-table">
                <div className="mp-market-header">
                  <span>Market</span><span>Odds</span><span>AI Prob</span><span>Book Prob</span><span>Edge</span>
                </div>
                {matchOpps.map(opp => {
                  const edge = parseFloat(opp.edge);
                  return (
                    <div key={opp.id} className={`mp-market-row ${edge > 0 ? "value" : ""}`}>
                      <span className="mp-market-name">{opp.market}</span>
                      <span className="mp-market-odds">{opp.bookmakerOdds}</span>
                      <span style={{ color: "var(--green-400)" }}>{opp.aiProbability}%</span>
                      <span>{opp.impliedProbability}%</span>
                      <span style={{ color: edge > 0 ? "var(--green-400)" : "var(--red-400)", fontWeight: 600 }}>
                        {edge > 0 ? "+" : ""}{edge.toFixed(1)}%
                      </span>
                    </div>
                  );
                })}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>
                Green highlighted rows indicate positive edge (value bets). Odds sourced from bookmakers.
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <div className="mp-disclaimer">
            This preview is generated by AI statistical analysis and is for informational purposes only.
            Always do your own research and bet responsibly. 18+ only.
          </div>
        </div>
      )}
    </>
  );
}

const PREVIEW_CSS = `
  .mp-hero { text-align: center; padding: 8px 0 24px; }
  .mp-badge { display: inline-block; padding: 5px 14px; border-radius: 20px; background: rgba(59,130,246,0.1); border: 1px solid rgba(59,130,246,0.2); color: var(--blue-500); font-size: 12px; font-weight: 600; margin-bottom: 12px; }
  .mp-title { font-size: 28px; font-weight: 700; margin-bottom: 4px; }
  .mp-subtitle { font-size: 13px; color: var(--text-muted); max-width: 500px; margin: 0 auto; line-height: 1.6; }

  .mp-selector { margin-bottom: 20px; }
  .mp-selector-label { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: var(--gold-500); margin-bottom: 10px; }
  .mp-match-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 8px; max-height: 300px; overflow-y: auto; padding-right: 4px; }
  .mp-match-btn { text-align: left; padding: 12px 14px; border-radius: 10px; border: 1px solid var(--navy-600); background: var(--navy-800); cursor: pointer; transition: all 0.2s; font-family: 'DM Sans', sans-serif; }
  .mp-match-btn:hover { border-color: var(--navy-400); }
  .mp-match-btn.active { border-color: var(--gold-500); background: rgba(212,175,55,0.08); }
  .mp-match-btn-teams { font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 2px; }
  .mp-match-btn-meta { font-size: 11px; color: var(--text-muted); }

  .mp-content { animation: slideIn 0.3s ease; }

  /* Match Header */
  .mp-match-header { display: flex; justify-content: space-between; align-items: center; padding: 24px; border-radius: 16px; background: var(--glass); border: 1px solid var(--glass-border); margin-bottom: 16px; gap: 16px; flex-wrap: wrap; }
  .mp-team { flex: 1; min-width: 120px; }
  .mp-team-name { font-size: 20px; font-weight: 700; margin-bottom: 6px; }
  .mp-team-form { display: flex; gap: 3px; }
  .mp-vs-block { text-align: center; min-width: 100px; }
  .mp-vs { font-size: 18px; font-weight: 700; color: var(--text-muted); margin-bottom: 4px; }
  .mp-match-info { font-size: 12px; color: var(--text-muted); }
  .mp-match-date { font-size: 11px; color: var(--text-muted); font-family: 'JetBrains Mono', monospace; margin-top: 2px; }

  /* Prediction */
  .mp-prediction { padding: 18px; border-radius: 14px; background: linear-gradient(135deg, rgba(212,175,55,0.06), rgba(212,175,55,0.01)); border: 1px solid rgba(212,175,55,0.15); margin-bottom: 16px; }
  .mp-pred-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: var(--gold-500); font-weight: 600; margin-bottom: 6px; }
  .mp-pred-text { font-size: 15px; font-weight: 600; color: var(--text-primary); margin-bottom: 12px; }
  .mp-pred-probs { display: flex; gap: 24px; }
  .mp-pred-item { text-align: center; }
  .mp-pred-pct { font-family: 'JetBrains Mono', monospace; font-size: 22px; font-weight: 700; }
  .mp-pred-name { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }

  /* Stats */
  .mp-stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin-bottom: 16px; }
  .mp-stat-card { padding: 14px; border-radius: 12px; background: var(--glass); border: 1px solid var(--glass-border); }
  .mp-stat-title { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: var(--gold-500); font-weight: 600; margin-bottom: 8px; }
  .mp-stat-row { display: flex; justify-content: space-between; font-size: 13px; color: var(--text-secondary); padding: 3px 0; }

  /* Sections */
  .mp-section { padding: 18px; border-radius: 14px; background: var(--glass); border: 1px solid var(--glass-border); margin-bottom: 12px; }
  .mp-section-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--gold-500); margin-bottom: 12px; }

  .mp-h2h-summary { display: flex; gap: 16px; font-size: 13px; margin-bottom: 10px; flex-wrap: wrap; }
  .mp-h2h-row { font-size: 13px; color: var(--text-secondary); padding: 4px 0; }
  .mp-h2h-date { font-size: 11px; color: var(--text-muted); margin-left: 8px; }

  .mp-inj { font-size: 13px; color: var(--text-secondary); padding: 3px 0; }
  .mp-inj strong { color: var(--text-primary); }

  /* Markets Table */
  .mp-markets-table { font-size: 13px; }
  .mp-market-header { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 1fr; gap: 8px; padding: 8px 10px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); border-bottom: 1px solid var(--navy-700); }
  .mp-market-row { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 1fr; gap: 8px; padding: 8px 10px; border-radius: 6px; color: var(--text-secondary); font-family: 'JetBrains Mono', monospace; font-size: 12px; }
  .mp-market-row.value { background: rgba(34,197,94,0.04); }
  .mp-market-name { font-family: 'DM Sans', sans-serif; font-weight: 500; color: var(--text-primary); }
  .mp-market-odds { font-weight: 700; color: var(--text-primary); }
  @media(max-width: 560px) {
    .mp-market-header, .mp-market-row { grid-template-columns: 2fr 1fr 1fr; }
    .mp-market-header span:nth-child(4), .mp-market-header span:nth-child(5),
    .mp-market-row span:nth-child(4), .mp-market-row span:nth-child(5) { display: none; }
  }

  .mp-disclaimer { text-align: center; padding: 16px; font-size: 12px; color: var(--text-muted); line-height: 1.6; margin-top: 8px; }
`;
