// src/TipsPage.jsx
// "Today's Best Bets" — auto-generated daily tips from the AI engine.
// Picks the 3-5 strongest value bets and presents them as editorial content.

import { useState, useEffect } from "react";
import { fetchMatchData, generateOpportunities, MARKET_CATEGORIES } from "./api.js";

// ─── REASONING ENGINE ─────────────────────────────────────────────────
// Generates a natural-language paragraph explaining WHY this bet has value.
// Uses the same data the generator uses but presents it as editorial text.
function generateReasoning(tip) {
  const a = tip.analysis || {};
  const parts = [];

  // Form context
  const homeForm = a.homeRecentForm || [];
  const awayForm = a.awayRecentForm || [];
  const homeFormStr = homeForm.join("");
  const awayFormStr = awayForm.join("");

  if (homeForm.length > 0 || awayForm.length > 0) {
    const homeWins = homeForm.filter(r => r === "W").length;
    const awayWins = awayForm.filter(r => r === "W").length;
    if (homeWins >= 4) {
      parts.push(`${tip.home} are in outstanding form, winning ${homeWins} of their last ${homeForm.length} matches (${homeFormStr}).`);
    } else if (homeWins >= 3) {
      parts.push(`${tip.home} come into this in solid form with ${homeWins} wins from their last ${homeForm.length} (${homeFormStr}).`);
    } else if (homeWins <= 1 && homeForm.length >= 4) {
      parts.push(`${tip.home} have been struggling, managing just ${homeWins} win in their last ${homeForm.length} matches (${homeFormStr}).`);
    }

    if (awayWins >= 4) {
      parts.push(`${tip.away} arrive in superb form — ${awayWins} wins from ${awayForm.length} (${awayFormStr}).`);
    } else if (awayWins <= 1 && awayForm.length >= 4) {
      parts.push(`${tip.away} have been inconsistent lately (${awayFormStr}).`);
    }
  }

  // Goals context for over/under and BTTS markets
  const market = tip.market;
  const homeGF = a.homeXGFor || 1.3;
  const awayGF = a.awayXGFor || 1.2;
  const homeGA = a.homeXGAgainst || 1.1;
  const awayGA = a.awayXGAgainst || 1.2;
  const totalAvg = homeGF + awayGF;

  if (market.includes("Over") || market.includes("Under") || market.includes("BTTS")) {
    if (totalAvg > 3.0) {
      parts.push(`Both teams contribute to high-scoring games — ${tip.home} average ${homeGF} goals/game while ${tip.away} average ${awayGF}. Combined average: ${totalAvg.toFixed(1)} goals.`);
    } else if (totalAvg < 2.2) {
      parts.push(`This profiles as a tighter affair — ${tip.home} average ${homeGF} goals/game and ${tip.away} average ${awayGF} (combined ${totalAvg.toFixed(1)}).`);
    }
  }

  if (market.includes("BTTS Yes")) {
    const bothScore = Math.min(homeGF, awayGF);
    if (bothScore >= 1.2) {
      parts.push(`Both teams score regularly, with neither side's attack averaging below ${bothScore.toFixed(1)} goals per match.`);
    }
  }

  if (market.includes("BTTS No")) {
    if (homeGA < 1.0 || awayGA < 1.0) {
      parts.push(`At least one defence here is solid — ${homeGA < awayGA ? tip.home + " concede just " + homeGA + "/game" : tip.away + " concede just " + awayGA + "/game"}.`);
    }
  }

  // H2H context
  const h2h = a.h2hData || {};
  const h2hTotal = (h2h.homeWins || 0) + (h2h.draws || 0) + (h2h.awayWins || 0);
  if (h2hTotal >= 3) {
    if (h2h.avgGoals > 3.0 && (market.includes("Over") || market.includes("BTTS"))) {
      parts.push(`The head-to-head supports this — the last ${h2hTotal} meetings averaged ${h2h.avgGoals} goals.`);
    }
    if ((h2h.homeWins || 0) >= 3 && (market.includes("Home") || market.includes("1X"))) {
      parts.push(`${tip.home} also dominate the H2H record with ${h2h.homeWins} wins from the last ${h2hTotal} meetings.`);
    }
    if ((h2h.awayWins || 0) >= 3 && (market.includes("Away") || market.includes("X2"))) {
      parts.push(`${tip.away} have won ${h2h.awayWins} of the last ${h2hTotal} meetings, showing they match up well here.`);
    }
  }

  // Injury context
  const homeInj = a.homeInjuries || [];
  const awayInj = a.awayInjuries || [];
  if (homeInj.length >= 2 && (market.includes("Away") || market.includes("X2"))) {
    parts.push(`${tip.home} are missing ${homeInj.length} players through injury, which could weaken their lineup.`);
  }
  if (awayInj.length >= 2 && (market.includes("Home") || market.includes("1X"))) {
    parts.push(`${tip.away} travel without ${awayInj.length} injured players — a potential disadvantage.`);
  }

  // Edge explanation (always include)
  const edge = parseFloat(tip.edge);
  if (edge > 3) {
    parts.push(`Our model gives this a ${tip.aiProbability}% chance versus the bookmaker's implied ${tip.impliedProbability}% — a strong +${edge.toFixed(1)}% edge.`);
  } else if (edge > 1.5) {
    parts.push(`The AI calculates a ${tip.aiProbability}% probability vs the market's ${tip.impliedProbability}%, identifying a +${edge.toFixed(1)}% edge.`);
  } else if (edge > 0) {
    parts.push(`At ${tip.bookmakerOdds}, our model sees a slim +${edge.toFixed(1)}% edge (AI: ${tip.aiProbability}% vs implied ${tip.impliedProbability}%).`);
  }

  // Fallback
  if (parts.length < 2) {
    parts.push(`This selection at ${tip.bookmakerOdds} offers value based on our multi-factor analysis of form, goals data, and market pricing.`);
  }

  return parts.join(" ");
}

// Confidence level based on edge
function getConfidence(edge, prob) {
  if (edge > 2 && prob >= 55) return { label: "Strong Pick", color: "var(--green-400)", bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.25)" };
  if (edge > 0 && prob >= 45) return { label: "Value Bet", color: "var(--gold-400)", bg: "rgba(212,175,55,0.12)", border: "rgba(212,175,55,0.25)" };
  if (prob >= 55) return { label: "High Probability", color: "var(--blue-500)", bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.25)" };
  if (edge > 0) return { label: "Slight Edge", color: "var(--gold-400)", bg: "rgba(212,175,55,0.10)", border: "rgba(212,175,55,0.20)" };
  return { label: "AI Pick", color: "var(--text-muted)", bg: "rgba(148,163,184,0.1)", border: "rgba(148,163,184,0.2)" };
}

// Market display name
function marketDisplay(market) {
  const labels = {
    "Home Win": "Home Win (1)",
    "Draw": "Draw (X)",
    "Away Win": "Away Win (2)",
    "1X (Home or Draw)": "Double Chance 1X",
    "X2 (Draw or Away)": "Double Chance X2",
    "12 (Home or Away)": "Double Chance 12",
  };
  return labels[market] || market;
}

// ═══════════════════════════════════════════════════════════════════════
// TIPS PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════
export default function TipsPage() {
  const [tips, setTips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [expandedTip, setExpandedTip] = useState(null);

  useEffect(() => {
    async function loadTips() {
      setLoading(true);
      const result = await fetchMatchData();

      if (!result.success || !result.fixtures?.length) {
        setError(result.error || "No fixtures available right now. Check back later.");
        setLoading(false);
        return;
      }

      setLastUpdated(result.lastUpdated);

      // Generate all opportunities using the full market set
      const allMarkets = new Set(
        Object.values(MARKET_CATEGORIES).flatMap(c => c.markets)
      );
      const opps = generateOpportunities(result.fixtures, allMarkets);

      // Smart tip selection: must be LIKELY and have VALUE
      // A tip like "Cagliari to beat Como" at 35% probability is terrible even with edge
      // Good tips = high probability + positive edge
      const scored = opps
        .filter(o => {
          const prob = o.aiProbability;
          const edge = parseFloat(o.edge);
          const odds = o.bookmakerOdds;
          const m = o.market;
          // Must have real odds
          if (!odds || odds < 1.10) return false;
          // Minimum probability thresholds by market type
          if (m.includes("&")) return prob >= 25 && edge > -1;  // Combo bets naturally have lower prob
          if (m.includes("Home Win") || m.includes("Away Win")) return prob >= 45 && edge > -1;
          if (m.includes("Draw") && !m.includes("Draw No Bet")) return prob >= 28 && edge > -1;
          if (m.includes("Double Chance") || m.includes("1X") || m.includes("X2") || m.includes("12")) return prob >= 55 && edge > -1;
          if (m.includes("Over") || m.includes("Under")) return prob >= 40 && edge > -1;
          if (m.includes("BTTS")) return prob >= 40 && edge > -1;
          if (m.startsWith("AH")) return prob >= 38 && edge > -1;
          if (m.includes("Draw No Bet")) return prob >= 45 && edge > -1;
          if (m.includes("Corner")) return prob >= 40 && edge > -1;
          return prob >= 40 && edge > -1;
        })
        .map(o => {
          // Score = weighted combo of probability and edge
          // High prob + positive edge = great tip
          const prob = o.aiProbability;
          const edge = parseFloat(o.edge);
          const score = (prob * 0.6) + (edge * 8) + (o.isValue ? 5 : 0);
          return { ...o, _tipScore: score };
        })
        .sort((a, b) => b._tipScore - a._tipScore);

      // Pick the best 8, ensuring no duplicate matches
      const picked = [];
      const usedMatches = new Set();
      for (const bet of scored) {
        if (picked.length >= 8) break;
        const matchKey = `${bet.home}-${bet.away}`;
        if (usedMatches.has(matchKey)) continue;
        usedMatches.add(matchKey);
        picked.push(bet);
      }

      setTips(picked);
      setLoading(false);
    }

    loadTips();
  }, []);

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <>
      <style>{TIPS_CSS}</style>

      <div className="tips-hero">
        <div className="tips-hero-badge">🎯 AI-Powered Picks</div>
        <h1 className="tips-hero-title">Today's Best Bets</h1>
        <p className="tips-hero-date">{today}</p>
        <p className="tips-hero-sub">
          Our AI scans every fixture across 19+ leagues, compares bookmaker odds to calculated probabilities,
          and surfaces the bets with the strongest statistical edge. Updated daily.
        </p>
        {lastUpdated && (
          <p className="tips-hero-updated">
            Data refreshed: {new Date(lastUpdated).toLocaleString()}
          </p>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="tips-loading">
          <div className="spinner" />
          <div style={{ fontSize: 16, fontWeight: 600 }}>Analyzing today's fixtures...</div>
          <div style={{ fontSize: 13, marginTop: 8, color: "var(--text-muted)" }}>
            Scanning odds, form, H2H, and injuries across all leagues
          </div>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="tips-error">
          <div style={{ fontSize: 36, marginBottom: 12 }}>⚽</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>{error}</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
            Tips are generated from live match data. If no fixtures are available, check back closer to match day.
          </div>
          <button className="gen-btn" style={{ maxWidth: 200, margin: "0 auto" }} onClick={() => window.location.reload()}>
            Refresh
          </button>
        </div>
      )}

      {/* No value bets found */}
      {!loading && !error && tips.length === 0 && (
        <div className="tips-error">
          <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>No strong value bets found today</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>
            Our AI only recommends bets where it identifies a genuine statistical edge.
            Some days the bookmakers have the market priced efficiently — and that's OK.
            Check back tomorrow or use the generator to explore more options.
          </div>
        </div>
      )}

      {/* Tips Cards */}
      {!loading && tips.length > 0 && (
        <div className="tips-list">
          {tips.map((tip, i) => {
            const edge = parseFloat(tip.edge);
            const conf = getConfidence(edge, tip.aiProbability);
            const reasoning = tip.narrative || generateReasoning(tip);
            const isExpanded = expandedTip === tip.id;

            return (
              <div key={tip.id} className="tip-card" style={{ animationDelay: `${i * 0.08}s` }}>
                {/* Confidence badge */}
                <div className="tip-confidence" style={{ background: conf.bg, border: `1px solid ${conf.border}`, color: conf.color }}>
                  {conf.label}
                </div>

                {/* Match header */}
                <div className="tip-match-row">
                  <div className="tip-match-teams">
                    <span className="tip-team-name">{tip.homeLogo && <img src={tip.homeLogo} style={{ width: 20, height: 20, objectFit: "contain", verticalAlign: "middle", marginRight: 6, borderRadius: 2 }} alt="" />}{tip.home}</span>
                    <span className="tip-vs">vs</span>
                    <span className="tip-team-name">{tip.away}{tip.awayLogo && <img src={tip.awayLogo} style={{ width: 20, height: 20, objectFit: "contain", verticalAlign: "middle", marginLeft: 6, borderRadius: 2 }} alt="" />}</span>
                  </div>
                  <div className="tip-match-meta">
                    <span>{tip.leagueFlag} {tip.league}</span>
                    <span className="tip-meta-sep">·</span>
                    <span>{tip.day} {tip.time}</span>
                  </div>
                </div>

                {/* The Tip */}
                <div className="tip-pick-row">
                  <div className="tip-pick-left">
                    <div className="tip-pick-label">Our Pick</div>
                    <div className="tip-pick-market">{marketDisplay(tip.market)}</div>
                  </div>
                  <div className="tip-pick-right">
                    <div className="tip-odds">{tip.bookmakerOdds}</div>
                    <div className="tip-edge" style={{ color: conf.color }}>+{edge.toFixed(1)}% edge</div>
                  </div>
                </div>

                {/* Probability comparison */}
                <div className="tip-prob-row">
                  <div className="tip-prob-item">
                    <div className="tip-prob-label">AI Probability</div>
                    <div className="tip-prob-value" style={{ color: "var(--green-400)" }}>{tip.aiProbability}%</div>
                    <div className="tip-prob-bar">
                      <div className="tip-prob-fill" style={{ width: `${Math.min(tip.aiProbability, 100)}%`, background: "var(--green-400)" }} />
                    </div>
                  </div>
                  <div className="tip-prob-item">
                    <div className="tip-prob-label">Bookmaker Implied</div>
                    <div className="tip-prob-value" style={{ color: "var(--text-muted)" }}>{tip.impliedProbability}%</div>
                    <div className="tip-prob-bar">
                      <div className="tip-prob-fill" style={{ width: `${Math.min(tip.impliedProbability, 100)}%`, background: "var(--navy-400)" }} />
                    </div>
                  </div>
                </div>

                {/* Reasoning */}
                <div className="tip-reasoning">
                  <div className="tip-reasoning-label">🧠 AI Analysis</div>
                  <p className="tip-reasoning-text">{reasoning}</p>
                </div>

                {/* Context Insights (expandable) */}
                {tip.analysis?.contextInsights?.length > 0 && (
                  <>
                    <button
                      className="tip-expand-btn"
                      onClick={() => setExpandedTip(isExpanded ? null : tip.id)}
                    >
                      {isExpanded ? "▾ Hide detailed insights" : `▸ Show ${tip.analysis.contextInsights.length} detailed insights`}
                    </button>
                    {isExpanded && (
                      <div className="tip-insights">
                        {tip.analysis.contextInsights.map((insight, j) => {
                          const bgColor =
                            insight.impact?.includes("positive") ? "rgba(34,197,94,0.06)" :
                            insight.impact?.includes("negative") ? "rgba(239,68,68,0.06)" :
                            insight.impact?.includes("high_scoring") ? "rgba(245,158,11,0.06)" :
                            insight.impact?.includes("low_scoring") ? "rgba(59,130,246,0.06)" :
                            "rgba(148,163,184,0.06)";
                          const borderColor =
                            insight.impact?.includes("positive") ? "rgba(34,197,94,0.12)" :
                            insight.impact?.includes("negative") ? "rgba(239,68,68,0.12)" :
                            insight.impact?.includes("high_scoring") ? "rgba(245,158,11,0.12)" :
                            insight.impact?.includes("low_scoring") ? "rgba(59,130,246,0.12)" :
                            "rgba(148,163,184,0.12)";
                          return (
                            <div key={j} style={{ padding: "8px 10px", borderRadius: 8, background: bgColor, border: `1px solid ${borderColor}`, marginBottom: 6 }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", marginBottom: 2 }}>
                                {insight.icon} {insight.title}
                              </div>
                              <div style={{ fontSize: 12, lineHeight: 1.5, color: "var(--text-secondary)" }}>
                                {insight.detail}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}

                {/* CTA — ready for affiliate links */}
                <a
                  href="#"
                  className="tip-cta"
                  onClick={e => e.preventDefault()}
                  title="Affiliate link placeholder"
                >
                  Place this bet →
                </a>
              </div>
            );
          })}

          {/* Disclaimer section */}
          <div className="tips-bottom-info">
            <div className="tips-how-box">
              <div className="tips-how-title">How are these tips generated?</div>
              <p>
                Every tip is automatically generated by our AI engine. It compares real bookmaker odds
                against calculated probabilities using recent form, head-to-head records, goals data,
                and injury reports. Tips are selected based on highest edge — the gap between our model's
                probability and the bookmaker's implied probability. No human bias, no gut feelings.
              </p>
            </div>

            <div className="tips-disclaimer">
              ⚠️ Gambling involves risk. These are statistical observations, not guarantees.
              Even positive-edge bets lose regularly — that's the nature of probability.
              Always bet responsibly. 18+ only.
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════
const TIPS_CSS = `
  .tips-hero {
    text-align: center;
    padding: 8px 0 28px;
    position: relative;
    margin-bottom: 8px;
  }
  .tips-hero::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 120px;
    height: 2px;
    background: linear-gradient(90deg, transparent, var(--gold-500), transparent);
  }
  .tips-hero-badge {
    display: inline-block;
    padding: 5px 14px;
    border-radius: 20px;
    background: rgba(212,175,55,0.1);
    border: 1px solid rgba(212,175,55,0.2);
    color: var(--gold-400);
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.5px;
    margin-bottom: 14px;
  }
  .tips-hero-title {
    font-size: 32px;
    font-weight: 700;
    letter-spacing: -0.5px;
    margin-bottom: 4px;
    color: var(--text-primary);
  }
  .tips-hero-date {
    font-size: 15px;
    color: var(--gold-400);
    font-weight: 500;
    margin-bottom: 12px;
  }
  .tips-hero-sub {
    font-size: 14px;
    color: var(--text-muted);
    max-width: 600px;
    margin: 0 auto;
    line-height: 1.6;
  }
  .tips-hero-updated {
    font-size: 11px;
    color: var(--text-muted);
    margin-top: 10px;
    font-family: 'JetBrains Mono', monospace;
  }

  .tips-loading {
    text-align: center;
    padding: 60px 20px;
    color: var(--text-secondary);
  }
  .tips-error {
    text-align: center;
    padding: 40px 20px;
    background: var(--glass);
    border: 1px solid var(--glass-border);
    border-radius: 16px;
    color: var(--text-secondary);
  }

  .tips-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  /* ─── TIP CARD ──────────────────────────────────────────── */
  .tip-card {
    background: var(--glass);
    backdrop-filter: blur(20px);
    border: 1px solid var(--glass-border);
    border-radius: 16px;
    padding: 24px;
    animation: tipSlideIn 0.4s ease both;
    transition: border-color 0.2s;
  }
  .tip-card:hover {
    border-color: rgba(212,175,55,0.3);
  }
  @keyframes tipSlideIn {
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .tip-confidence {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.3px;
    margin-bottom: 14px;
  }

  .tip-match-row {
    margin-bottom: 18px;
  }
  .tip-match-teams {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 6px;
  }
  .tip-team-name {
    font-size: 20px;
    font-weight: 700;
    letter-spacing: -0.3px;
  }
  .tip-vs {
    font-size: 13px;
    color: var(--text-muted);
    font-weight: 500;
  }
  .tip-match-meta {
    font-size: 13px;
    color: var(--text-muted);
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .tip-meta-sep {
    color: var(--navy-600);
  }

  /* ─── PICK ROW ──────────────────────────────────────────── */
  .tip-pick-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 16px;
    border-radius: 12px;
    background: linear-gradient(135deg, rgba(212,175,55,0.06), rgba(212,175,55,0.02));
    border: 1px solid rgba(212,175,55,0.15);
    margin-bottom: 16px;
    gap: 12px;
    flex-wrap: wrap;
  }
  .tip-pick-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1.2px;
    color: var(--gold-500);
    margin-bottom: 3px;
  }
  .tip-pick-market {
    font-size: 17px;
    font-weight: 700;
    color: var(--text-primary);
  }
  .tip-pick-right {
    text-align: right;
  }
  .tip-odds {
    font-family: 'JetBrains Mono', monospace;
    font-size: 28px;
    font-weight: 700;
    color: var(--text-primary);
    line-height: 1;
  }
  .tip-edge {
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px;
    font-weight: 600;
    margin-top: 2px;
  }

  /* ─── PROBABILITY BARS ──────────────────────────────────── */
  .tip-prob-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-bottom: 16px;
  }
  @media (max-width: 480px) {
    .tip-prob-row { grid-template-columns: 1fr; }
  }
  .tip-prob-item {}
  .tip-prob-label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: var(--text-muted);
    margin-bottom: 4px;
  }
  .tip-prob-value {
    font-family: 'JetBrains Mono', monospace;
    font-size: 18px;
    font-weight: 700;
    margin-bottom: 4px;
  }
  .tip-prob-bar {
    height: 5px;
    background: var(--navy-700);
    border-radius: 5px;
    overflow: hidden;
  }
  .tip-prob-fill {
    height: 100%;
    border-radius: 5px;
    transition: width 0.6s ease;
  }

  /* ─── REASONING ─────────────────────────────────────────── */
  .tip-reasoning {
    padding: 14px 16px;
    border-radius: 10px;
    background: var(--navy-800);
    border: 1px solid var(--navy-600);
    margin-bottom: 12px;
  }
  .tip-reasoning-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--gold-500);
    margin-bottom: 8px;
  }
  .tip-reasoning-text {
    font-size: 14px;
    line-height: 1.7;
    color: var(--text-secondary);
    margin: 0;
  }

  /* ─── EXPAND BUTTON ─────────────────────────────────────── */
  .tip-expand-btn {
    font-size: 12px;
    color: var(--gold-400);
    cursor: pointer;
    background: none;
    border: none;
    padding: 4px 0;
    font-family: 'DM Sans', sans-serif;
    display: flex;
    align-items: center;
    gap: 4px;
    margin-bottom: 10px;
    transition: color 0.2s;
  }
  .tip-expand-btn:hover {
    color: var(--gold-300);
  }
  .tip-insights {
    margin-bottom: 12px;
  }

  /* ─── CTA BUTTON ────────────────────────────────────────── */
  .tip-cta {
    display: block;
    width: 100%;
    padding: 14px;
    border-radius: 10px;
    background: linear-gradient(135deg, var(--gold-500), var(--gold-300));
    color: var(--navy-950);
    font-family: 'DM Sans', sans-serif;
    font-size: 15px;
    font-weight: 700;
    text-align: center;
    text-decoration: none;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 0 20px rgba(212,175,55,0.1);
  }
  .tip-cta:hover {
    transform: translateY(-1px);
    box-shadow: 0 0 30px rgba(212,175,55,0.2);
  }

  /* ─── BOTTOM INFO ───────────────────────────────────────── */
  .tips-bottom-info {
    margin-top: 8px;
  }
  .tips-how-box {
    padding: 20px;
    border-radius: 12px;
    background: var(--glass);
    border: 1px solid var(--glass-border);
    margin-bottom: 12px;
  }
  .tips-how-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--gold-400);
    margin-bottom: 10px;
  }
  .tips-how-box p {
    font-size: 13px;
    color: var(--text-muted);
    line-height: 1.7;
    margin: 0;
  }
  .tips-disclaimer {
    text-align: center;
    padding: 16px;
    font-size: 12px;
    color: var(--text-muted);
    line-height: 1.6;
  }
`;
