// src/LeagueTips.jsx
// League-specific tips pages — "Premier League Tips Today", "La Liga Best Bets", etc.
// Auto-generates from the same API data. Each league = unique content = SEO gold.

import { useState, useEffect } from "react";
import { fetchMatchData, generateOpportunities, MARKET_CATEGORIES, marketDisplayName } from "./api.js";
import { FormPills, ProsCons } from "./TeamStatsCard.jsx";
import { AffiliateTipButton } from "./AffiliateCTA.jsx";

const LEAGUE_META = {
  "Premier League": { slug: "premier-league", emoji: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", color: "#3d195b", desc: "England's top flight — the most competitive league in the world." },
  "La Liga": { slug: "la-liga", emoji: "🇪🇸", color: "#ee8707", desc: "Spain's premier division featuring Real Madrid, Barcelona, and Atletico." },
  "Bundesliga": { slug: "bundesliga", emoji: "🇩🇪", color: "#d20515", desc: "Germany's top league — high-scoring, fast-paced football." },
  "Serie A": { slug: "serie-a", emoji: "🇮🇹", color: "#024494", desc: "Italy's premier league — tactical excellence and defensive mastery." },
  "Ligue 1": { slug: "ligue-1", emoji: "🇫🇷", color: "#091c3e", desc: "France's top division featuring PSG and rising talent." },
  "Allsvenskan": { slug: "allsvenskan", emoji: "🇸🇪", color: "#006aa7", desc: "Sweden's top league — competitive and unpredictable." },
  "Eredivisie": { slug: "eredivisie", emoji: "🇳🇱", color: "#ff4f00", desc: "Netherlands' premier league — attacking football at its best." },
  "Primeira Liga": { slug: "primeira-liga", emoji: "🇵🇹", color: "#006600", desc: "Portugal's top flight featuring Benfica, Porto, and Sporting." },
  "Super Lig": { slug: "super-lig", emoji: "🇹🇷", color: "#e30a17", desc: "Turkey's premier division — passionate fans and intense derbies." },
  "Jupiler Pro League": { slug: "jupiler-pro", emoji: "🇧🇪", color: "#000000", desc: "Belgium's top league — a breeding ground for talent." },
  "Champions League": { slug: "champions-league", emoji: "🏆", color: "#1a237e", desc: "Europe's elite club competition — the pinnacle of football." },
  "Europa League": { slug: "europa-league", emoji: "🏆", color: "#f68e1f", desc: "UEFA's second-tier European competition — high drama guaranteed." },
  "Conference League": { slug: "conference-league", emoji: "🏆", color: "#19381f", desc: "UEFA's newest European competition — opportunity for underdogs." },
};

function getConfidence(edge, prob) {
  if (edge > 2 && prob >= 55) return { label: "Strong Pick", color: "var(--green-400)", bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.25)" };
  if (edge > 0 && prob >= 45) return { label: "Value Bet", color: "var(--gold-400)", bg: "rgba(212,175,55,0.12)", border: "rgba(212,175,55,0.25)" };
  if (prob >= 55) return { label: "High Probability", color: "var(--blue-500)", bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.25)" };
  if (edge > 0) return { label: "Slight Edge", color: "var(--gold-400)", bg: "rgba(212,175,55,0.10)", border: "rgba(212,175,55,0.20)" };
  return { label: "AI Pick", color: "var(--text-muted)", bg: "rgba(148,163,184,0.1)", border: "rgba(148,163,184,0.2)" };
}

export default function LeagueTipsPage({ onMatchPreview }) {
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [tips, setTips] = useState({});

  useEffect(() => {
    async function load() {
      setLoading(true);
      const result = await fetchMatchData();
      if (result.success && result.fixtures?.length) {
        setFixtures(result.fixtures);
        // Generate tips per league
        const allMarkets = new Set(Object.values(MARKET_CATEGORIES).flatMap(c => c.markets));
        const opps = generateOpportunities(result.fixtures, allMarkets);
        // Smart filtering: tips must be LIKELY, not just have edge
        // No one wants "Cagliari to beat Como" at 35% probability
        const scored = opps
          .filter(o => {
            const prob = o.aiProbability;
            const edge = parseFloat(o.edge);
            const odds = o.bookmakerOdds;
            const m = o.market;
            if (!odds || odds < 1.10) return false;
            if (m.includes("&")) return prob >= 25 && edge > -1;
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
            const prob = o.aiProbability;
            const edge = parseFloat(o.edge);
            const score = (prob * 0.6) + (edge * 8) + (o.isValue ? 5 : 0);
            return { ...o, _tipScore: score };
          })
          .sort((a, b) => b._tipScore - a._tipScore);

        const byLeague = {};
        for (const bet of scored) {
          if (!byLeague[bet.league]) byLeague[bet.league] = [];
          // Max 1 bet per match per league
          const matchKey = `${bet.home}-${bet.away}`;
          if (byLeague[bet.league].find(b => `${b.home}-${b.away}` === matchKey)) continue;
          byLeague[bet.league].push(bet);
        }
        // Sort each league by edge
        for (const league of Object.keys(byLeague)) {
          byLeague[league].sort((a, b) => parseFloat(b.edge) - parseFloat(a.edge));
          byLeague[league] = byLeague[league].slice(0, 8); // Max 8 per league
        }
        setTips(byLeague);
        // Auto-select first league with tips
        const firstLeague = Object.keys(byLeague).find(l => byLeague[l].length > 0);
        if (firstLeague) setSelectedLeague(firstLeague);
      }
      setLoading(false);
    }
    load();
  }, []);

  const leaguesWithTips = Object.keys(tips).filter(l => tips[l]?.length > 0);
  const meta = selectedLeague ? LEAGUE_META[selectedLeague] : null;
  const currentTips = selectedLeague ? (tips[selectedLeague] || []) : [];
  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  return (
    <>
      <style>{LEAGUE_CSS}</style>

      <div className="lt-hero">
        <div className="lt-badge">⚽ League-Specific AI Picks</div>
        <h1 className="lt-title">Betting Tips by League</h1>
        <p className="lt-subtitle">{today}</p>
        <p className="lt-desc">
          Our AI analyses each league independently — different leagues have different patterns,
          scoring rates, and value pockets. Pick your league below for targeted tips.
        </p>
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>
          <div className="spinner" style={{ margin: "0 auto 12px" }} />
          Analysing fixtures across all leagues...
        </div>
      )}

      {!loading && leaguesWithTips.length === 0 && (
        <div className="card" style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>No league tips available right now</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Check back closer to match day when odds are published.</div>
        </div>
      )}

      {!loading && leaguesWithTips.length > 0 && (
        <>
          {/* League Selector */}
          <div className="lt-league-grid">
            {leaguesWithTips.map(league => {
              const m = LEAGUE_META[league] || {};
              const count = tips[league]?.length || 0;
              const isActive = selectedLeague === league;
              return (
                <button key={league} className={`lt-league-btn ${isActive ? "active" : ""}`} onClick={() => setSelectedLeague(league)}>
                  <span className="lt-league-emoji">{m.emoji || "⚽"}</span>
                  <div className="lt-league-info">
                    <div className="lt-league-name">{league}</div>
                    <div className="lt-league-count">{count} tip{count !== 1 ? "s" : ""}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected League Content */}
          {selectedLeague && (
            <div className="lt-content">
              <div className="lt-content-header">
                <h2 className="lt-content-title">
                  {meta?.emoji || "⚽"} {selectedLeague} Tips — {today}
                </h2>
                {meta?.desc && <p className="lt-content-desc">{meta.desc}</p>}
                <p className="lt-content-count">{currentTips.length} value bet{currentTips.length !== 1 ? "s" : ""} found</p>
              </div>

              {currentTips.map((tip, i) => {
                const edge = parseFloat(tip.edge);
                const conf = getConfidence(edge, tip.aiProbability);
                return (
                  <div key={tip.id} className="lt-tip" style={{ animationDelay: `${i * 0.06}s` }}>
                    <div className="lt-tip-top">
                      <div>
                        <div className="lt-tip-match">{tip.homeLogo && <img src={tip.homeLogo} style={{ width: 18, height: 18, objectFit: "contain", verticalAlign: "middle", marginRight: 5, borderRadius: 2 }} alt="" />}{tip.home} vs {tip.away}{tip.awayLogo && <img src={tip.awayLogo} style={{ width: 18, height: 18, objectFit: "contain", verticalAlign: "middle", marginLeft: 5, borderRadius: 2 }} alt="" />}</div>
                        <div className="lt-tip-meta">{tip.day} {tip.time} · {tip.leagueFlag} {tip.league}</div>
                      </div>
                      <div className="lt-tip-conf" style={{ background: conf.bg, border: `1px solid ${conf.border}`, color: conf.color }}>
                        {conf.label}
                      </div>
                    </div>

                    {/* Form pills */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, margin: "6px 0", flexWrap: "wrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        {tip.homeLogo && <img src={tip.homeLogo} style={{ width: 13, height: 13, objectFit: "contain" }} alt="" />}
                        <FormPills form={tip.analysis?.homeRecentForm} size="sm" />
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <FormPills form={tip.analysis?.awayRecentForm} size="sm" />
                        {tip.awayLogo && <img src={tip.awayLogo} style={{ width: 13, height: 13, objectFit: "contain" }} alt="" />}
                      </div>
                    </div>

                    <div className="lt-tip-pick">
                      <div>
                        <div className="lt-tip-pick-label">Our Pick</div>
                        <div className="lt-tip-pick-market">{marketDisplayName(tip.market)}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div className="lt-tip-odds">{tip.bookmakerOdds}</div>
                        <div className="lt-tip-edge" style={{ color: conf.color }}>+{edge.toFixed(1)}% edge</div>
                      </div>
                    </div>

                    <div className="lt-tip-probs">
                      <span>AI: <strong style={{ color: "var(--green-400)" }}>{tip.aiProbability}%</strong></span>
                      <span style={{ color: "var(--navy-400)" }}>|</span>
                      <span>Book: <strong>{tip.impliedProbability}%</strong></span>
                    </div>

                    {tip.narrative && (
                      <div className="lt-tip-narrative">{tip.narrative}</div>
                    )}

                    <ProsCons pros={tip.pros} cons={tip.cons} />

                    <div style={{ marginTop: 8 }}>
                      <AffiliateTipButton market={tip.market} odds={tip.bookmakerOdds} />
                    </div>

                    <button className="lt-preview-btn" onClick={() => onMatchPreview && onMatchPreview(tip)}>
                      View Full Match Preview →
                    </button>
                  </div>
                );
              })}

              <div className="lt-league-seo">
                <h3>{selectedLeague} Betting Tips — How We Pick</h3>
                <p>
                  Our AI engine analyses every {selectedLeague} fixture using real bookmaker odds,
                  recent team form, head-to-head records, injury reports, and goals data. It calculates
                  a fair probability for each market and compares it against the bookmaker's implied
                  probability. When the gap is positive — meaning the bookmaker may be undervaluing
                  an outcome — we flag it as a value bet.
                </p>
                <p>
                  {selectedLeague} tips are refreshed automatically when new odds data becomes available.
                  All tips show a confidence level based on the size of the statistical edge identified.
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}

const LEAGUE_CSS = `
  .lt-hero { text-align: center; padding: 8px 0 24px; margin-bottom: 8px; }
  .lt-badge { display: inline-block; padding: 5px 14px; border-radius: 20px; background: rgba(212,175,55,0.1); border: 1px solid rgba(212,175,55,0.2); color: var(--gold-400); font-size: 12px; font-weight: 600; margin-bottom: 12px; }
  .lt-title { font-size: 28px; font-weight: 700; margin-bottom: 4px; }
  .lt-subtitle { font-size: 14px; color: var(--gold-400); font-weight: 500; margin-bottom: 10px; }
  .lt-desc { font-size: 13px; color: var(--text-muted); max-width: 560px; margin: 0 auto; line-height: 1.6; }

  .lt-league-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 8px; margin-bottom: 20px; }
  @media(max-width:500px) { .lt-league-grid { grid-template-columns: 1fr 1fr; } }
  .lt-league-btn { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-radius: 12px; border: 1px solid var(--navy-600); background: var(--navy-800); cursor: pointer; transition: all 0.2s; text-align: left; font-family: 'DM Sans', sans-serif; }
  .lt-league-btn:hover { border-color: var(--navy-400); }
  .lt-league-btn.active { border-color: var(--gold-500); background: rgba(212,175,55,0.08); }
  .lt-league-emoji { font-size: 22px; }
  .lt-league-info {}
  .lt-league-name { font-size: 13px; font-weight: 600; color: var(--text-primary); }
  .lt-league-count { font-size: 11px; color: var(--text-muted); }

  .lt-content { animation: slideIn 0.3s ease; }
  .lt-content-header { margin-bottom: 16px; }
  .lt-content-title { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
  .lt-content-desc { font-size: 13px; color: var(--text-muted); margin-bottom: 4px; }
  .lt-content-count { font-size: 12px; color: var(--gold-400); font-weight: 600; }

  .lt-tip { background: var(--glass); border: 1px solid var(--glass-border); border-radius: 14px; padding: 18px; margin-bottom: 10px; animation: slideIn 0.3s ease both; transition: border-color 0.2s; }
  .lt-tip:hover { border-color: rgba(212,175,55,0.3); }
  .lt-tip-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
  .lt-tip-match { font-size: 16px; font-weight: 700; }
  .lt-tip-meta { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
  .lt-tip-conf { padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; }

  .lt-tip-pick { display: flex; justify-content: space-between; align-items: center; padding: 12px 14px; border-radius: 10px; background: rgba(212,175,55,0.05); border: 1px solid rgba(212,175,55,0.12); margin-bottom: 8px; }
  .lt-tip-pick-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: var(--gold-500); margin-bottom: 2px; }
  .lt-tip-pick-market { font-size: 15px; font-weight: 700; color: var(--text-primary); }
  .lt-tip-odds { font-family: 'JetBrains Mono', monospace; font-size: 24px; font-weight: 700; line-height: 1; }
  .lt-tip-edge { font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: 600; margin-top: 2px; }

  .lt-tip-probs { font-size: 12px; color: var(--text-muted); display: flex; gap: 8px; margin-bottom: 8px; font-family: 'JetBrains Mono', monospace; }

  .lt-tip-narrative {
    font-size: 12.5px;
    color: var(--text-secondary);
    line-height: 1.7;
    padding: 10px 12px;
    border-radius: 8px;
    background: rgba(212,175,55,0.04);
    border-left: 3px solid rgba(212,175,55,0.3);
    margin: 8px 0;
  }
  .lt-preview-btn { background: none; border: none; color: var(--gold-400); font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 500; cursor: pointer; padding: 4px 0; transition: color 0.2s; }
  .lt-preview-btn:hover { color: var(--gold-300); }

  .lt-league-seo { margin-top: 20px; padding: 20px; border-radius: 12px; background: var(--glass); border: 1px solid var(--glass-border); }
  .lt-league-seo h3 { font-size: 15px; font-weight: 700; color: var(--gold-400); margin-bottom: 10px; }
  .lt-league-seo p { font-size: 13px; color: var(--text-muted); line-height: 1.7; margin-bottom: 8px; }
`;
