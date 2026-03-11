// src/DailySlips.jsx
// Pre-built daily bet slips with personality.
// Auto-generates 4 slips from the AI engine with different risk/selection profiles.
// Zero manual work — refreshes when fixture data refreshes.

import { useState, useEffect } from "react";
import { fetchMatchData, generateOpportunities, buildSlip, MARKET_CATEGORIES, marketDisplayName } from "./api.js";
import { FormPills, MatchFormHeader, ProsCons } from "./TeamStatsCard.jsx";
import { activeBookmakers } from "./AffiliateCTA.jsx";

// ═══════════════════════════════════════════════════════════════════════
// SLIP PROFILES — each has a different personality and strategy
// ═══════════════════════════════════════════════════════════════════════
const SLIP_PROFILES = [
  {
    id: "the-lock",
    name: "The Lock",
    icon: "🔒",
    tagline: "If one bet hits today, it's this one.",
    description: "Our single highest-confidence pick. Maximum probability, backed by strong data across all factors. This is the bet you place when you want to feel good about your chances.",
    selections: 1,
    riskLevel: "conservative",
    targetMultiplier: 1.8, // target odds ~1.8x
    stakeAdvice: "3-5% of your bankroll",
    timeframe: "Today's matches",
    color: "var(--blue-500)",
    bgColor: "rgba(59,130,246,0.08)",
    borderColor: "rgba(59,130,246,0.2)",
    accentBg: "rgba(59,130,246,0.12)",
  },
  {
    id: "daily-double",
    name: "The Daily Double",
    icon: "⚡",
    tagline: "Two strong picks. One clean slip.",
    description: "Two carefully selected bets combined into a double. Each leg is individually strong — together they offer a solid return without going overboard on risk.",
    selections: 2,
    riskLevel: "balanced",
    targetMultiplier: 4,
    stakeAdvice: "2-3% of your bankroll",
    timeframe: "Today's matches",
    color: "var(--gold-400)",
    bgColor: "rgba(212,175,55,0.06)",
    borderColor: "rgba(212,175,55,0.2)",
    accentBg: "rgba(212,175,55,0.12)",
  },
  {
    id: "hat-trick",
    name: "The Hat-trick",
    icon: "🎩",
    tagline: "Three legs. Balanced risk. Real returns.",
    description: "The sweet spot of accumulator betting. Three value selections that balance probability with meaningful returns. Our most popular daily slip format.",
    selections: 3,
    riskLevel: "balanced",
    targetMultiplier: 8,
    stakeAdvice: "1-2% of your bankroll",
    timeframe: "Next 3 days",
    color: "var(--green-400)",
    bgColor: "rgba(34,197,94,0.06)",
    borderColor: "rgba(34,197,94,0.2)",
    accentBg: "rgba(34,197,94,0.12)",
  },
  {
    id: "the-rocket",
    name: "The Rocket",
    icon: "🚀",
    tagline: "Strap in. High odds. Low stake.",
    description: "5-6 legs of carefully selected value bets for explosive returns. This is the entertainment bet — small stake, big dream. Place it, forget it, and check back later.",
    selections: 5,
    riskLevel: "aggressive",
    targetMultiplier: 25,
    stakeAdvice: "0.5-1% of your bankroll (max €10)",
    timeframe: "Next 5 days",
    color: "var(--orange-500)",
    bgColor: "rgba(245,158,11,0.06)",
    borderColor: "rgba(245,158,11,0.2)",
    accentBg: "rgba(245,158,11,0.12)",
  },
];

export default function DailySlipsPage() {
  const [slips, setSlips] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedSlip, setExpandedSlip] = useState(null);
  const [expandedLegs, setExpandedLegs] = useState({});

  useEffect(() => {
    async function generate() {
      setLoading(true);
      const result = await fetchMatchData();

      if (!result.success || !result.fixtures?.length) {
        setLoading(false);
        return;
      }

      const allMarkets = new Set(Object.values(MARKET_CATEGORIES).flatMap(c => c.markets));
      const allWithOdds = result.fixtures.filter(f => f.odds && Object.keys(f.odds).length > 0);

      if (allWithOdds.length === 0) {
        setLoading(false);
        return;
      }

      // ─── Date-filtered fixture pools ────────────────────────
      const today = new Date().toISOString().split("T")[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
      const in3Days = new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0];
      const in5Days = new Date(Date.now() + 5 * 86400000).toISOString().split("T")[0];

      const todayFixtures = allWithOdds.filter(f => f.date === today || f.date === tomorrow);
      const shortRange = allWithOdds.filter(f => f.date <= in3Days);
      const mediumRange = allWithOdds.filter(f => f.date <= in5Days);

      const generated = {};

      for (const profile of SLIP_PROFILES) {
        // The Lock & Daily Double: TODAY/TOMORROW fixtures only
        // Hat-trick: within 3 days
        // The Rocket: within 5 days
        let pool;
        if (profile.id === "the-lock" || profile.id === "daily-double") {
          pool = todayFixtures;
        } else if (profile.id === "hat-trick") {
          pool = shortRange.length >= 3 ? shortRange : mediumRange;
        } else {
          pool = mediumRange.length >= 5 ? mediumRange : allWithOdds;
        }

        if (pool.length === 0) continue;

        const opps = generateOpportunities(pool, allMarkets);
        const numSel = Math.min(profile.selections, pool.length);
        if (numSel < 1) continue;

        const targetOdds = profile.targetMultiplier;
        const slip = buildSlip(opps, numSel, profile.riskLevel, targetOdds, String(targetOdds * 100), "100");

        if (slip && slip.selections.length > 0) {
          generated[profile.id] = slip;
        }
      }

      setSlips(generated);
      setLoading(false);
    }

    generate();
  }, []);

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <>
      <style>{SLIPS_CSS}</style>

      <div className="ds-hero">
        <div className="ds-badge">🎯 AI-Curated Daily Slips</div>
        <h1 className="ds-title">Today's Best Slips</h1>
        <p className="ds-date">{today}</p>
        <p className="ds-subtitle">
          Four pre-built bet slips, each with a different risk profile. From the safest single
          to the high-flying accumulator. Pick your style, place your bet.
        </p>
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>
          <div className="spinner" style={{ margin: "0 auto 12px" }} />
          Building today's slips...
        </div>
      )}

      {!loading && Object.keys(slips).length === 0 && (
        <div className="card" style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🎯</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>No slips available right now</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>
            Slips are generated from live odds data. Check back closer to match day.
          </div>
        </div>
      )}

      {!loading && SLIP_PROFILES.map((profile, pi) => {
        const slip = slips[profile.id];
        if (!slip) return null;

        const isExpanded = expandedSlip === profile.id;
        const potentialReturn = (100 * slip.combinedOdds).toFixed(0);
        const winProb = slip.slipWinProbability;

        return (
          <div
            key={profile.id}
            className="ds-slip"
            style={{
              background: profile.bgColor,
              borderColor: profile.borderColor,
              animationDelay: `${pi * 0.1}s`,
            }}
          >
            {/* Header */}
            <div className="ds-slip-header">
              <div className="ds-slip-icon" style={{ background: profile.accentBg, color: profile.color }}>
                {profile.icon}
              </div>
              <div className="ds-slip-title-block">
                <h2 className="ds-slip-name" style={{ color: profile.color }}>{profile.name}</h2>
                <p className="ds-slip-tagline">{profile.tagline}</p>
                <span className="ds-slip-timeframe">{profile.timeframe}</span>
              </div>
              <div className="ds-slip-odds">
                <div className="ds-slip-odds-value" style={{ color: profile.color }}>
                  {slip.combinedOdds}x
                </div>
                <div className="ds-slip-odds-label">odds</div>
              </div>
            </div>

            {/* Description */}
            <p className="ds-slip-desc">{profile.description}</p>

            {/* Stats Row */}
            <div className="ds-slip-stats">
              <div className="ds-stat">
                <div className="ds-stat-label">Selections</div>
                <div className="ds-stat-value">{slip.selections.length}</div>
              </div>
              <div className="ds-stat">
                <div className="ds-stat-label">€100 Returns</div>
                <div className="ds-stat-value" style={{ color: profile.color }}>€{potentialReturn}</div>
              </div>
              <div className="ds-stat">
                <div className="ds-stat-label">Win Prob</div>
                <div className="ds-stat-value">{winProb}%</div>
              </div>
              <div className="ds-stat">
                <div className="ds-stat-label">Avg Edge</div>
                <div className="ds-stat-value" style={{ color: slip.avgEdge > 0 ? "var(--green-400)" : "var(--text-muted)" }}>
                  {slip.avgEdge > 0 ? "+" : ""}{slip.avgEdge}%
                </div>
              </div>
            </div>

            {/* Selections */}
            <div className="ds-legs">
              {slip.selections.map((sel, i) => (
                <div key={sel.id} className="ds-leg">
                  <div className="ds-leg-top">
                    <div className="ds-leg-match">
                      {sel.homeLogo && <img src={sel.homeLogo} style={{ width: 18, height: 18, objectFit: "contain", borderRadius: 2, marginRight: 5 }} alt="" />}
                      {sel.home} vs {sel.away}
                      {sel.awayLogo && <img src={sel.awayLogo} style={{ width: 18, height: 18, objectFit: "contain", borderRadius: 2, marginLeft: 5 }} alt="" />}
                    </div>
                    <div className="ds-leg-odds" style={{ color: profile.color }}>{sel.bookmakerOdds}</div>
                  </div>
                  <div className="ds-leg-bottom">
                    <span className="ds-leg-league">{sel.leagueFlag} {sel.league} · {sel.day} {sel.time}</span>
                    <span className="ds-leg-market">{marketDisplayName(sel.market)}</span>
                  </div>
                  {/* Form pills — always visible */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {sel.homeLogo && <img src={sel.homeLogo} style={{ width: 14, height: 14, objectFit: "contain" }} alt="" />}
                      <FormPills form={sel.analysis?.homeRecentForm} size="sm" />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <FormPills form={sel.analysis?.awayRecentForm} size="sm" />
                      {sel.awayLogo && <img src={sel.awayLogo} style={{ width: 14, height: 14, objectFit: "contain" }} alt="" />}
                    </div>
                  </div>
                  {/* Narrative analysis — always visible */}
                  {sel.narrative && (
                    <div className="ds-leg-narrative">{sel.narrative}</div>
                  )}
                  {/* Pros/Cons */}
                  <ProsCons pros={sel.pros} cons={sel.cons} />
                  {/* Expandable detailed data */}
                  <button
                    className="ds-leg-toggle"
                    onClick={() => setExpandedLegs(p => ({ ...p, [`${profile.id}-${i}`]: !p[`${profile.id}-${i}`] }))}
                  >
                    {expandedLegs[`${profile.id}-${i}`] ? "▾ Hide details" : "▸ Show data"}
                  </button>
                  {expandedLegs[`${profile.id}-${i}`] && (
                    <div className="ds-leg-reason">
                      <div style={{ marginBottom: 6 }}>
                        AI prob: <strong style={{ color: "var(--green-400)" }}>{sel.aiProbability}%</strong> vs
                        Book: <strong>{sel.impliedProbability}%</strong>
                        {parseFloat(sel.edge) > 0 && <span style={{ color: "var(--green-400)" }}> (+{sel.edge}% edge)</span>}
                      </div>
                      {sel.analysis?.contextInsights?.slice(0, 3).map((ins, j) => (
                        <div key={j} style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
                          {ins.icon} {ins.title}: {ins.detail}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Stake Advice */}
            <div className="ds-stake-advice" style={{ background: profile.accentBg, borderColor: profile.borderColor }}>
              <span style={{ fontWeight: 600, color: profile.color }}>Recommended stake:</span>{" "}
              <span style={{ color: "var(--text-secondary)" }}>{profile.stakeAdvice}</span>
            </div>

            {/* CTA — affiliate */}
            <a
              href={activeBookmakers[0]?.url || "#"}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="ds-cta"
              style={{ background: "linear-gradient(135deg, var(--gold-500), var(--gold-300))" }}
              onClick={e => { if (!activeBookmakers[0]?.url || activeBookmakers[0].url === "#") e.preventDefault(); }}
            >
              {activeBookmakers[0] ? `Place ${profile.name} at ${activeBookmakers[0].name} →` : `Place ${profile.name} →`}
            </a>

            {/* Risk Warning */}
            <div className="ds-risk">
              {winProb >= 30 && "Solid probability. Still not guaranteed — bet responsibly."}
              {winProb >= 15 && winProb < 30 && `~1 in ${Math.round(100 / winProb)} chance. Good value over time.`}
              {winProb >= 5 && winProb < 15 && `~1 in ${Math.round(100 / winProb)} chance. Edges favor you over volume, but expect losses.`}
              {winProb < 5 && `~1 in ${Math.round(100 / Math.max(winProb, 0.1))} chance. Entertainment bet — small stake only.`}
            </div>
          </div>
        );
      })}

      {/* Bottom explainer */}
      {!loading && Object.keys(slips).length > 0 && (
        <div className="ds-explainer">
          <h3>How are these slips built?</h3>
          <p>
            Each slip is auto-generated by our AI engine using the same data and analysis as the
            main generator. The difference is the <strong>parameters</strong>: The Lock uses maximum
            probability with one selection. The Daily Double balances two strong picks. The Hat-trick
            finds the sweet spot of three value bets. The Rocket goes aggressive with 5-6 legs for
            explosive odds.
          </p>
          <p>
            All selections must pass probability minimums — we never include unlikely bets just
            for higher odds. Every leg has a genuine statistical rationale.
          </p>
          <p>
            Slips refresh automatically when new odds data becomes available.
            ⚠️ Gambling involves risk. Always bet responsibly. 18+ only.
          </p>
        </div>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════
const SLIPS_CSS = `
  .ds-hero { text-align: center; padding: 8px 0 24px; }
  .ds-badge { display: inline-block; padding: 5px 14px; border-radius: 20px; background: rgba(212,175,55,0.1); border: 1px solid rgba(212,175,55,0.2); color: var(--gold-400); font-size: 12px; font-weight: 600; margin-bottom: 12px; }
  .ds-title { font-size: 30px; font-weight: 700; margin-bottom: 4px; }
  .ds-date { font-size: 14px; color: var(--gold-400); font-weight: 500; margin-bottom: 10px; }
  .ds-subtitle { font-size: 13px; color: var(--text-muted); max-width: 560px; margin: 0 auto; line-height: 1.6; }

  /* Slip Card */
  .ds-slip {
    border: 1px solid;
    border-radius: 18px;
    padding: 24px;
    margin-bottom: 20px;
    animation: slideIn 0.4s ease both;
    transition: border-color 0.2s;
  }
  .ds-slip:hover { filter: brightness(1.02); }

  .ds-slip-header {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 14px;
  }
  .ds-slip-icon {
    width: 48px;
    height: 48px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    flex-shrink: 0;
  }
  .ds-slip-title-block { flex: 1; }
  .ds-slip-name {
    font-size: 22px;
    font-weight: 700;
    margin-bottom: 2px;
  }
  .ds-slip-tagline {
    font-size: 13px;
    color: var(--text-muted);
    font-style: italic;
  }
  .ds-slip-timeframe {
    display: inline-block;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    padding: 2px 8px;
    border-radius: 4px;
    background: rgba(148,163,184,0.1);
    color: var(--text-muted);
    margin-top: 4px;
  }
  .ds-slip-odds { text-align: right; }
  .ds-slip-odds-value {
    font-family: 'JetBrains Mono', monospace;
    font-size: 32px;
    font-weight: 700;
    line-height: 1;
  }
  .ds-slip-odds-label {
    font-size: 11px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .ds-slip-desc {
    font-size: 13px;
    color: var(--text-secondary);
    line-height: 1.6;
    margin-bottom: 16px;
  }

  /* Stats */
  .ds-slip-stats {
    display: flex;
    gap: 16px;
    margin-bottom: 16px;
    flex-wrap: wrap;
  }
  .ds-stat { text-align: center; min-width: 70px; }
  .ds-stat-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.8px; color: var(--text-muted); margin-bottom: 2px; }
  .ds-stat-value { font-family: 'JetBrains Mono', monospace; font-size: 16px; font-weight: 700; color: var(--text-primary); }

  /* Legs */
  .ds-legs { margin-bottom: 14px; }
  .ds-leg {
    padding: 12px 14px;
    border-radius: 10px;
    background: var(--navy-800);
    border: 1px solid var(--navy-600);
    margin-bottom: 6px;
  }
  .ds-leg-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    margin-bottom: 4px;
  }
  .ds-leg-match {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    flex-wrap: wrap;
  }
  .ds-leg-odds {
    font-family: 'JetBrains Mono', monospace;
    font-size: 20px;
    font-weight: 700;
    flex-shrink: 0;
  }
  .ds-leg-bottom {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .ds-leg-league { font-size: 11px; color: var(--text-muted); }
  .ds-leg-market {
    font-size: 12px;
    color: var(--gold-400);
    background: rgba(212,175,55,0.08);
    padding: 2px 8px;
    border-radius: 4px;
    font-weight: 500;
  }
  .ds-leg-toggle {
    font-size: 11px;
    color: var(--gold-400);
    cursor: pointer;
    background: none;
    border: none;
    padding: 4px 0 0;
    font-family: 'DM Sans', sans-serif;
    transition: color 0.2s;
  }
  .ds-leg-toggle:hover { color: var(--gold-300); }
  .ds-leg-narrative {
    margin-top: 10px;
    padding: 12px 14px;
    border-radius: 8px;
    background: rgba(212,175,55,0.04);
    border-left: 3px solid rgba(212,175,55,0.3);
    font-size: 13px;
    color: var(--text-secondary);
    line-height: 1.7;
  }
  .ds-leg-reason {
    margin-top: 8px;
    padding: 10px;
    border-radius: 8px;
    background: var(--navy-900);
    border: 1px solid var(--navy-700);
    font-size: 12px;
    color: var(--text-secondary);
    line-height: 1.6;
  }

  /* Stake advice */
  .ds-stake-advice {
    padding: 10px 14px;
    border-radius: 8px;
    border: 1px solid;
    font-size: 13px;
    margin-bottom: 12px;
  }

  /* CTA */
  .ds-cta {
    display: block;
    width: 100%;
    padding: 14px;
    border-radius: 12px;
    color: var(--navy-950);
    font-family: 'DM Sans', sans-serif;
    font-size: 16px;
    font-weight: 700;
    text-align: center;
    text-decoration: none;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 0 20px rgba(0,0,0,0.1);
    margin-bottom: 8px;
  }
  .ds-cta:hover {
    transform: translateY(-1px);
    box-shadow: 0 0 30px rgba(0,0,0,0.2);
  }

  .ds-risk {
    font-size: 11px;
    color: var(--text-muted);
    text-align: center;
    line-height: 1.5;
  }

  /* Explainer */
  .ds-explainer {
    padding: 20px;
    border-radius: 14px;
    background: var(--glass);
    border: 1px solid var(--glass-border);
    margin-top: 8px;
  }
  .ds-explainer h3 { font-size: 14px; color: var(--gold-400); margin-bottom: 10px; }
  .ds-explainer p { font-size: 13px; color: var(--text-muted); line-height: 1.7; margin-bottom: 8px; }
  .ds-explainer strong { color: var(--text-secondary); }

  @media (max-width: 640px) {
    .ds-slip-header { flex-wrap: wrap; }
    .ds-slip-odds-value { font-size: 26px; }
    .ds-slip-name { font-size: 18px; }
  }
`;
