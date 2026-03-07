// src/Dashboard.jsx
// User dashboard — saved slips, premium upsell, settings

import { useState, useEffect } from "react";
import { getSavedSlips, deleteSlip, updateSlipStatus, toggleOddsAlert, getSavedSlipCount } from "./supabase.js";

// ═══════════════════════════════════════════════════════════════════════
// DASHBOARD — Saved Slips
// ═══════════════════════════════════════════════════════════════════════
export function DashboardPage({ user, profile, onNavigate }) {
  const [slips, setSlips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedSlip, setExpandedSlip] = useState(null);
  const [filter, setFilter] = useState("all"); // all, active, won, lost

  const isPremium = profile?.tier === "premium";
  const FREE_LIMIT = 5;

  useEffect(() => {
    loadSlips();
  }, [user]);

  async function loadSlips() {
    setLoading(true);
    const data = await getSavedSlips(user.id);
    setSlips(data);
    setLoading(false);
  }

  async function handleDelete(slipId) {
    if (!confirm("Delete this slip? This can't be undone.")) return;
    await deleteSlip(slipId);
    setSlips(prev => prev.filter(s => s.id !== slipId));
  }

  async function handleStatusChange(slipId, status) {
    const slip = slips.find(s => s.id === slipId);
    let profit = null;
    if (status === "won" && slip) {
      profit = (slip.stake * slip.combined_odds) - slip.stake;
    } else if (status === "lost") {
      profit = -slip.stake;
    }
    await updateSlipStatus(slipId, status, profit);
    setSlips(prev => prev.map(s => s.id === slipId ? { ...s, status, result_profit: profit } : s));
  }

  async function handleToggleAlert(slipId, enabled) {
    if (!isPremium) return;
    await toggleOddsAlert(user.id, slipId, enabled);
    setSlips(prev => prev.map(s => s.id === slipId ? { ...s, notify_odds_change: enabled } : s));
  }

  const filteredSlips = filter === "all" ? slips : slips.filter(s => s.status === filter);

  // Stats
  const totalSlips = slips.length;
  const wonSlips = slips.filter(s => s.status === "won").length;
  const lostSlips = slips.filter(s => s.status === "lost").length;
  const totalProfit = slips.reduce((sum, s) => sum + (s.result_profit || 0), 0);
  const winRate = (wonSlips + lostSlips) > 0 ? Math.round((wonSlips / (wonSlips + lostSlips)) * 100) : 0;

  return (
    <>
      <style>{DASH_CSS}</style>

      <div className="dash-header">
        <h1 className="dash-title">My Slips</h1>
        <p className="dash-subtitle">
          {totalSlips} saved · {wonSlips}W-{lostSlips}L
          {!isPremium && ` · ${FREE_LIMIT - totalSlips} saves remaining`}
        </p>
      </div>

      {/* Stats Row */}
      {slips.length > 0 && (
        <div className="dash-stats">
          <div className="dash-stat">
            <div className="dash-stat-label">Total Slips</div>
            <div className="dash-stat-value">{totalSlips}</div>
          </div>
          <div className="dash-stat">
            <div className="dash-stat-label">Win Rate</div>
            <div className="dash-stat-value" style={{ color: winRate >= 50 ? "var(--green-400)" : winRate > 0 ? "var(--orange-500)" : "var(--text-muted)" }}>
              {wonSlips + lostSlips > 0 ? `${winRate}%` : "—"}
            </div>
          </div>
          <div className="dash-stat">
            <div className="dash-stat-label">Profit/Loss</div>
            <div className="dash-stat-value" style={{ color: totalProfit >= 0 ? "var(--green-400)" : "var(--red-400)" }}>
              {totalProfit >= 0 ? "+" : ""}€{totalProfit.toFixed(2)}
            </div>
          </div>
          <div className="dash-stat">
            <div className="dash-stat-label">Record</div>
            <div className="dash-stat-value" style={{ fontSize: 16 }}>
              <span style={{ color: "var(--green-400)" }}>{wonSlips}W</span>
              {" - "}
              <span style={{ color: "var(--red-400)" }}>{lostSlips}L</span>
            </div>
          </div>
        </div>
      )}

      {/* Premium Upsell (for free users) */}
      {!isPremium && (
        <div className="dash-upsell" onClick={() => onNavigate("upgrade")}>
          <div className="dash-upsell-icon">⭐</div>
          <div className="dash-upsell-content">
            <div className="dash-upsell-title">Upgrade to Premium</div>
            <div className="dash-upsell-features">
              Unlimited saves · Real-time odds alerts · AI news feed · Priority picks
            </div>
          </div>
          <div className="dash-upsell-price">
            €9.99<span>/mo</span>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      {slips.length > 0 && (
        <div className="dash-filters">
          {[
            { key: "all", label: "All", count: totalSlips },
            { key: "active", label: "Active", count: slips.filter(s => s.status === "active").length },
            { key: "won", label: "Won", count: wonSlips },
            { key: "lost", label: "Lost", count: lostSlips },
          ].map(f => (
            <button
              key={f.key}
              className={`dash-filter ${filter === f.key ? "active" : ""}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label} <span className="dash-filter-count">{f.count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
          <div className="spinner" style={{ margin: "0 auto 12px" }} />
          Loading your slips...
        </div>
      )}

      {/* Empty state */}
      {!loading && slips.length === 0 && (
        <div className="dash-empty">
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>No saved slips yet</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16, lineHeight: 1.6 }}>
            Generate a slip in the generator and hit "Save Slip" to track it here.
          </div>
          <button
            className="gen-btn"
            style={{ maxWidth: 200, margin: "0 auto" }}
            onClick={() => onNavigate(null)}
          >
            Go to Generator
          </button>
        </div>
      )}

      {/* Slip Cards */}
      {!loading && filteredSlips.map((slip, i) => {
        const isExpanded = expandedSlip === slip.id;
        const selections = slip.slip_selections || [];
        const statusColors = {
          active: { bg: "rgba(59,130,246,0.08)", border: "rgba(59,130,246,0.15)", color: "var(--blue-500)", label: "Active" },
          won: { bg: "rgba(34,197,94,0.08)", border: "rgba(34,197,94,0.15)", color: "var(--green-400)", label: "Won ✓" },
          lost: { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.15)", color: "var(--red-400)", label: "Lost ✕" },
          void: { bg: "rgba(148,163,184,0.08)", border: "rgba(148,163,184,0.15)", color: "var(--text-muted)", label: "Void" },
          expired: { bg: "rgba(148,163,184,0.08)", border: "rgba(148,163,184,0.15)", color: "var(--text-muted)", label: "Expired" },
        };
        const st = statusColors[slip.status] || statusColors.active;
        const potentialReturn = (slip.stake * slip.combined_odds).toFixed(2);

        return (
          <div key={slip.id} className="dash-slip" style={{ animationDelay: `${i * 0.05}s` }}>
            <div className="dash-slip-top">
              <div>
                <div className="dash-slip-name">{slip.name || "Untitled Slip"}</div>
                <div className="dash-slip-meta">
                  {selections.length} legs · {slip.risk_level} · Saved {new Date(slip.created_at).toLocaleDateString()}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div className="dash-slip-status" style={{ background: st.bg, border: `1px solid ${st.border}`, color: st.color }}>
                  {st.label}
                </div>
              </div>
            </div>

            <div className="dash-slip-numbers">
              <div>
                <div className="dash-num-label">Stake</div>
                <div className="dash-num-value">€{slip.stake}</div>
              </div>
              <div>
                <div className="dash-num-label">Odds</div>
                <div className="dash-num-value">{slip.combined_odds}x</div>
              </div>
              <div>
                <div className="dash-num-label">Return</div>
                <div className="dash-num-value" style={{ color: "var(--gold-400)" }}>€{potentialReturn}</div>
              </div>
              <div>
                <div className="dash-num-label">Win Prob</div>
                <div className="dash-num-value">{slip.win_probability}%</div>
              </div>
              <div>
                <div className="dash-num-label">Edge</div>
                <div className="dash-num-value" style={{ color: slip.avg_edge > 0 ? "var(--green-400)" : "var(--red-400)" }}>
                  {slip.avg_edge > 0 ? "+" : ""}{slip.avg_edge}%
                </div>
              </div>
            </div>

            {/* Odds alert toggle (premium) */}
            {slip.status === "active" && (
              <div className="dash-alert-row">
                <label className="dash-alert-toggle">
                  <input
                    type="checkbox"
                    checked={slip.notify_odds_change}
                    onChange={(e) => {
                      if (!isPremium) { onNavigate("upgrade"); return; }
                      handleToggleAlert(slip.id, e.target.checked);
                    }}
                  />
                  <span className="dash-alert-slider" />
                  <span className="dash-alert-text">
                    {isPremium ? "Notify me when odds change" : "🔒 Odds alerts (Premium)"}
                  </span>
                </label>
              </div>
            )}

            {/* Expand selections */}
            <button
              className="analysis-toggle"
              onClick={() => setExpandedSlip(isExpanded ? null : slip.id)}
            >
              {isExpanded ? "▾ Hide selections" : `▸ Show ${selections.length} selections`}
            </button>

            {isExpanded && (
              <div className="dash-selections">
                {selections.map(sel => (
                  <div key={sel.id} className="dash-sel-row">
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>
                        {sel.home_team} vs {sel.away_team}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        {sel.league_flag} {sel.league} · {sel.match_time} · {sel.market}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 16, fontWeight: 700 }}>
                        {sel.bookmaker_odds}
                      </div>
                      {sel.odds_movement !== 0 && (
                        <div style={{
                          fontSize: 11,
                          fontFamily: "'JetBrains Mono',monospace",
                          color: sel.odds_movement > 0 ? "var(--green-400)" : "var(--red-400)",
                        }}>
                          {sel.odds_movement > 0 ? "↑" : "↓"} {Math.abs(sel.odds_movement).toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="dash-slip-actions">
              {slip.status === "active" && (
                <>
                  <button className="dash-action won" onClick={() => handleStatusChange(slip.id, "won")}>✓ Won</button>
                  <button className="dash-action lost" onClick={() => handleStatusChange(slip.id, "lost")}>✕ Lost</button>
                </>
              )}
              {slip.result_profit !== null && slip.result_profit !== undefined && (
                <span className="dash-profit" style={{ color: slip.result_profit >= 0 ? "var(--green-400)" : "var(--red-400)" }}>
                  {slip.result_profit >= 0 ? "+" : ""}€{slip.result_profit.toFixed(2)}
                </span>
              )}
              <button className="dash-action delete" onClick={() => handleDelete(slip.id)}>🗑</button>
            </div>
          </div>
        );
      })}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// UPGRADE PAGE — Premium upsell
// ═══════════════════════════════════════════════════════════════════════
export function UpgradePage({ profile }) {
  const isPremium = profile?.tier === "premium";

  if (isPremium) {
    return (
      <div className="upgrade-active">
        <div style={{ fontSize: 48, marginBottom: 16 }}>⭐</div>
        <h2>You're a Premium Member</h2>
        <p style={{ color: "var(--text-muted)", marginTop: 8 }}>
          Enjoy unlimited saves, odds alerts, and AI news. Thank you for your support!
        </p>
      </div>
    );
  }

  return (
    <>
      <style>{UPGRADE_CSS}</style>
      <div className="upgrade-page">
        <div className="upgrade-hero">
          <div className="upgrade-badge">⭐ PREMIUM</div>
          <h1 className="upgrade-title">Unlock the Full Edge</h1>
          <p className="upgrade-subtitle">
            Everything in Free, plus the tools that serious bettors need.
          </p>
        </div>

        <div className="upgrade-comparison">
          {/* Free column */}
          <div className="upgrade-plan">
            <div className="plan-header">
              <div className="plan-name">Free</div>
              <div className="plan-price">€0</div>
            </div>
            <div className="plan-features">
              <div className="plan-feature">✓ Smart Slip Generator</div>
              <div className="plan-feature">✓ Today's Tips (AI picks)</div>
              <div className="plan-feature">✓ Full analysis breakdowns</div>
              <div className="plan-feature">✓ Save up to 5 slips</div>
              <div className="plan-feature dim">✕ Odds change alerts</div>
              <div className="plan-feature dim">✕ AI news summaries</div>
              <div className="plan-feature dim">✕ Unlimited saves</div>
              <div className="plan-feature dim">✕ Priority support</div>
            </div>
            <div className="plan-current">Current Plan</div>
          </div>

          {/* Premium column */}
          <div className="upgrade-plan premium">
            <div className="plan-popular">Most Popular</div>
            <div className="plan-header">
              <div className="plan-name">Premium</div>
              <div className="plan-price">€9.99<span>/month</span></div>
            </div>
            <div className="plan-features">
              <div className="plan-feature">✓ Everything in Free</div>
              <div className="plan-feature gold">✓ Unlimited saved slips</div>
              <div className="plan-feature gold">✓ Real-time odds alerts</div>
              <div className="plan-feature gold">✓ AI news feed (why odds moved)</div>
              <div className="plan-feature gold">✓ Priority picks & insights</div>
              <div className="plan-feature gold">✓ Slip result tracking & stats</div>
              <div className="plan-feature gold">✓ Export history (CSV)</div>
              <div className="plan-feature gold">✓ Priority support</div>
            </div>
            <button className="plan-cta" onClick={() => {
              // TODO: Stripe checkout integration
              alert("Stripe payment integration coming soon! Premium features will be available shortly.");
            }}>
              Start Premium — €9.99/mo
            </button>
            <div className="plan-note">Cancel anytime · 7-day money-back guarantee</div>
          </div>
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// SETTINGS PAGE
// ═══════════════════════════════════════════════════════════════════════
export function SettingsPage({ profile }) {
  return (
    <div style={{ maxWidth: 500 }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>Account Settings</h2>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">Profile</div>
        <div style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 8 }}>
          <strong>Name:</strong> {profile?.display_name || "—"}
        </div>
        <div style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 8 }}>
          <strong>Email:</strong> {profile?.email || "—"}
        </div>
        <div style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          <strong>Plan:</strong>{" "}
          <span style={{ color: profile?.tier === "premium" ? "var(--gold-400)" : "var(--text-muted)" }}>
            {profile?.tier === "premium" ? "Premium ⭐" : "Free"}
          </span>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Notifications</div>
        <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>
          Email notification preferences will be available here when the odds alert system goes live.
          Premium members will be able to configure alert thresholds and choose which types of
          notifications to receive.
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// DASHBOARD STYLES
// ═══════════════════════════════════════════════════════════════════════
const DASH_CSS = `
  .dash-header {
    margin-bottom: 20px;
  }
  .dash-title {
    font-size: 26px;
    font-weight: 700;
    margin-bottom: 4px;
  }
  .dash-subtitle {
    font-size: 13px;
    color: var(--text-muted);
  }

  /* Stats */
  .dash-stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    margin-bottom: 16px;
  }
  @media (max-width: 560px) { .dash-stats { grid-template-columns: repeat(2, 1fr); } }
  .dash-stat {
    background: var(--glass);
    border: 1px solid var(--glass-border);
    border-radius: 12px;
    padding: 14px;
    text-align: center;
  }
  .dash-stat-label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--text-muted);
    margin-bottom: 4px;
  }
  .dash-stat-value {
    font-family: 'JetBrains Mono', monospace;
    font-size: 20px;
    font-weight: 700;
    color: var(--text-primary);
  }

  /* Upsell */
  .dash-upsell {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 16px 18px;
    border-radius: 14px;
    background: linear-gradient(135deg, rgba(212,175,55,0.08), rgba(212,175,55,0.02));
    border: 1px solid rgba(212,175,55,0.2);
    margin-bottom: 16px;
    cursor: pointer;
    transition: all 0.2s;
  }
  .dash-upsell:hover {
    border-color: var(--gold-500);
    transform: translateY(-1px);
  }
  .dash-upsell-icon { font-size: 28px; }
  .dash-upsell-content { flex: 1; }
  .dash-upsell-title {
    font-size: 15px;
    font-weight: 700;
    color: var(--gold-400);
    margin-bottom: 2px;
  }
  .dash-upsell-features {
    font-size: 12px;
    color: var(--text-muted);
  }
  .dash-upsell-price {
    font-family: 'JetBrains Mono', monospace;
    font-size: 20px;
    font-weight: 700;
    color: var(--gold-400);
  }
  .dash-upsell-price span {
    font-size: 12px;
    color: var(--text-muted);
    font-weight: 400;
  }

  /* Filters */
  .dash-filters {
    display: flex;
    gap: 6px;
    margin-bottom: 16px;
    flex-wrap: wrap;
  }
  .dash-filter {
    padding: 7px 14px;
    border-radius: 8px;
    border: 1px solid var(--navy-600);
    background: var(--navy-800);
    color: var(--text-secondary);
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .dash-filter.active {
    border-color: var(--gold-500);
    background: rgba(212,175,55,0.12);
    color: var(--gold-400);
  }
  .dash-filter-count {
    font-size: 11px;
    opacity: 0.7;
  }

  /* Empty */
  .dash-empty {
    text-align: center;
    padding: 40px 20px;
    background: var(--glass);
    border: 1px solid var(--glass-border);
    border-radius: 16px;
  }

  /* Slip card */
  .dash-slip {
    background: var(--glass);
    border: 1px solid var(--glass-border);
    border-radius: 14px;
    padding: 20px;
    margin-bottom: 12px;
    animation: slideIn 0.3s ease both;
  }
  .dash-slip-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 14px;
    flex-wrap: wrap;
  }
  .dash-slip-name {
    font-size: 16px;
    font-weight: 700;
    margin-bottom: 2px;
  }
  .dash-slip-meta {
    font-size: 12px;
    color: var(--text-muted);
  }
  .dash-slip-status {
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
  }
  .dash-slip-numbers {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
    padding: 12px 14px;
    border-radius: 10px;
    background: var(--navy-800);
    margin-bottom: 12px;
  }
  .dash-num-label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: var(--text-muted);
    margin-bottom: 2px;
  }
  .dash-num-value {
    font-family: 'JetBrains Mono', monospace;
    font-size: 15px;
    font-weight: 700;
    color: var(--text-primary);
  }

  /* Alert toggle */
  .dash-alert-row {
    margin-bottom: 8px;
  }
  .dash-alert-toggle {
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
    font-size: 12px;
  }
  .dash-alert-toggle input { display: none; }
  .dash-alert-slider {
    width: 34px;
    height: 18px;
    border-radius: 9px;
    background: var(--navy-600);
    position: relative;
    transition: background 0.2s;
    flex-shrink: 0;
  }
  .dash-alert-slider::after {
    content: '';
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--text-muted);
    position: absolute;
    top: 2px;
    left: 2px;
    transition: all 0.2s;
  }
  .dash-alert-toggle input:checked + .dash-alert-slider {
    background: var(--gold-500);
  }
  .dash-alert-toggle input:checked + .dash-alert-slider::after {
    left: 18px;
    background: var(--navy-950);
  }
  .dash-alert-text {
    color: var(--text-muted);
  }

  /* Selections list */
  .dash-selections {
    margin: 8px 0 12px;
  }
  .dash-sel-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    border-radius: 8px;
    background: var(--navy-800);
    margin-bottom: 4px;
  }

  /* Actions */
  .dash-slip-actions {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-top: 8px;
  }
  .dash-action {
    padding: 6px 14px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 600;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
    border: 1px solid;
    transition: all 0.2s;
    background: transparent;
  }
  .dash-action.won {
    border-color: var(--green-500);
    color: var(--green-400);
  }
  .dash-action.won:hover { background: rgba(34,197,94,0.1); }
  .dash-action.lost {
    border-color: var(--red-500);
    color: var(--red-400);
  }
  .dash-action.lost:hover { background: rgba(239,68,68,0.1); }
  .dash-action.delete {
    border-color: var(--navy-600);
    color: var(--text-muted);
    margin-left: auto;
  }
  .dash-action.delete:hover { background: rgba(239,68,68,0.08); color: var(--red-400); }
  .dash-profit {
    font-family: 'JetBrains Mono', monospace;
    font-size: 14px;
    font-weight: 700;
  }
`;

const UPGRADE_CSS = `
  .upgrade-page {
    max-width: 700px;
    margin: 0 auto;
  }
  .upgrade-hero {
    text-align: center;
    margin-bottom: 32px;
  }
  .upgrade-badge {
    display: inline-block;
    padding: 5px 16px;
    border-radius: 20px;
    background: linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05));
    border: 1px solid rgba(212,175,55,0.3);
    color: var(--gold-400);
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 1px;
    margin-bottom: 14px;
  }
  .upgrade-title {
    font-size: 30px;
    font-weight: 700;
    margin-bottom: 8px;
  }
  .upgrade-subtitle {
    font-size: 15px;
    color: var(--text-muted);
  }
  .upgrade-active {
    text-align: center;
    padding: 60px 20px;
  }
  .upgrade-active h2 {
    font-size: 24px;
    color: var(--gold-400);
  }

  .upgrade-comparison {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }
  @media (max-width: 560px) {
    .upgrade-comparison { grid-template-columns: 1fr; }
  }
  .upgrade-plan {
    background: var(--glass);
    border: 1px solid var(--glass-border);
    border-radius: 16px;
    padding: 24px;
    position: relative;
  }
  .upgrade-plan.premium {
    border-color: var(--gold-500);
    background: linear-gradient(135deg, rgba(212,175,55,0.06), rgba(212,175,55,0.01));
  }
  .plan-popular {
    position: absolute;
    top: -10px;
    left: 50%;
    transform: translateX(-50%);
    padding: 3px 14px;
    border-radius: 10px;
    background: linear-gradient(135deg, var(--gold-500), var(--gold-300));
    color: var(--navy-950);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.5px;
  }
  .plan-header {
    margin-bottom: 20px;
  }
  .plan-name {
    font-size: 16px;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 4px;
  }
  .plan-price {
    font-family: 'JetBrains Mono', monospace;
    font-size: 28px;
    font-weight: 700;
    color: var(--text-primary);
  }
  .plan-price span {
    font-size: 14px;
    color: var(--text-muted);
    font-weight: 400;
  }
  .plan-features {
    margin-bottom: 20px;
  }
  .plan-feature {
    font-size: 13px;
    color: var(--text-secondary);
    padding: 5px 0;
  }
  .plan-feature.dim {
    color: var(--text-muted);
    opacity: 0.5;
  }
  .plan-feature.gold {
    color: var(--gold-400);
  }
  .plan-current {
    text-align: center;
    padding: 12px;
    border-radius: 10px;
    background: var(--navy-800);
    color: var(--text-muted);
    font-size: 13px;
    font-weight: 600;
  }
  .plan-cta {
    width: 100%;
    padding: 14px;
    border: none;
    border-radius: 12px;
    background: linear-gradient(135deg, var(--gold-500), var(--gold-300));
    color: var(--navy-950);
    font-family: 'DM Sans', sans-serif;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
  }
  .plan-cta:hover {
    transform: translateY(-1px);
    box-shadow: 0 0 30px rgba(212,175,55,0.2);
  }
  .plan-note {
    text-align: center;
    font-size: 11px;
    color: var(--text-muted);
    margin-top: 10px;
  }
`;
