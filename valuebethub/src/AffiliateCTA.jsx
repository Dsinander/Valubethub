// src/AffiliateCTA.jsx
// Smart affiliate call-to-action buttons
// Placed on tips, league tips, match previews, and generator results
//
// HOW TO ACTIVATE:
// When your affiliate program is approved, update the BOOKMAKERS config below
// with your actual affiliate links. That's it — all buttons site-wide update.

// ═══════════════════════════════════════════════════════════════════════
// AFFILIATE CONFIGURATION — update these when you get affiliate links
// ═══════════════════════════════════════════════════════════════════════
const BOOKMAKERS = [
  {
    name: "1xBet",
    slug: "1xbet",
    url: "https://refpa14435.com/L?tag=d_5343575m_1599c_5343575&site=5343575&ad=1599&r=registration",
    bonus: "Up to €100 Welcome Bonus",
    color: "#1a5fb4",
    active: true,
  },
  {
    name: "Bet365",
    slug: "bet365",
    url: "#",
    bonus: "Open Account Offer",
    color: "#026b3a",
    active: false,
  },
  {
    name: "Betway",
    slug: "betway",
    url: "#",
    bonus: "€30 in Free Bets",
    color: "#00a826",
    active: false,
  },
  {
    name: "LeoVegas",
    slug: "leovegas",
    url: "#",
    bonus: "Risk Free First Bet",
    color: "#ff6600",
    active: false,
  },
];

const activeBookmakers = BOOKMAKERS.filter(b => b.active);
const hasAffiliates = activeBookmakers.length > 0;

// ─── SINGLE CTA BUTTON (for tip cards) ──────────────────────────────
export function AffiliateTipButton({ market, odds }) {
  if (!hasAffiliates) return null;
  const bookie = activeBookmakers[0]; // Primary partner

  return (
    <a
      href={bookie.url}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className="aff-tip-btn"
      onClick={() => trackClick(bookie.slug, "tip")}
    >
      Place this bet at {bookie.name} →
    </a>
  );
}

// ─── MULTI-BOOKMAKER CTA (for match previews) ───────────────────────
export function AffiliateMatchButtons() {
  if (!hasAffiliates) return null;

  return (
    <div className="aff-match-section">
      <div className="aff-match-title">Place your bets</div>
      <div className="aff-match-grid">
        {activeBookmakers.map(bookie => (
          <a
            key={bookie.slug}
            href={bookie.url}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="aff-bookie-card"
            style={{ borderColor: bookie.color + "40" }}
            onClick={() => trackClick(bookie.slug, "preview")}
          >
            <div className="aff-bookie-name" style={{ color: bookie.color }}>{bookie.name}</div>
            <div className="aff-bookie-bonus">{bookie.bonus}</div>
            <div className="aff-bookie-cta">Visit {bookie.name} →</div>
          </a>
        ))}
      </div>
      <div className="aff-disclaimer">
        18+ | T&Cs apply | Gamble responsibly | Ad
      </div>
    </div>
  );
}

// ─── SLIP RESULT CTA (shown after generating a slip) ────────────────
export function AffiliateSlipButton() {
  if (!hasAffiliates) return null;
  const bookie = activeBookmakers[0];

  return (
    <a
      href={bookie.url}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className="aff-slip-btn"
      onClick={() => trackClick(bookie.slug, "slip")}
    >
      <div className="aff-slip-left">
        <div className="aff-slip-text">Place this accumulator</div>
        <div className="aff-slip-bookie">on {bookie.name} — {bookie.bonus}</div>
      </div>
      <div className="aff-slip-arrow">→</div>
    </a>
  );
}

// ─── BANNER CTA (for between content sections) ─────────────────────
export function AffiliateBanner({ position }) {
  if (!hasAffiliates) return null;
  const bookie = activeBookmakers[Math.floor(Math.random() * activeBookmakers.length)];

  return (
    <a
      href={bookie.url}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className="aff-banner"
      onClick={() => trackClick(bookie.slug, `banner_${position}`)}
    >
      <span className="aff-banner-text">
        🎁 New to {bookie.name}? {bookie.bonus}
      </span>
      <span className="aff-banner-cta">Claim Now →</span>
    </a>
  );
}

// ─── CLICK TRACKING ─────────────────────────────────────────────────
function trackClick(bookie, placement) {
  // Basic tracking — can be enhanced with analytics later
  try {
    if (window.gtag) {
      window.gtag("event", "affiliate_click", {
        event_category: "affiliate",
        event_label: bookie,
        value: placement,
      });
    }
    console.log(`Affiliate click: ${bookie} from ${placement}`);
  } catch {}
}

// ─── STYLES ─────────────────────────────────────────────────────────
export const AFFILIATE_CSS = `
  .aff-tip-btn {
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
  .aff-tip-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 0 30px rgba(212,175,55,0.2);
  }

  .aff-match-section {
    padding: 18px;
    border-radius: 14px;
    background: var(--glass);
    border: 1px solid var(--glass-border);
    margin-bottom: 12px;
  }
  .aff-match-title {
    font-size: 13px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--gold-500);
    margin-bottom: 12px;
  }
  .aff-match-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 8px;
    margin-bottom: 8px;
  }
  .aff-bookie-card {
    padding: 14px;
    border-radius: 10px;
    border: 1px solid var(--navy-600);
    background: var(--navy-800);
    text-decoration: none;
    cursor: pointer;
    transition: all 0.2s;
    text-align: center;
  }
  .aff-bookie-card:hover {
    transform: translateY(-1px);
    border-color: var(--navy-400);
  }
  .aff-bookie-name {
    font-size: 16px;
    font-weight: 700;
    margin-bottom: 4px;
  }
  .aff-bookie-bonus {
    font-size: 11px;
    color: var(--text-muted);
    margin-bottom: 6px;
  }
  .aff-bookie-cta {
    font-size: 12px;
    color: var(--gold-400);
    font-weight: 600;
  }
  .aff-disclaimer {
    font-size: 10px;
    color: var(--text-muted);
    text-align: center;
    margin-top: 8px;
  }

  .aff-slip-btn {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 16px 20px;
    border-radius: 12px;
    background: linear-gradient(135deg, var(--gold-500), var(--gold-300));
    color: var(--navy-950);
    text-decoration: none;
    cursor: pointer;
    transition: all 0.2s;
    margin-top: 12px;
    box-shadow: 0 0 30px rgba(212,175,55,0.15);
  }
  .aff-slip-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 0 40px rgba(212,175,55,0.25);
  }
  .aff-slip-text {
    font-size: 16px;
    font-weight: 700;
  }
  .aff-slip-bookie {
    font-size: 12px;
    opacity: 0.8;
  }
  .aff-slip-arrow {
    font-size: 22px;
    font-weight: 700;
  }

  .aff-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 18px;
    border-radius: 10px;
    background: linear-gradient(135deg, rgba(212,175,55,0.08), rgba(212,175,55,0.02));
    border: 1px solid rgba(212,175,55,0.2);
    text-decoration: none;
    cursor: pointer;
    transition: all 0.2s;
    margin: 12px 0;
  }
  .aff-banner:hover {
    border-color: var(--gold-500);
  }
  .aff-banner-text {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
  }
  .aff-banner-cta {
    font-size: 13px;
    font-weight: 700;
    color: var(--gold-400);
    flex-shrink: 0;
  }
`;
