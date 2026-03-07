// src/Auth.jsx
// Login / Sign-up modal + user menu for ValueBetHub

import { useState } from "react";
import { signUp, signIn, signOut } from "./supabase.js";

// ═══════════════════════════════════════════════════════════════════════
// AUTH MODAL — Login / Sign Up
// ═══════════════════════════════════════════════════════════════════════
export function AuthModal({ onClose, onAuth }) {
  const [mode, setMode] = useState("login"); // "login" or "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (mode === "signup") {
      if (password.length < 6) {
        setError("Password must be at least 6 characters");
        setLoading(false);
        return;
      }
      const { data, error: err } = await signUp(email, password, displayName);
      if (err) {
        setError(err.message);
      } else if (data?.user?.identities?.length === 0) {
        setError("An account with this email already exists");
      } else {
        setSuccess("Check your email to confirm your account, then log in.");
        setMode("login");
      }
    } else {
      const { data, error: err } = await signIn(email, password);
      if (err) {
        setError(err.message === "Invalid login credentials" ? "Wrong email or password" : err.message);
      } else if (data?.session) {
        onAuth(data.session);
        onClose();
      }
    }
    setLoading(false);
  };

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={e => e.stopPropagation()}>
        <button className="auth-close" onClick={onClose}>✕</button>

        <div className="auth-header">
          <div className="auth-logo">V</div>
          <h2 className="auth-title">
            {mode === "login" ? "Welcome Back" : "Create Account"}
          </h2>
          <p className="auth-subtitle">
            {mode === "login"
              ? "Sign in to save slips and track your bets"
              : "Join ValueBetHub — save slips, get AI insights"}
          </p>
        </div>

        {error && (
          <div className="auth-msg auth-error">{error}</div>
        )}
        {success && (
          <div className="auth-msg auth-success">{success}</div>
        )}

        <form onSubmit={handleSubmit}>
          {mode === "signup" && (
            <div className="auth-field">
              <label>Display Name</label>
              <input
                type="text"
                placeholder="Your name"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
              />
            </div>
          )}
          <div className="auth-field">
            <label>Email</label>
            <input
              type="email"
              placeholder="you@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="auth-field">
            <label>Password</label>
            <input
              type="password"
              placeholder={mode === "signup" ? "Min 6 characters" : "Your password"}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? (
              <span className="auth-spinner" />
            ) : mode === "login" ? (
              "Sign In"
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        <div className="auth-switch">
          {mode === "login" ? (
            <>Don't have an account? <button onClick={() => { setMode("signup"); setError(null); }}>Sign Up</button></>
          ) : (
            <>Already have an account? <button onClick={() => { setMode("login"); setError(null); }}>Sign In</button></>
          )}
        </div>

        <div className="auth-footer-note">
          Free accounts can save up to 5 slips.<br />
          <span style={{ color: "var(--gold-400)" }}>Premium</span> unlocks odds alerts, AI news, and unlimited saves.
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// USER MENU — shown when logged in (top-right dropdown)
// ═══════════════════════════════════════════════════════════════════════
export function UserMenu({ profile, onNavigate, onSignOut }) {
  const [open, setOpen] = useState(false);
  const initials = (profile?.display_name || profile?.email || "U")
    .split(" ")
    .map(w => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const isPremium = profile?.tier === "premium";

  return (
    <div className="user-menu-wrapper">
      <button className="user-menu-trigger" onClick={() => setOpen(!open)}>
        <div className={`user-avatar ${isPremium ? "premium" : ""}`}>
          {initials}
        </div>
        <span className="user-menu-name">
          {profile?.display_name || "Account"}
        </span>
        {isPremium && <span className="premium-badge">PRO</span>}
        <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="user-dropdown">
          <div className="user-dropdown-header">
            <div style={{ fontSize: 13, fontWeight: 600 }}>{profile?.display_name}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{profile?.email}</div>
            <div style={{ fontSize: 11, marginTop: 4 }}>
              {isPremium ? (
                <span style={{ color: "var(--gold-400)", fontWeight: 600 }}>Premium Member</span>
              ) : (
                <span style={{ color: "var(--text-muted)" }}>Free Plan · 5 slip limit</span>
              )}
            </div>
          </div>
          <button className="user-dropdown-item" onClick={() => { setOpen(false); onNavigate("dashboard"); }}>
            📊 My Slips
          </button>
          {!isPremium && (
            <button className="user-dropdown-item upgrade" onClick={() => { setOpen(false); onNavigate("upgrade"); }}>
              ⭐ Upgrade to Premium
            </button>
          )}
          <button className="user-dropdown-item" onClick={() => { setOpen(false); onNavigate("settings"); }}>
            ⚙️ Settings
          </button>
          <div className="user-dropdown-divider" />
          <button className="user-dropdown-item signout" onClick={() => { setOpen(false); onSignOut(); }}>
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════
export const AUTH_CSS = `
  /* ─── OVERLAY ───────────────────────────────────────────── */
  .auth-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.7);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 16px;
    animation: authFadeIn 0.2s ease;
  }
  @keyframes authFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  .auth-modal {
    background: var(--navy-900);
    border: 1px solid var(--glass-border);
    border-radius: 20px;
    padding: 36px 32px;
    width: 100%;
    max-width: 400px;
    position: relative;
    animation: authSlideUp 0.3s ease;
  }
  @keyframes authSlideUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .auth-close {
    position: absolute;
    top: 16px;
    right: 16px;
    background: none;
    border: none;
    color: var(--text-muted);
    font-size: 18px;
    cursor: pointer;
    padding: 4px;
    transition: color 0.2s;
  }
  .auth-close:hover { color: var(--text-primary); }

  .auth-header {
    text-align: center;
    margin-bottom: 24px;
  }
  .auth-logo {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: linear-gradient(135deg, var(--gold-500), var(--gold-300));
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    font-weight: 700;
    color: var(--navy-950);
    margin: 0 auto 12px;
  }
  .auth-title {
    font-size: 22px;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 4px;
  }
  .auth-subtitle {
    font-size: 13px;
    color: var(--text-muted);
  }

  .auth-msg {
    padding: 10px 14px;
    border-radius: 8px;
    font-size: 13px;
    margin-bottom: 16px;
    line-height: 1.5;
  }
  .auth-error {
    background: rgba(239,68,68,0.1);
    border: 1px solid rgba(239,68,68,0.2);
    color: var(--red-400);
  }
  .auth-success {
    background: rgba(34,197,94,0.1);
    border: 1px solid rgba(34,197,94,0.2);
    color: var(--green-400);
  }

  .auth-field {
    margin-bottom: 14px;
  }
  .auth-field label {
    display: block;
    font-size: 12px;
    font-weight: 500;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 6px;
  }
  .auth-field input {
    width: 100%;
    background: var(--navy-800);
    border: 1px solid var(--navy-600);
    border-radius: 10px;
    padding: 12px 14px;
    font-size: 15px;
    font-family: 'DM Sans', sans-serif;
    color: var(--text-primary);
    outline: none;
    transition: border-color 0.2s;
  }
  .auth-field input:focus {
    border-color: var(--gold-500);
    box-shadow: 0 0 0 3px rgba(212,175,55,0.1);
  }
  .auth-field input::placeholder {
    color: var(--text-muted);
  }

  .auth-submit {
    width: 100%;
    padding: 14px;
    border: none;
    border-radius: 12px;
    background: linear-gradient(135deg, var(--gold-500), var(--gold-300));
    color: var(--navy-950);
    font-family: 'DM Sans', sans-serif;
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
    margin-top: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .auth-submit:hover {
    transform: translateY(-1px);
    box-shadow: 0 0 30px rgba(212,175,55,0.2);
  }
  .auth-submit:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
  .auth-spinner {
    width: 20px;
    height: 20px;
    border: 3px solid rgba(19,26,43,0.3);
    border-top-color: var(--navy-950);
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  .auth-switch {
    text-align: center;
    font-size: 13px;
    color: var(--text-muted);
    margin-top: 16px;
  }
  .auth-switch button {
    background: none;
    border: none;
    color: var(--gold-400);
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    padding: 0;
  }
  .auth-switch button:hover {
    text-decoration: underline;
  }
  .auth-footer-note {
    text-align: center;
    font-size: 11px;
    color: var(--text-muted);
    margin-top: 16px;
    line-height: 1.6;
    padding-top: 16px;
    border-top: 1px solid var(--navy-700);
  }

  /* ─── USER MENU ─────────────────────────────────────────── */
  .user-menu-wrapper {
    position: relative;
  }
  .user-menu-trigger {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px 6px 6px;
    border-radius: 12px;
    border: 1px solid var(--navy-600);
    background: var(--navy-800);
    cursor: pointer;
    transition: all 0.2s;
    font-family: 'DM Sans', sans-serif;
  }
  .user-menu-trigger:hover {
    border-color: var(--navy-400);
  }
  .user-avatar {
    width: 30px;
    height: 30px;
    border-radius: 8px;
    background: var(--navy-600);
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 700;
  }
  .user-avatar.premium {
    background: linear-gradient(135deg, var(--gold-500), var(--gold-300));
    color: var(--navy-950);
  }
  .user-menu-name {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-primary);
    max-width: 100px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .premium-badge {
    font-size: 10px;
    font-weight: 700;
    color: var(--navy-950);
    background: linear-gradient(135deg, var(--gold-500), var(--gold-300));
    padding: 2px 6px;
    border-radius: 4px;
    letter-spacing: 0.5px;
  }

  .user-dropdown {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    width: 220px;
    background: var(--navy-800);
    border: 1px solid var(--navy-600);
    border-radius: 14px;
    padding: 8px;
    z-index: 100;
    animation: authFadeIn 0.15s ease;
    box-shadow: 0 12px 40px rgba(0,0,0,0.4);
  }
  .user-dropdown-header {
    padding: 10px 12px;
    border-bottom: 1px solid var(--navy-700);
    margin-bottom: 4px;
  }
  .user-dropdown-item {
    display: block;
    width: 100%;
    text-align: left;
    padding: 10px 12px;
    border: none;
    background: none;
    color: var(--text-secondary);
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    border-radius: 8px;
    transition: all 0.15s;
  }
  .user-dropdown-item:hover {
    background: rgba(255,255,255,0.04);
    color: var(--text-primary);
  }
  .user-dropdown-item.upgrade {
    color: var(--gold-400);
  }
  .user-dropdown-item.upgrade:hover {
    background: rgba(212,175,55,0.08);
  }
  .user-dropdown-item.signout {
    color: var(--red-400);
  }
  .user-dropdown-item.signout:hover {
    background: rgba(239,68,68,0.08);
  }
  .user-dropdown-divider {
    height: 1px;
    background: var(--navy-700);
    margin: 4px 0;
  }

  /* ─── LOGIN PROMPT (shown on save) ──────────────────────── */
  .login-prompt {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    border-radius: 10px;
    background: rgba(212,175,55,0.06);
    border: 1px solid rgba(212,175,55,0.15);
    font-size: 13px;
    color: var(--text-secondary);
    margin-top: 12px;
    cursor: pointer;
    transition: all 0.2s;
  }
  .login-prompt:hover {
    border-color: var(--gold-500);
    background: rgba(212,175,55,0.1);
  }
  .login-prompt-cta {
    color: var(--gold-400);
    font-weight: 600;
  }
`;
