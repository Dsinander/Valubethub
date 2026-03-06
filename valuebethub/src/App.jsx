import { useState, useCallback, useEffect } from "react";
import { fetchMatchData, generateOpportunities, buildSlip, MARKET_CATEGORIES } from "./api.js";
import { AboutPage, PrivacyPage, TermsPage, ResponsibleGamblingPage, AffiliateDisclosurePage, PAGE_CSS } from "./Pages.jsx";

// ═══════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=JetBrains+Mono:wght@400;500;600&display=swap');
:root{--navy-950:#0a0f1e;--navy-900:#0f1629;--navy-800:#151d37;--navy-700:#1c2744;--navy-600:#263354;--navy-400:#4a6491;--gold-500:#d4af37;--gold-400:#e5c44e;--gold-300:#f0d56a;--green-500:#22c55e;--green-400:#4ade80;--red-500:#ef4444;--red-400:#f87171;--blue-500:#3b82f6;--orange-500:#f59e0b;--text-primary:#f1f5f9;--text-secondary:#94a3b8;--text-muted:#64748b;--glass:rgba(15,22,41,0.7);--glass-border:rgba(212,175,55,0.12)}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'DM Sans',sans-serif;background:var(--navy-950);color:var(--text-primary);-webkit-font-smoothing:antialiased}
.app{min-height:100vh;background:radial-gradient(ellipse 80% 60% at 50% -10%,rgba(212,175,55,0.06) 0%,transparent 60%),var(--navy-950)}
.inner{max-width:1100px;margin:0 auto;padding:20px 16px 60px}
.header{text-align:center;padding:32px 0 28px;position:relative}
.header::after{content:'';position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:80px;height:2px;background:linear-gradient(90deg,transparent,var(--gold-500),transparent)}
.brand{display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:6px}
.brand-icon{width:38px;height:38px;border-radius:10px;background:linear-gradient(135deg,var(--gold-500),var(--gold-300));display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;color:var(--navy-950)}
.brand-name{font-size:26px;font-weight:700;letter-spacing:-0.5px}
.brand-name span{color:var(--gold-500)}
.header-sub{color:var(--text-secondary);font-size:14px;letter-spacing:2px;text-transform:uppercase;margin-top:4px}
.card{background:var(--glass);backdrop-filter:blur(20px);border:1px solid var(--glass-border);border-radius:16px;padding:24px;margin-bottom:16px}
.card-title{font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;color:var(--gold-500);margin-bottom:20px;display:flex;align-items:center;gap:8px}
.card-title::before{content:'';width:3px;height:14px;background:var(--gold-500);border-radius:2px}
.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
@media(max-width:640px){.form-grid{grid-template-columns:1fr}}
.field{display:flex;flex-direction:column;gap:6px}
.field-label{font-size:12px;font-weight:500;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.5px}
.field-input{background:var(--navy-800);border:1px solid var(--navy-600);border-radius:10px;padding:12px 14px;font-size:16px;font-family:'JetBrains Mono',monospace;font-weight:500;color:var(--text-primary);outline:none;transition:border-color .2s;width:100%}
.field-input:focus{border-color:var(--gold-500);box-shadow:0 0 0 3px rgba(212,175,55,0.1)}
.currency-input{position:relative}
.currency-symbol{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--gold-500);font-family:'JetBrains Mono',monospace;font-weight:600;font-size:16px;pointer-events:none}
.currency-input .field-input{padding-left:30px}
.risk-options{display:flex;gap:8px}
.risk-btn{flex:1;padding:10px 8px;border-radius:10px;border:1px solid var(--navy-600);background:var(--navy-800);color:var(--text-secondary);font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;cursor:pointer;transition:all .2s;text-align:center}
.risk-btn:hover{border-color:var(--navy-400);color:var(--text-primary)}
.risk-btn.active-conservative{border-color:var(--blue-500);background:rgba(59,130,246,0.12);color:var(--blue-500)}
.risk-btn.active-balanced{border-color:var(--gold-500);background:rgba(212,175,55,0.12);color:var(--gold-400)}
.risk-btn.active-aggressive{border-color:var(--orange-500);background:rgba(245,158,11,0.12);color:var(--orange-500)}
.gen-btn{width:100%;padding:16px;border:none;border-radius:12px;background:linear-gradient(135deg,var(--gold-500),var(--gold-300));color:var(--navy-950);font-family:'DM Sans',sans-serif;font-size:16px;font-weight:700;cursor:pointer;transition:all .3s;box-shadow:0 0 30px rgba(212,175,55,0.15);margin-top:8px;display:flex;align-items:center;justify-content:center;gap:10px}
.gen-btn:hover{transform:translateY(-1px);box-shadow:0 0 40px rgba(212,175,55,0.25)}
.gen-btn:disabled{opacity:0.4;cursor:not-allowed;transform:none;box-shadow:none}
.loading-bar-track{height:4px;background:var(--navy-700);border-radius:4px;overflow:hidden;margin:20px 0}
.loading-bar-fill{height:100%;background:linear-gradient(90deg,var(--gold-500),var(--gold-300));border-radius:4px;transition:width .3s}
.sel-card{background:var(--navy-800);border:1px solid var(--navy-600);border-radius:12px;padding:16px;margin-bottom:10px;animation:slideIn .3s ease both}
@keyframes slideIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
.sel-header{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:10px;flex-wrap:wrap}
.sel-match{font-size:15px;font-weight:600}
.sel-meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:4px}
.sel-league{font-size:12px;color:var(--text-muted)}
.sel-market{font-size:12px;color:var(--gold-400);background:rgba(212,175,55,0.08);padding:2px 8px;border-radius:4px}
.sel-odds{font-family:'JetBrains Mono',monospace;font-size:20px;font-weight:700}
.sel-edge{font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:600;padding:2px 8px;border-radius:4px;margin-top:4px;display:inline-block}
.edge-pos{background:rgba(34,197,94,0.12);color:var(--green-400)}
.edge-neg{background:rgba(239,68,68,0.10);color:var(--red-400)}
.analysis-toggle{font-size:12px;color:var(--gold-400);cursor:pointer;background:none;border:none;padding:4px 0;font-family:'DM Sans',sans-serif;display:flex;align-items:center;gap:4px;margin-top:6px}
.analysis-box{margin-top:10px;padding:12px;background:var(--navy-900);border-radius:10px;border:1px solid var(--navy-700)}
.form-pills{display:flex;gap:3px;margin-top:4px}
.form-pill{width:22px;height:22px;border-radius:5px;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center}
.pill-W{background:rgba(34,197,94,0.2);color:var(--green-400)}
.pill-D{background:rgba(245,158,11,0.2);color:var(--orange-500)}
.pill-L{background:rgba(239,68,68,0.2);color:var(--red-400)}
.inj-item{font-size:12px;color:var(--red-400);padding:2px 0}
.h2h-row{font-size:12px;color:var(--text-muted);padding:2px 0}
.summary{background:linear-gradient(135deg,rgba(212,175,55,0.08),rgba(212,175,55,0.02));border:1px solid rgba(212,175,55,0.2);border-radius:14px;padding:24px;margin-top:16px}
.summary-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:16px;margin-bottom:20px}
.summary-item{text-align:center}
.summary-label{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);margin-bottom:4px}
.summary-value{font-family:'JetBrains Mono',monospace;font-size:20px;font-weight:700}
.conf-bar{height:6px;background:var(--navy-700);border-radius:6px;overflow:hidden;margin-top:6px}
.conf-fill{height:100%;border-radius:6px;transition:width .5s}
.action-buttons{display:flex;gap:10px;flex-wrap:wrap}
.action-btn{flex:1;min-width:140px;padding:12px 16px;border-radius:10px;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:600;cursor:pointer;transition:all .2s;display:flex;align-items:center;justify-content:center;gap:6px}
.action-primary{background:linear-gradient(135deg,var(--gold-500),var(--gold-300));color:var(--navy-950);border:none}
.action-secondary{background:var(--navy-800);color:var(--text-primary);border:1px solid var(--navy-600)}
.ev-badge{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:6px;font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:600}
.ev-strong{background:rgba(34,197,94,0.15);color:var(--green-400)}
.ev-good{background:rgba(59,130,246,0.15);color:var(--blue-500)}
.ev-marginal{background:rgba(245,158,11,0.15);color:var(--orange-500)}
.ev-negative{background:rgba(239,68,68,0.12);color:var(--red-400)}
.risk-warning{padding:10px 14px;border-radius:8px;margin-bottom:16px;font-size:13px;line-height:1.5}
.disclaimer{text-align:center;padding:20px;font-size:12px;color:var(--text-muted);line-height:1.6;border-top:1px solid var(--navy-800);margin-top:32px}
.suggestion-card{padding:12px 14px;border-radius:10px;margin-bottom:8px;display:flex;gap:10px;align-items:flex-start;cursor:pointer;transition:all .2s}
.suggestion-card:hover{filter:brightness(1.15)}
.suggestion-title{font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:2px}
.suggestion-detail{font-size:12px;line-height:1.5;color:var(--text-secondary)}
.suggestion-action{font-size:11px;color:var(--gold-400);margin-top:4px;font-weight:500}
.market-types-grid{display:flex;flex-wrap:wrap;gap:8px}
.market-type-btn{display:flex;align-items:center;gap:6px;padding:9px 14px;border-radius:10px;border:1px solid var(--navy-600);background:var(--navy-800);color:var(--text-secondary);font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;cursor:pointer;transition:all .2s}
.market-type-btn.active{border-color:var(--gold-500);background:rgba(212,175,55,0.1);color:var(--gold-400)}
.league-group{margin-bottom:8px}
.league-header{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-radius:10px;background:var(--navy-800);border:1px solid var(--navy-600);cursor:pointer;transition:all .2s}
.league-header.all-selected{border-color:var(--gold-500);background:rgba(212,175,55,0.06)}
.league-header.some-selected{border-color:rgba(212,175,55,0.3)}
.league-name{font-size:14px;font-weight:600;display:flex;align-items:center;gap:8px}
.league-count{font-size:12px;color:var(--text-muted);font-weight:400}
.league-check{width:20px;height:20px;border-radius:5px;border:2px solid var(--navy-400);display:flex;align-items:center;justify-content:center;font-size:12px;transition:all .2s;flex-shrink:0}
.league-check.checked{border-color:var(--gold-500);background:var(--gold-500);color:var(--navy-950)}
.league-check.partial{border-color:var(--gold-500);background:rgba(212,175,55,0.3);color:var(--gold-300)}
.fixture-row{display:flex;align-items:center;gap:10px;padding:8px 12px;margin:3px 0;border-radius:8px;cursor:pointer;transition:all .15s;font-size:13px}
.fixture-row:hover{background:rgba(255,255,255,0.03)}
.fixture-row.selected{background:rgba(212,175,55,0.06)}
.fixture-check{width:18px;height:18px;border-radius:4px;border:2px solid var(--navy-400);display:flex;align-items:center;justify-content:center;font-size:10px;transition:all .2s;flex-shrink:0}
.fixture-check.checked{border-color:var(--gold-500);background:var(--gold-500);color:var(--navy-950)}
.fixture-teams{flex:1;color:var(--text-secondary)}
.fixture-teams.selected{color:var(--text-primary)}
.fixture-day-time{font-size:11px;color:var(--text-muted);font-family:'JetBrains Mono',monospace;min-width:65px;text-align:right}
.picker-controls{display:flex;gap:8px;margin-bottom:12px}
.picker-control-btn{padding:6px 12px;border-radius:6px;border:1px solid var(--navy-600);background:var(--navy-800);color:var(--text-secondary);font-family:'DM Sans',sans-serif;font-size:12px;cursor:pointer;transition:all .2s}
.picker-control-btn:hover{border-color:var(--navy-400);color:var(--text-primary)}
.badge{display:inline-flex;align-items:center;justify-content:center;min-width:20px;height:20px;border-radius:10px;background:rgba(212,175,55,0.15);color:var(--gold-400);font-size:11px;font-weight:600;padding:0 6px}
.data-status{text-align:center;padding:40px 20px;color:var(--text-secondary)}
.data-status .spinner{width:32px;height:32px;border:3px solid var(--navy-600);border-top-color:var(--gold-500);border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 16px}
@keyframes spin{to{transform:rotate(360deg)}}
@media(max-width:640px){.inner{padding:12px 12px 40px}.card{padding:18px 14px}.summary-grid{grid-template-columns:1fr 1fr}.sel-header{flex-direction:column}}
::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:var(--navy-900)}::-webkit-scrollbar-thumb{background:var(--navy-600);border-radius:3px}
`;

// ─── ANALYSIS BREAKDOWN ──────────────────────────────────────────────
function AnalysisBreakdown({ sel }) {
  const a = sel.analysis;
  if (!a) return null;
  return (
    <div className="analysis-box">
      {/* Form */}
      {(a.homeRecentForm?.length > 0 || a.awayRecentForm?.length > 0) && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Recent Form</div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
            <div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>{sel.home}</div>
              <div className="form-pills">{(a.homeRecentForm || []).map((r, i) => <div key={i} className={`form-pill pill-${r}`}>{r}</div>)}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>{sel.away}</div>
              <div className="form-pills">{(a.awayRecentForm || []).map((r, i) => <div key={i} className={`form-pill pill-${r}`}>{r}</div>)}</div>
            </div>
          </div>
        </div>
      )}
      {/* H2H */}
      {a.h2hData?.last5?.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Head to Head</div>
          <div style={{ display: "flex", gap: 16, fontSize: 13, marginBottom: 4 }}>
            <span style={{ color: "var(--green-400)" }}>{sel.home}: {a.h2hData.homeWins}W</span>
            <span style={{ color: "var(--text-muted)" }}>Draws: {a.h2hData.draws}</span>
            <span style={{ color: "var(--blue-500)" }}>{sel.away}: {a.h2hData.awayWins}W</span>
          </div>
          {a.h2hData.last5.slice(0, 3).map((m, i) => <div key={i} className="h2h-row">{m.home} {m.score} {m.away} ({m.date})</div>)}
        </div>
      )}
      {/* xG */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Goals Average</div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
          <div><span style={{ color: "var(--text-secondary)" }}>{sel.home}: </span><span style={{ color: "var(--green-400)", fontFamily: "'JetBrains Mono',monospace" }}>{a.homeXGFor} for</span> / <span style={{ color: "var(--red-400)", fontFamily: "'JetBrains Mono',monospace" }}>{a.homeXGAgainst} against</span></div>
          <div><span style={{ color: "var(--text-secondary)" }}>{sel.away}: </span><span style={{ color: "var(--green-400)", fontFamily: "'JetBrains Mono',monospace" }}>{a.awayXGFor} for</span> / <span style={{ color: "var(--red-400)", fontFamily: "'JetBrains Mono',monospace" }}>{a.awayXGAgainst} against</span></div>
        </div>
      </div>
      {/* Injuries */}
      {(a.homeInjuries?.length > 0 || a.awayInjuries?.length > 0) && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Injuries</div>
          {a.homeInjuries?.map((inj, i) => <div key={`hi${i}`} className="inj-item">{inj.status === 'out' ? '🔴' : '🟡'} {sel.home} — {inj.player} — {inj.status} ({inj.returnDate})</div>)}
          {a.awayInjuries?.map((inj, i) => <div key={`ai${i}`} className="inj-item">{inj.status === 'out' ? '🔴' : '🟡'} {sel.away} — {inj.player} — {inj.status} ({inj.returnDate})</div>)}
        </div>
      )}
      {/* Context Insights — AI Reasoning */}
      {a.contextInsights?.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 11, color: "var(--gold-500)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, fontWeight: 600 }}>
            🧠 AI Reasoning
          </div>
          {a.contextInsights.map((insight, i) => {
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
              <div key={i} style={{ padding: "8px 10px", borderRadius: 8, background: bgColor, border: `1px solid ${borderColor}`, marginBottom: 6 }}>
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
      {/* API Prediction */}
      {a.prediction?.advice && (
        <div style={{ marginTop: 10, fontSize: 12, padding: "8px 10px", borderRadius: 6, background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.1)" }}>
          <span style={{ color: "var(--gold-400)", fontWeight: 600 }}>Model Summary:</span>{" "}
          <span style={{ color: "var(--text-secondary)" }}>{a.prediction.advice}</span>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════
export default function App() {
  // Data state
  const [fixtures, setFixtures] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // User inputs
  const [targetWinnings, setTargetWinnings] = useState("500");
  const [stake, setStake] = useState("100");
  const [riskLevel, setRiskLevel] = useState("balanced");
  const [numSelections, setNumSelections] = useState("4");
  const [selectedFixtures, setSelectedFixtures] = useState([]);
  const [expandLeagues, setExpandLeagues] = useState({});
  const [selectedMarketTypes, setSelectedMarketTypes] = useState(() => Object.keys(MARKET_CATEGORIES));

  // App state
  const [phase, setPhase] = useState("input");
  const [currentPage, setCurrentPage] = useState(null); // null = main app, or "about", "privacy", etc.
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadStage, setLoadStage] = useState(0);
  const [slip, setSlip] = useState(null);
  const [expandedCards, setExpandedCards] = useState({});

  // Fetch real data on mount
  useEffect(() => {
    async function loadData() {
      setDataLoading(true);
      const result = await fetchMatchData();
      if (result.success) {
        setFixtures(result.fixtures);
        setSelectedFixtures(result.fixtures.map((_, i) => i));
        setLastUpdated(result.lastUpdated);
      } else {
        setDataError(result.error || "Failed to load match data");
      }
      setDataLoading(false);
    }
    loadData();
  }, []);

  // Derived
  const leagues = [...new Set(fixtures.map(f => f.league))];
  const fixturesByLeague = {};
  leagues.forEach(l => { fixturesByLeague[l] = fixtures.map((f, i) => ({ ...f, _idx: i })).filter(f => f.league === l); });

  const toggleLeague = (league) => {
    const indices = fixturesByLeague[league].map(f => f._idx);
    const allSelected = indices.every(i => selectedFixtures.includes(i));
    if (allSelected) {
      const remaining = selectedFixtures.filter(i => !indices.includes(i));
      if (remaining.length >= 2) setSelectedFixtures(remaining);
    } else {
      setSelectedFixtures(prev => [...new Set([...prev, ...indices])]);
    }
  };
  const toggleFixture = (idx) => {
    setSelectedFixtures(prev => prev.includes(idx) ? (prev.length <= 2 ? prev : prev.filter(i => i !== idx)) : [...prev, idx]);
  };
  const toggleMarketType = (key) => {
    setSelectedMarketTypes(prev => prev.includes(key) ? (prev.length <= 1 ? prev : prev.filter(k => k !== key)) : [...prev, key]);
  };

  const loadStages = ["Fetching match data...", "Analyzing form & H2H...", "Comparing odds...", "Identifying value...", "Building your slip..."];

  const handleGenerate = useCallback(() => {
    setPhase("loading");
    setLoadProgress(0);
    setLoadStage(0);
    setExpandedCards({});
    const n = parseInt(numSelections);
    const targetOdds = (parseFloat(targetWinnings) || 500) / (parseFloat(stake) || 100);
    const filteredFixtures = fixtures.filter((_, i) => selectedFixtures.includes(i));
    const allowedMarkets = new Set(selectedMarketTypes.flatMap(key => MARKET_CATEGORIES[key]?.markets || []));

    let step = 0;
    const interval = setInterval(() => {
      step++;
      setLoadProgress(Math.min(100, step * (100 / 20)));
      setLoadStage(Math.min(Math.floor(step / 4), loadStages.length - 1));
      if (step >= 20) {
        clearInterval(interval);
        const opps = generateOpportunities(filteredFixtures, allowedMarkets);
        const result = buildSlip(opps, n, riskLevel, targetOdds, targetWinnings, stake);
        setSlip(result);
        setPhase("results");
      }
    }, 100);
  }, [numSelections, riskLevel, targetWinnings, stake, selectedFixtures, selectedMarketTypes, fixtures]);

  const stakeNum = parseFloat(stake) || 0;
  const potentialReturn = slip ? +(stakeNum * slip.combinedOdds).toFixed(2) : 0;
  const profit = slip ? +(potentialReturn - stakeNum).toFixed(2) : 0;
  const winProb = slip ? slip.slipWinProbability : 0;
  const winProbColor = winProb > 25 ? "var(--green-400)" : winProb > 10 ? "var(--gold-400)" : winProb > 5 ? "var(--orange-500)" : "var(--red-400)";
  const evLabel = slip ? (slip.avgEdge > 3 ? "STRONG" : slip.avgEdge > 1.5 ? "GOOD" : slip.avgEdge > 0 ? "MARGINAL" : "NEGATIVE") : "";
  const evClass = slip ? (slip.avgEdge > 3 ? "ev-strong" : slip.avgEdge > 1.5 ? "ev-good" : slip.avgEdge > 0 ? "ev-marginal" : "ev-negative") : "";

  return (
    <>
      <style>{CSS}{PAGE_CSS}</style>
      <div className="app">
        <div className="inner">
          <div className="header">
            <div className="brand">
              <div className="brand-icon">V</div>
              <div className="brand-name">Value<span>Bet</span>Hub</div>
            </div>
            <div className="header-sub">AI-Powered Smart Bet Generator</div>
          </div>

          {/* ── STATIC PAGES ──────────── */}
          {currentPage && (
            <>
              <button className="back-btn" onClick={() => setCurrentPage(null)}>← Back to Generator</button>
              {currentPage === "about" && <AboutPage />}
              {currentPage === "privacy" && <PrivacyPage />}
              {currentPage === "terms" && <TermsPage />}
              {currentPage === "responsible" && <ResponsibleGamblingPage />}
              {currentPage === "affiliate" && <AffiliateDisclosurePage />}
            </>
          )}

          {/* ── MAIN APP ─────────────── */}
          {!currentPage && (
            <>
          {/* Data loading state */}
          {dataLoading && (
            <div className="data-status"><div className="spinner" /><div style={{ fontSize: 16, fontWeight: 600 }}>Loading today's fixtures...</div><div style={{ fontSize: 13, marginTop: 8 }}>Fetching real match data, odds, form, and injuries</div></div>
          )}

          {dataError && !fixtures.length && (
            <div className="card" style={{ textAlign: "center", color: "var(--red-400)" }}>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Failed to load match data</div>
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{dataError}</div>
              <button className="gen-btn" style={{ maxWidth: 200, margin: "16px auto 0" }} onClick={() => window.location.reload()}>Retry</button>
            </div>
          )}

          {/* ── INPUT ─────────────────── */}
          {!dataLoading && fixtures.length > 0 && phase === "input" && (
            <>
              {lastUpdated && <div style={{ textAlign: "center", fontSize: 11, color: "var(--text-muted)", marginBottom: 12 }}>Live data · Last updated: {new Date(lastUpdated).toLocaleString()} · {fixtures.length} fixtures loaded</div>}

              <div className="card">
                <div className="card-title">Your Parameters</div>
                <div className="form-grid">
                  <div className="field"><label className="field-label">Target Winnings</label><div className="currency-input"><span className="currency-symbol">€</span><input className="field-input" type="number" value={targetWinnings} onChange={e => setTargetWinnings(e.target.value)} /></div></div>
                  <div className="field"><label className="field-label">Your Stake</label><div className="currency-input"><span className="currency-symbol">€</span><input className="field-input" type="number" value={stake} onChange={e => setStake(e.target.value)} /></div></div>
                  <div className="field"><label className="field-label">Selections (2-{Math.min(8, selectedFixtures.length)})</label><input className="field-input" type="number" min="2" max={Math.min(8, selectedFixtures.length)} value={numSelections} onChange={e => setNumSelections(e.target.value)} /></div>
                  <div className="field"><label className="field-label">Risk Level</label>
                    <div className="risk-options">{["conservative", "balanced", "aggressive"].map(r => <button key={r} className={`risk-btn ${riskLevel === r ? `active-${r}` : ""}`} onClick={() => setRiskLevel(r)}>{r === "conservative" ? "🛡 Safe" : r === "balanced" ? "⚖️ Balanced" : "🔥 Bold"}</button>)}</div>
                  </div>
                </div>
              </div>

              {/* Bet Types */}
              <div className="card">
                <div className="card-title">Bet Types <span className="badge">{selectedMarketTypes.length}/{Object.keys(MARKET_CATEGORIES).length}</span></div>
                <div className="market-types-grid">
                  {Object.entries(MARKET_CATEGORIES).map(([key, cat]) => (
                    <button key={key} className={`market-type-btn ${selectedMarketTypes.includes(key) ? "active" : ""}`} onClick={() => toggleMarketType(key)}>
                      <span>{cat.icon}</span> {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fixture Picker */}
              <div className="card">
                <div className="card-title">Fixtures <span className="badge">{selectedFixtures.length}/{fixtures.length}</span></div>
                <div className="picker-controls">
                  <button className="picker-control-btn" onClick={() => setSelectedFixtures(fixtures.map((_, i) => i))}>Select All</button>
                  <button className="picker-control-btn" onClick={() => setSelectedFixtures([])}>Clear</button>
                </div>
                {leagues.map(league => {
                  const lf = fixturesByLeague[league];
                  const selCount = lf.filter(f => selectedFixtures.includes(f._idx)).length;
                  const allSel = selCount === lf.length;
                  const someSel = selCount > 0 && !allSel;
                  const expanded = expandLeagues[league] !== false;
                  return (
                    <div key={league} className="league-group">
                      <div className={`league-header ${allSel ? "all-selected" : someSel ? "some-selected" : ""}`} onClick={() => setExpandLeagues(p => ({ ...p, [league]: !expanded }))}>
                        <div className="league-name"><span style={{ fontSize: 12, color: "var(--text-muted)" }}>{expanded ? "▾" : "▸"}</span>{lf[0]?.leagueFlag || "⚽"} {league} <span className="league-count">{selCount}/{lf.length}</span></div>
                        <div className={`league-check ${allSel ? "checked" : someSel ? "partial" : ""}`} onClick={e => { e.stopPropagation(); toggleLeague(league); }}>{allSel ? "✓" : someSel ? "–" : ""}</div>
                      </div>
                      {expanded && lf.map(fix => {
                        const isSel = selectedFixtures.includes(fix._idx);
                        return <div key={fix._idx} className={`fixture-row ${isSel ? "selected" : ""}`} onClick={() => toggleFixture(fix._idx)}><div className={`fixture-check ${isSel ? "checked" : ""}`}>{isSel ? "✓" : ""}</div><div className={`fixture-teams ${isSel ? "selected" : ""}`}>{fix.home} vs {fix.away}</div><div className="fixture-day-time">{fix.day} {fix.time}</div></div>;
                      })}
                    </div>
                  );
                })}
              </div>

              <button className="gen-btn" onClick={handleGenerate} disabled={selectedFixtures.length < 2 || selectedMarketTypes.length === 0}>
                <span style={{ fontSize: 20 }}>🎯</span> GENERATE SMART SLIP
              </button>
            </>
          )}

          {/* ── LOADING ──────────────── */}
          {phase === "loading" && (
            <div className="card" style={{ textAlign: "center", padding: "40px 24px" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🤖</div>
              <div style={{ fontSize: 18, fontWeight: 600 }}>Analyzing {selectedFixtures.length} Fixtures</div>
              <div className="loading-bar-track"><div className="loading-bar-fill" style={{ width: `${loadProgress}%` }} /></div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{loadStages.slice(0, loadStage + 1).map((s, i) => <div key={i} style={{ marginBottom: 4, opacity: i === loadStage ? 1 : 0.5 }}>{i < loadStage ? "✓ " : "⏳ "}{s}</div>)}</div>
            </div>
          )}

          {/* ── RESULTS ──────────────── */}
          {phase === "results" && slip && (
            <>
              <div className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
                  <div>
                    <div className="card-title" style={{ marginBottom: 4 }}>AI-Generated Accumulator</div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{slip.selections.length} selections · {slip.valueCount} value bets · Real bookmaker odds</div>
                  </div>
                  <div className={`ev-badge ${evClass}`}>Avg Edge: {slip.avgEdge > 0 ? "+" : ""}{slip.avgEdge}% {evLabel}</div>
                </div>
                {slip.selections.map((sel, i) => (
                  <div key={sel.id} className="sel-card" style={{ animationDelay: `${i * 0.1}s` }}>
                    <div className="sel-header">
                      <div style={{ flex: 1 }}>
                        <div className="sel-match">⚽ {sel.home} vs {sel.away}</div>
                        <div className="sel-meta"><span className="sel-league">{sel.leagueFlag} {sel.league} · {sel.day} {sel.time}</span><span className="sel-market">{sel.market}</span></div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>AI prob: <span style={{ color: "var(--text-primary)", fontFamily: "'JetBrains Mono',monospace" }}>{sel.aiProbability}%</span> · Book implied: <span style={{ fontFamily: "'JetBrains Mono',monospace" }}>{sel.impliedProbability}%</span></div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div className="sel-odds">{sel.bookmakerOdds}</div>
                        <div className={`sel-edge ${parseFloat(sel.edge) > 0 ? "edge-pos" : "edge-neg"}`}>{parseFloat(sel.edge) > 0 ? "+" : ""}{sel.edge}%</div>
                      </div>
                    </div>
                    <button className="analysis-toggle" onClick={() => setExpandedCards(p => ({ ...p, [sel.id]: !p[sel.id] }))}>{expandedCards[sel.id] ? "▾ Hide analysis" : "▸ Show full analysis"}</button>
                    {expandedCards[sel.id] && <AnalysisBreakdown sel={sel} />}
                  </div>
                ))}
              </div>

              <div className="summary">
                {slip.targetOdds && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: 8, marginBottom: 16, background: slip.targetHit ? "rgba(34,197,94,0.06)" : "rgba(245,158,11,0.06)", border: `1px solid ${slip.targetHit ? "rgba(34,197,94,0.12)" : "rgba(245,158,11,0.12)"}`, fontSize: 13, flexWrap: "wrap", gap: 8 }}>
                    <div style={{ color: "var(--text-secondary)" }}>Target: <span style={{ color: "var(--gold-400)", fontFamily: "'JetBrains Mono',monospace", fontWeight: 600 }}>€{targetWinnings}</span></div>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 600, color: slip.targetHit ? "var(--green-400)" : "var(--orange-500)" }}>{slip.targetHit ? `✓ Slip at ${slip.combinedOdds}x → €${potentialReturn}` : `Slip at ${slip.combinedOdds}x`}</div>
                  </div>
                )}
                <div className="summary-grid">
                  <div className="summary-item"><div className="summary-label">Combined Odds</div><div className="summary-value" style={{ color: "var(--text-primary)" }}>{slip.combinedOdds}x</div></div>
                  <div className="summary-item"><div className="summary-label">Potential Return</div><div className="summary-value" style={{ color: "var(--gold-400)" }}>€{potentialReturn.toLocaleString()}</div></div>
                  <div className="summary-item"><div className="summary-label">Profit</div><div className="summary-value" style={{ color: "var(--green-400)" }}>€{profit.toLocaleString()}</div></div>
                  <div className="summary-item"><div className="summary-label">Win Probability</div><div className="summary-value" style={{ color: winProbColor }}>{winProb}%</div><div className="conf-bar"><div className="conf-fill" style={{ width: `${Math.min(winProb * 2.5, 100)}%`, background: winProbColor }} /></div></div>
                </div>
                <div className="risk-warning" style={{ background: winProb < 10 ? "rgba(239,68,68,0.08)" : winProb < 25 ? "rgba(245,158,11,0.08)" : "rgba(34,197,94,0.08)", color: winProb < 10 ? "var(--red-400)" : winProb < 25 ? "var(--orange-500)" : "var(--green-400)", border: `1px solid ${winProb < 10 ? "rgba(239,68,68,0.15)" : winProb < 25 ? "rgba(245,158,11,0.15)" : "rgba(34,197,94,0.15)"}` }}>
                  {winProb < 5 && `⚠️ High risk — roughly 1 in ${Math.round(100 / Math.max(winProb, 0.1))} chance.`}
                  {winProb >= 5 && winProb < 15 && `⚠️ About 1 in ${Math.round(100 / winProb)} chance. Edges favor you over volume.`}
                  {winProb >= 15 && winProb < 30 && `Moderate risk — ~1 in ${Math.round(100 / winProb)} chance.`}
                  {winProb >= 30 && `Solid probability. ${slip.avgEdge > 0 ? "Positive edge detected." : ""}`}
                </div>
                {slip.suggestions?.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.5, color: "var(--gold-500)", marginBottom: 10 }}>💡 AI Advisor</div>
                    {slip.suggestions.map((sug, i) => (
                      <div key={i} className="suggestion-card" style={{ background: sug.icon === "⚠️" ? "rgba(239,68,68,0.06)" : sug.icon === "✅" ? "rgba(34,197,94,0.06)" : "rgba(212,175,55,0.06)", border: `1px solid ${sug.icon === "⚠️" ? "rgba(239,68,68,0.12)" : sug.icon === "✅" ? "rgba(34,197,94,0.12)" : "rgba(212,175,55,0.12)"}` }}
                        onClick={() => { if (!sug.action) return; const v = sug.action.split("_")[2]; if (sug.action.startsWith("try_legs")) setNumSelections(v); else if (sug.action.startsWith("try_stake")) setStake(v); else if (sug.action.startsWith("try_target")) setTargetWinnings(v); setPhase("input"); setSlip(null); }}>
                        <span style={{ fontSize: 18 }}>{sug.icon}</span>
                        <div><div className="suggestion-title">{sug.title}</div><div className="suggestion-detail">{sug.detail}</div>{sug.action && <div className="suggestion-action">Click to apply →</div>}</div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="action-buttons">
                  <button className="action-btn action-primary" onClick={handleGenerate}>🔄 New Slip</button>
                  <button className="action-btn action-secondary" onClick={() => { setPhase("input"); setSlip(null); }}>⚙️ Parameters</button>
                </div>
              </div>
            </>
          )}

          <div className="disclaimer">⚠️ Gambling involves risk. Predictions are statistical, not guaranteed.<br />Always bet responsibly. 18+ only.</div>
            </>
          )}

          {/* ── FOOTER ───────────────── */}
          <div className="site-footer">
            <div className="footer-links">
              <button className="footer-link" onClick={() => { setCurrentPage("about"); window.scrollTo(0,0); }}>About</button>
              <button className="footer-link" onClick={() => { setCurrentPage("responsible"); window.scrollTo(0,0); }}>Responsible Gambling</button>
              <button className="footer-link" onClick={() => { setCurrentPage("privacy"); window.scrollTo(0,0); }}>Privacy Policy</button>
              <button className="footer-link" onClick={() => { setCurrentPage("terms"); window.scrollTo(0,0); }}>Terms of Service</button>
              <button className="footer-link" onClick={() => { setCurrentPage("affiliate"); window.scrollTo(0,0); }}>Affiliate Disclosure</button>
            </div>
            <div className="footer-copy">
              ValueBetHub © 2026 — AI-powered multi-factor analysis for smarter betting.<br />
              18+ only. Gamble responsibly. ValueBetHub is not a bookmaker or gambling operator.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
