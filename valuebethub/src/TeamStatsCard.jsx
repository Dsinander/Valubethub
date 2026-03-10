// src/TeamStatsCard.jsx
// Reusable team statistics display component.
// Used in: Match Previews, Daily Slips expanded view, Teams page
// Fetches from Supabase team_stats table (populated by team-stats.mjs)

import { useState, useEffect } from "react";
import { supabase } from "./supabase.js";

// ─── FORM PILLS (reusable everywhere) ───────────────────────────────
export function FormPills({ form, size = "md" }) {
  if (!form || form.length === 0) return <span style={{ fontSize: 11, color: "var(--text-muted)" }}>No form data</span>;
  const sizes = { sm: 18, md: 22, lg: 26 };
  const fonts = { sm: 10, md: 11, lg: 13 };
  const s = sizes[size] || 22;
  const f = fonts[size] || 11;
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {form.map((r, i) => (
        <div key={i} style={{
          width: s, height: s, borderRadius: size === "lg" ? 6 : 4,
          fontSize: f, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center",
          background: r === "W" ? "rgba(34,197,94,0.2)" : r === "D" ? "rgba(245,158,11,0.2)" : "rgba(239,68,68,0.2)",
          color: r === "W" ? "var(--green-400)" : r === "D" ? "var(--orange-500)" : "var(--red-400)",
        }}>{r}</div>
      ))}
    </div>
  );
}

// ─── MINI STATS BAR (for tip cards — goals, corners summary) ────────
export function MiniStats({ fix }) {
  const gf = fix.homeXGFor || fix.analysis?.homeXGFor;
  const ga = fix.homeXGAgainst || fix.analysis?.homeXGAgainst;
  const agf = fix.awayXGFor || fix.analysis?.awayXGFor;
  const aga = fix.awayXGAgainst || fix.analysis?.awayXGAgainst;
  const homeInj = (fix.homeInjuries || fix.analysis?.homeInjuries || []).length;
  const awayInj = (fix.awayInjuries || fix.analysis?.awayInjuries || []).length;
  
  return (
    <div style={{ display: "flex", gap: 16, fontSize: 11, color: "var(--text-muted)", flexWrap: "wrap" }}>
      {gf && <span>⚽ {fix.home?.split(" ").pop()}: {gf} gls/gm</span>}
      {agf && <span>⚽ {fix.away?.split(" ").pop()}: {agf} gls/gm</span>}
      {(homeInj > 0 || awayInj > 0) && (
        <span>🏥 Injuries: {fix.home?.split(" ").pop()} {homeInj} · {fix.away?.split(" ").pop()} {awayInj}</span>
      )}
    </div>
  );
}

// ─── MATCH FORM HEADER (both teams side by side) ────────────────────
export function MatchFormHeader({ fix, compact = false }) {
  const homeForm = fix.homeForm || fix.analysis?.homeRecentForm || [];
  const awayForm = fix.awayForm || fix.analysis?.awayRecentForm || [];
  const homePos = fix.homeLeaguePos || fix.analysis?.homeLeaguePos;
  const awayPos = fix.awayLeaguePos || fix.analysis?.awayLeaguePos;
  const homeGF = fix.homeXGFor || fix.analysis?.homeXGFor;
  const awayGF = fix.awayXGFor || fix.analysis?.awayXGFor;
  const homeInj = (fix.homeInjuries || fix.analysis?.homeInjuries || []).length;
  const awayInj = (fix.awayInjuries || fix.analysis?.awayInjuries || []).length;
  const ord = (n) => { const s = ["th","st","nd","rd"]; const v = n % 100; return (s[(v-20)%10]||s[v]||s[0]); };

  if (compact) {
    return (
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "8px 0", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {fix.homeLogo && <img src={fix.homeLogo} style={{ width: 16, height: 16, objectFit: "contain" }} alt="" />}
          <FormPills form={homeForm} size="sm" />
          {homePos && <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{homePos}{ord(homePos)}</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {awayPos && <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{awayPos}{ord(awayPos)}</span>}
          <FormPills form={awayForm} size="sm" />
          {fix.awayLogo && <img src={fix.awayLogo} style={{ width: 16, height: 16, objectFit: "contain" }} alt="" />}
        </div>
      </div>
    );
  }

  return (
    <div style={STYLES.formHeader}>
      <div style={STYLES.formTeam}>
        <div style={STYLES.formTeamName}>
          {fix.homeLogo && <img src={fix.homeLogo} style={{ width: 20, height: 20, objectFit: "contain", marginRight: 6 }} alt="" />}
          {fix.home}
          {homePos && <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 6 }}>{homePos}{ord(homePos)}</span>}
        </div>
        <FormPills form={homeForm} />
        <div style={STYLES.formMeta}>
          {homeGF && <span>⚽ {homeGF} gls/gm</span>}
          {homeInj > 0 && <span style={{ color: "var(--red-400)" }}>🏥 {homeInj} injured</span>}
        </div>
      </div>
      <div style={{ fontSize: 12, color: "var(--text-muted)", padding: "0 8px" }}>vs</div>
      <div style={{ ...STYLES.formTeam, textAlign: "right", alignItems: "flex-end" }}>
        <div style={{ ...STYLES.formTeamName, justifyContent: "flex-end" }}>
          {awayPos && <span style={{ fontSize: 11, color: "var(--text-muted)", marginRight: 6 }}>{awayPos}{ord(awayPos)}</span>}
          {fix.away}
          {fix.awayLogo && <img src={fix.awayLogo} style={{ width: 20, height: 20, objectFit: "contain", marginLeft: 6 }} alt="" />}
        </div>
        <FormPills form={awayForm} />
        <div style={{ ...STYLES.formMeta, justifyContent: "flex-end" }}>
          {awayGF && <span>⚽ {awayGF} gls/gm</span>}
          {awayInj > 0 && <span style={{ color: "var(--red-400)" }}>🏥 {awayInj} injured</span>}
        </div>
      </div>
    </div>
  );
}

// ─── PROS/CONS COMPONENT ────────────────────────────────────────────
export function ProsCons({ pros, cons }) {
  if ((!pros || pros.length === 0) && (!cons || cons.length === 0)) return null;
  return (
    <div style={{ marginTop: 10 }}>
      {pros?.map((p, i) => (
        <div key={`p${i}`} style={STYLES.proItem}>
          <span style={{ color: "var(--green-400)", marginRight: 6, flexShrink: 0 }}>✅</span>
          <span>{p}</span>
        </div>
      ))}
      {cons?.map((c, i) => (
        <div key={`c${i}`} style={STYLES.conItem}>
          <span style={{ color: "var(--orange-500)", marginRight: 6, flexShrink: 0 }}>⚠️</span>
          <span>{c}</span>
        </div>
      ))}
    </div>
  );
}

// ─── FULL TEAM STATS CARD ───────────────────────────────────────────
export function FullTeamStats({ teamName }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!supabase || !teamName) { setLoading(false); return; }
      setLoading(true);
      const { data } = await supabase
        .from("team_stats")
        .select("*")
        .ilike("team_name", `%${teamName}%`)
        .limit(1)
        .single();
      setStats(data);
      setLoading(false);
    }
    load();
  }, [teamName]);

  if (loading) return <div style={{ padding: 12, fontSize: 12, color: "var(--text-muted)" }}>Loading stats...</div>;
  if (!stats) return <div style={{ padding: 12, fontSize: 12, color: "var(--text-muted)" }}>Statistics not yet available for {teamName}. Data refreshes every 6 hours.</div>;

  const n = stats.matches_analyzed || 5;
  const pct = (val) => `${Math.round((val / n) * 100)}%`;

  return (
    <div style={STYLES.statsCard}>
      <div style={STYLES.statsHeader}>
        {stats.team_logo && <img src={stats.team_logo} style={{ width: 28, height: 28, objectFit: "contain" }} alt="" />}
        <div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{stats.team_name}</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
            {stats.league}{stats.league_position ? ` · ${stats.league_position}${ordSuffix(stats.league_position)} place` : ""}
            {stats.season_played > 0 && ` · ${stats.season_wins}W ${stats.season_draws}D ${stats.season_losses}L`}
          </div>
        </div>
      </div>

      {/* Averages Grid */}
      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--gold-500)", textTransform: "uppercase", letterSpacing: 1, margin: "14px 0 8px" }}>
        Per-Game Averages (last {n} matches)
      </div>
      <div style={STYLES.avgGrid}>
        <StatBox label="Goals" value={stats.goals_scored_avg} icon="⚽" />
        <StatBox label="Conceded" value={stats.goals_conceded_avg} icon="🥅" color="var(--red-400)" />
        <StatBox label="Corners" value={stats.corners_for_avg} icon="⛳" />
        <StatBox label="Match Corners" value={stats.corners_total_avg} icon="⛳" sub="total" />
        <StatBox label="Yellow Cards" value={stats.cards_yellow_avg} icon="🟨" />
        <StatBox label="Match Cards" value={stats.cards_total_match_avg} icon="🃏" sub="total" />
        <StatBox label="Fouls" value={stats.fouls_committed_avg} icon="💥" />
        <StatBox label="Shots" value={stats.shots_total_avg} icon="🎯" />
        <StatBox label="On Target" value={stats.shots_on_target_avg} icon="🎯" />
        <StatBox label="Possession" value={`${stats.possession_avg}%`} icon="🔄" />
        <StatBox label="Clean Sheets" value={`${stats.clean_sheets}/${n}`} icon="🧤" />
        <StatBox label="Offsides" value={stats.offsides_avg} icon="🚩" />
      </div>

      {/* Over/Under Hit Rates */}
      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--gold-500)", textTransform: "uppercase", letterSpacing: 1, margin: "14px 0 8px" }}>
        Over/Under Hit Rates (last {n})
      </div>
      <div style={STYLES.hitGrid}>
        <HitRateSection title="⚽ Goals" items={[
          { label: "Over 0.5", hit: stats.over_05_goals, n },
          { label: "Over 1.5", hit: stats.over_15_goals, n },
          { label: "Over 2.5", hit: stats.over_25_goals, n },
          { label: "Over 3.5", hit: stats.over_35_goals, n },
          { label: "BTTS", hit: stats.btts_yes, n },
        ]} />
        <HitRateSection title="⛳ Corners" items={[
          { label: "Over 7.5", hit: stats.over_75_corners, n },
          { label: "Over 8.5", hit: stats.over_85_corners, n },
          { label: "Over 9.5", hit: stats.over_95_corners, n },
          { label: "Over 10.5", hit: stats.over_105_corners, n },
        ]} />
        <HitRateSection title="🟨 Cards" items={[
          { label: "Over 2.5", hit: stats.over_25_cards, n },
          { label: "Over 3.5", hit: stats.over_35_cards, n },
          { label: "Over 4.5", hit: stats.over_45_cards, n },
        ]} />
      </div>

      {/* Recent Matches */}
      {stats.recent_matches?.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--gold-500)", textTransform: "uppercase", letterSpacing: 1, margin: "14px 0 8px" }}>
            Recent Matches
          </div>
          <div>
            {stats.recent_matches.map((m, i) => (
              <div key={i} style={STYLES.recentMatch}>
                <div style={{
                  width: 24, height: 24, borderRadius: 5, fontSize: 11, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  background: m.result === "W" ? "rgba(34,197,94,0.2)" : m.result === "D" ? "rgba(245,158,11,0.2)" : "rgba(239,68,68,0.2)",
                  color: m.result === "W" ? "var(--green-400)" : m.result === "D" ? "var(--orange-500)" : "var(--red-400)",
                }}>{m.result}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>
                    {m.home} <strong>{m.score}</strong> {m.away}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
                    {m.date}{m.corners_total ? ` · ⛳ ${m.corners_total} corners` : ""}{m.match_cards ? ` · 🟨 ${m.match_cards} cards` : ""}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'JetBrains Mono',monospace" }}>
                  {m.goals_for}-{m.goals_against}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div style={{ fontSize: 10, color: "var(--text-muted)", textAlign: "center", marginTop: 10 }}>
        Updated: {new Date(stats.updated_at).toLocaleString()}
      </div>
    </div>
  );
}

// ─── HELPER COMPONENTS ──────────────────────────────────────────────
function StatBox({ label, value, icon, color, sub }) {
  return (
    <div style={STYLES.statBox}>
      <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{icon} {label}</div>
      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 16, fontWeight: 700, color: color || "var(--text-primary)" }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 9, color: "var(--text-muted)" }}>{sub}</div>}
    </div>
  );
}

function HitRateSection({ title, items }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--text-secondary)" }}>{title}</div>
      {items.map((item, i) => {
        const pct = item.n > 0 ? Math.round((item.hit / item.n) * 100) : 0;
        const color = pct >= 80 ? "var(--green-400)" : pct >= 60 ? "var(--gold-400)" : pct >= 40 ? "var(--orange-500)" : "var(--text-muted)";
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <div style={{ width: 65, fontSize: 11, color: "var(--text-muted)" }}>{item.label}</div>
            <div style={{ flex: 1, height: 6, background: "var(--navy-700)", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 3, transition: "width 0.5s" }} />
            </div>
            <div style={{ width: 35, fontSize: 11, fontWeight: 600, color, fontFamily: "'JetBrains Mono',monospace", textAlign: "right" }}>
              {item.hit}/{item.n}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ordSuffix(n) {
  if (!n) return "";
  const s = ["th","st","nd","rd"];
  const v = n % 100;
  return s[(v-20)%10]||s[v]||s[0];
}

// ─── STYLES ─────────────────────────────────────────────────────────
const STYLES = {
  formHeader: {
    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
    padding: "10px 0", gap: 8,
  },
  formTeam: { display: "flex", flexDirection: "column", gap: 4 },
  formTeamName: {
    fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center",
    color: "var(--text-primary)",
  },
  formMeta: {
    display: "flex", gap: 10, fontSize: 11, color: "var(--text-muted)",
  },
  proItem: {
    display: "flex", alignItems: "flex-start", gap: 4,
    fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6,
    padding: "4px 0",
  },
  conItem: {
    display: "flex", alignItems: "flex-start", gap: 4,
    fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6,
    padding: "4px 0",
  },
  statsCard: {
    padding: 18, borderRadius: 14,
    background: "var(--glass)", border: "1px solid var(--glass-border)",
  },
  statsHeader: {
    display: "flex", alignItems: "center", gap: 10, marginBottom: 4,
  },
  avgGrid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))",
    gap: 8,
  },
  statBox: {
    padding: "8px 10px", borderRadius: 8,
    background: "var(--navy-800)", border: "1px solid var(--navy-600)",
    textAlign: "center",
  },
  hitGrid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 12,
  },
  recentMatch: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "8px 10px", borderRadius: 8,
    background: "var(--navy-800)", border: "1px solid var(--navy-600)",
    marginBottom: 4,
  },
};
