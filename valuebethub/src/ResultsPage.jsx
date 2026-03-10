// src/ResultsPage.jsx
// Public results tracker — shows tip history, hit rate, and profit/loss
// This is the trust engine that drives repeat visits and social sharing

import { useState, useEffect } from "react";
import { supabase } from "./supabase.js";

export default function ResultsPage() {
  const [stats, setStats] = useState(null);
  const [recentTips, setRecentTips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // "all", "won", "lost", "pending"
  const [timeframe, setTimeframe] = useState("7d"); // "7d", "30d", "all"

  useEffect(() => {
    loadResults();
    // Also trigger the tip-results function to check for updates
    fetch("/api/tip-results").catch(() => {});
  }, []);

  async function loadResults() {
    setLoading(true);
    if (!supabase) {
      setLoading(false);
      return;
    }

    // Load stats
    const { data: statsData } = await supabase.from("tip_stats").select("*").single();
    if (statsData) setStats(statsData);

    // Load recent tips
    const { data: tips } = await supabase
      .from("daily_tips")
      .select("*")
      .order("tip_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100);
    if (tips) setRecentTips(tips);

    setLoading(false);
  }

  // Group tips by date
  const tipsByDate = {};
  recentTips.forEach(tip => {
    const d = tip.tip_date;
    if (!tipsByDate[d]) tipsByDate[d] = [];
    tipsByDate[d].push(tip);
  });
  const dates = Object.keys(tipsByDate).sort((a, b) => b.localeCompare(a));

  // Filter
  const filteredDates = dates.filter(date => {
    if (timeframe === "7d") {
      const cutoff = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
      return date >= cutoff;
    }
    if (timeframe === "30d") {
      const cutoff = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
      return date >= cutoff;
    }
    return true;
  });

  // Today / yesterday labels
  const todayStr = new Date().toISOString().split("T")[0];
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const dateLabel = (d) => {
    if (d === todayStr) return "Today";
    if (d === yesterdayStr) return "Yesterday";
    return new Date(d + "T12:00:00").toLocaleDateString("en-GB", { weekday: "short", month: "short", day: "numeric" });
  };

  // Day stats
  const dayStats = (tips) => {
    const won = tips.filter(t => t.result === "won").length;
    const lost = tips.filter(t => t.result === "lost").length;
    const pending = tips.filter(t => t.result === "pending").length;
    const profit = tips.reduce((sum, t) => {
      if (t.result === "won") return sum + (t.bookmaker_odds - 1);
      if (t.result === "lost") return sum - 1;
      return sum;
    }, 0);
    return { won, lost, pending, total: tips.length, profit };
  };

  const resultColor = (r) => {
    if (r === "won") return "var(--green-400)";
    if (r === "lost") return "var(--red-400)";
    if (r === "void" || r === "postponed") return "var(--text-muted)";
    return "var(--gold-400)";
  };

  const resultIcon = (r) => {
    if (r === "won") return "✅";
    if (r === "lost") return "❌";
    if (r === "void") return "⬜";
    if (r === "postponed") return "⏸️";
    return "⏳";
  };

  return (
    <>
      <style>{RESULTS_CSS}</style>

      <div className="res-hero">
        <div className="res-badge">📊 Transparent Results</div>
        <h1 className="res-title">Tip Results & Track Record</h1>
        <p className="res-subtitle">
          Every AI tip we publish is tracked. No hiding losses, no cherry-picking wins.
          Full transparency so you can judge our accuracy for yourself.
        </p>
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>
          <div className="spinner" style={{ margin: "0 auto 12px" }} />
          Loading results...
        </div>
      )}

      {!loading && !stats && (
        <div className="card" style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Results tracking starting soon</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>
            Our AI tips are being recorded automatically. Check back after match day
            to see how our picks performed. Results are updated every 4 hours.
          </div>
        </div>
      )}

      {!loading && stats && (
        <>
          {/* Overall Stats */}
          <div className="res-stats-grid">
            <div className="res-stat-card highlight">
              <div className="res-stat-value" style={{ color: "var(--gold-400)", fontSize: 36 }}>
                {stats.win_rate}%
              </div>
              <div className="res-stat-label">Hit Rate</div>
              <div className="res-stat-detail">{stats.total_won}W - {stats.total_lost}L ({stats.total_settled} settled)</div>
            </div>
            <div className="res-stat-card">
              <div className="res-stat-value" style={{ color: stats.unit_profit >= 0 ? "var(--green-400)" : "var(--red-400)" }}>
                {stats.unit_profit >= 0 ? "+" : ""}{stats.unit_profit}u
              </div>
              <div className="res-stat-label">Unit Profit</div>
              <div className="res-stat-detail">1 unit per tip</div>
            </div>
            <div className="res-stat-card">
              <div className="res-stat-value">{stats.avg_winning_odds || "—"}x</div>
              <div className="res-stat-label">Avg Winning Odds</div>
            </div>
            <div className="res-stat-card">
              <div className="res-stat-value">{stats.total_settled}</div>
              <div className="res-stat-label">Tips Tracked</div>
            </div>
          </div>

          {/* Period Stats */}
          <div className="res-period-row">
            <div className="res-period">
              <div className="res-period-title">Last 7 Days</div>
              <div className="res-period-record">
                <span style={{ color: "var(--green-400)" }}>{stats.won_7d}W</span>
                {" - "}
                <span style={{ color: "var(--red-400)" }}>{stats.lost_7d}L</span>
                {stats.settled_7d > 0 && (
                  <span style={{ color: "var(--text-muted)" }}>
                    {" "}({Math.round((stats.won_7d / Math.max(stats.won_7d + stats.lost_7d, 1)) * 100)}%)
                  </span>
                )}
              </div>
            </div>
            <div className="res-period">
              <div className="res-period-title">Last 30 Days</div>
              <div className="res-period-record">
                <span style={{ color: "var(--green-400)" }}>{stats.won_30d}W</span>
                {" - "}
                <span style={{ color: "var(--red-400)" }}>{stats.lost_30d}L</span>
                {stats.settled_30d > 0 && (
                  <span style={{ color: "var(--text-muted)" }}>
                    {" "}({Math.round((stats.won_30d / Math.max(stats.won_30d + stats.lost_30d, 1)) * 100)}%)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Timeframe Filter */}
          <div className="res-filters">
            {[
              { key: "7d", label: "Last 7 Days" },
              { key: "30d", label: "Last 30 Days" },
              { key: "all", label: "All Time" },
            ].map(t => (
              <button
                key={t.key}
                className={`res-filter-btn ${timeframe === t.key ? "active" : ""}`}
                onClick={() => setTimeframe(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Daily Results */}
          {filteredDates.length === 0 && (
            <div style={{ textAlign: "center", padding: 30, color: "var(--text-muted)", fontSize: 13 }}>
              No tips found for this timeframe.
            </div>
          )}

          {filteredDates.map(date => {
            const tips = tipsByDate[date];
            const ds = dayStats(tips);
            const dayProfit = ds.profit;

            return (
              <div key={date} className="res-day">
                <div className="res-day-header">
                  <div>
                    <div className="res-day-label">{dateLabel(date)}</div>
                    <div className="res-day-date">{date}</div>
                  </div>
                  <div className="res-day-summary">
                    <span style={{ color: "var(--green-400)" }}>{ds.won}W</span>
                    {" - "}
                    <span style={{ color: "var(--red-400)" }}>{ds.lost}L</span>
                    {ds.pending > 0 && <span style={{ color: "var(--gold-400)" }}> · {ds.pending} pending</span>}
                    <span style={{
                      marginLeft: 12,
                      fontFamily: "'JetBrains Mono',monospace",
                      fontWeight: 700,
                      color: dayProfit >= 0 ? "var(--green-400)" : "var(--red-400)",
                    }}>
                      {dayProfit >= 0 ? "+" : ""}{dayProfit.toFixed(2)}u
                    </span>
                  </div>
                </div>

                {tips.map(tip => (
                  <div key={tip.id} className={`res-tip ${tip.result}`}>
                    <div className="res-tip-result">{resultIcon(tip.result)}</div>
                    <div className="res-tip-info">
                      <div className="res-tip-match">
                        {tip.league_flag} {tip.home_team} vs {tip.away_team}
                      </div>
                      <div className="res-tip-market">
                        {tip.market} @ <strong>{tip.bookmaker_odds}</strong>
                        {tip.actual_score && (
                          <span className="res-tip-score">Final: {tip.actual_score}</span>
                        )}
                      </div>
                    </div>
                    <div className="res-tip-right">
                      <div className="res-tip-status" style={{ color: resultColor(tip.result) }}>
                        {tip.result === "won" ? `+${(tip.bookmaker_odds - 1).toFixed(2)}u` :
                         tip.result === "lost" ? "-1.00u" :
                         tip.result === "void" ? "Void" :
                         tip.result === "postponed" ? "PPD" :
                         "Pending"}
                      </div>
                      <div className="res-tip-meta">
                        Edge: {tip.edge > 0 ? "+" : ""}{tip.edge}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}

          {/* Methodology */}
          <div className="res-methodology">
            <h3>How We Track Results</h3>
            <p>
              Every tip published on ValueBetHub is automatically recorded with the exact odds
              at time of publication. Results are checked every 4 hours against official match
              data. Profit/loss is calculated using a flat 1-unit stake per tip. We never
              retroactively edit or remove tips — what you see is our complete, unfiltered record.
            </p>
            <p>
              <strong>Unit profit</strong> means: if you bet €10 per tip, multiply the unit profit
              by 10 to see your euro profit. A +5.2u track record means €52 profit on €10 stakes.
            </p>
          </div>
        </>
      )}
    </>
  );
}

const RESULTS_CSS = `
  .res-hero { text-align: center; padding: 8px 0 24px; }
  .res-badge { display: inline-block; padding: 5px 14px; border-radius: 20px; background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.2); color: var(--green-400); font-size: 12px; font-weight: 600; margin-bottom: 12px; }
  .res-title { font-size: 28px; font-weight: 700; margin-bottom: 4px; }
  .res-subtitle { font-size: 13px; color: var(--text-muted); max-width: 560px; margin: 0 auto; line-height: 1.6; }

  .res-stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
  @media(max-width: 640px) { .res-stats-grid { grid-template-columns: repeat(2, 1fr); } }
  .res-stat-card { background: var(--glass); border: 1px solid var(--glass-border); border-radius: 14px; padding: 18px; text-align: center; }
  .res-stat-card.highlight { border-color: rgba(212,175,55,0.3); background: linear-gradient(135deg, rgba(212,175,55,0.06), rgba(212,175,55,0.01)); }
  .res-stat-value { font-family: 'JetBrains Mono', monospace; font-size: 24px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; }
  .res-stat-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted); margin-bottom: 2px; }
  .res-stat-detail { font-size: 11px; color: var(--text-muted); }

  .res-period-row { display: flex; gap: 12px; margin-bottom: 16px; }
  @media(max-width: 480px) { .res-period-row { flex-direction: column; } }
  .res-period { flex: 1; padding: 14px 16px; border-radius: 12px; background: var(--glass); border: 1px solid var(--glass-border); }
  .res-period-title { font-size: 12px; font-weight: 600; color: var(--gold-500); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
  .res-period-record { font-family: 'JetBrains Mono', monospace; font-size: 15px; font-weight: 600; }

  .res-filters { display: flex; gap: 6px; margin-bottom: 16px; }
  .res-filter-btn { padding: 7px 14px; border-radius: 8px; border: 1px solid var(--navy-600); background: var(--navy-800); color: var(--text-secondary); font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
  .res-filter-btn.active { border-color: var(--gold-500); background: rgba(212,175,55,0.12); color: var(--gold-400); }

  .res-day { margin-bottom: 16px; }
  .res-day-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-radius: 12px 12px 0 0; background: var(--navy-800); border: 1px solid var(--navy-600); border-bottom: none; flex-wrap: wrap; gap: 8px; }
  .res-day-label { font-size: 15px; font-weight: 700; }
  .res-day-date { font-size: 11px; color: var(--text-muted); font-family: 'JetBrains Mono', monospace; }
  .res-day-summary { font-size: 14px; font-weight: 600; }

  .res-tip { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: var(--glass); border: 1px solid var(--glass-border); border-top: none; }
  .res-tip:last-child { border-radius: 0 0 12px 12px; }
  .res-tip.won { background: rgba(34,197,94,0.03); }
  .res-tip.lost { background: rgba(239,68,68,0.03); }
  .res-tip-result { font-size: 18px; flex-shrink: 0; }
  .res-tip-info { flex: 1; }
  .res-tip-match { font-size: 14px; font-weight: 600; margin-bottom: 2px; }
  .res-tip-market { font-size: 12px; color: var(--text-muted); }
  .res-tip-market strong { color: var(--text-primary); font-family: 'JetBrains Mono', monospace; }
  .res-tip-score { margin-left: 8px; color: var(--text-secondary); font-weight: 600; }
  .res-tip-right { text-align: right; flex-shrink: 0; }
  .res-tip-status { font-family: 'JetBrains Mono', monospace; font-size: 14px; font-weight: 700; }
  .res-tip-meta { font-size: 11px; color: var(--text-muted); margin-top: 2px; }

  .res-methodology { margin-top: 20px; padding: 20px; border-radius: 14px; background: var(--glass); border: 1px solid var(--glass-border); }
  .res-methodology h3 { font-size: 14px; color: var(--gold-400); margin-bottom: 10px; }
  .res-methodology p { font-size: 13px; color: var(--text-muted); line-height: 1.7; margin-bottom: 8px; }
  .res-methodology strong { color: var(--text-secondary); }
`;
