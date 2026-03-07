// src/supabase.js
// Supabase client configuration + helper functions for saved slips

import { createClient } from "@supabase/supabase-js";

// These come from your Supabase project settings → API
// Set them as Netlify environment variables: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase credentials not found. Auth features will be disabled.");
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// ═══════════════════════════════════════════════════════════════════════
// AUTH HELPERS
// ═══════════════════════════════════════════════════════════════════════

export async function signUp(email, password, displayName) {
  if (!supabase) return { error: { message: "Auth not configured" } };
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName || email.split("@")[0] },
    },
  });
  return { data, error };
}

export async function signIn(email, password) {
  if (!supabase) return { error: { message: "Auth not configured" } };
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function getSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data?.session || null;
}

export async function getProfile(userId) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) { console.error("Profile fetch error:", error); return null; }
  return data;
}

// ═══════════════════════════════════════════════════════════════════════
// SLIP STORAGE
// ═══════════════════════════════════════════════════════════════════════

// Free tier: max 5 saved slips
const FREE_SLIP_LIMIT = 5;

export async function getSavedSlipCount(userId) {
  if (!supabase) return 0;
  const { count } = await supabase
    .from("saved_slips")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  return count || 0;
}

export async function canSaveSlip(userId, tier) {
  if (tier === "premium") return true;
  const count = await getSavedSlipCount(userId);
  return count < FREE_SLIP_LIMIT;
}

export async function saveSlip(userId, slip, params) {
  if (!supabase) return { error: { message: "Auth not configured" } };

  // Insert the slip
  const { data: slipData, error: slipError } = await supabase
    .from("saved_slips")
    .insert({
      user_id: userId,
      name: params.name || `Slip — ${new Date().toLocaleDateString()}`,
      stake: parseFloat(params.stake) || 0,
      target_winnings: parseFloat(params.targetWinnings) || 0,
      combined_odds: slip.combinedOdds,
      win_probability: slip.slipWinProbability,
      avg_edge: slip.avgEdge,
      risk_level: params.riskLevel || "balanced",
      notify_odds_change: false,
    })
    .select()
    .single();

  if (slipError) return { error: slipError };

  // Insert selections
  const selections = slip.selections.map(sel => ({
    slip_id: slipData.id,
    fixture_id: parseInt(sel.fixtureId) || 0,
    home_team: sel.home,
    away_team: sel.away,
    league: sel.league,
    league_flag: sel.leagueFlag,
    match_date: sel.date,
    match_time: sel.time,
    market: sel.market,
    bookmaker_odds: sel.bookmakerOdds,
    ai_probability: sel.aiProbability,
    implied_probability: sel.impliedProbability,
    edge: parseFloat(sel.edge) || 0,
    current_odds: sel.bookmakerOdds, // Same as original at save time
    odds_movement: 0,
  }));

  const { error: selError } = await supabase
    .from("slip_selections")
    .insert(selections);

  if (selError) return { error: selError };

  return { data: slipData };
}

export async function getSavedSlips(userId) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("saved_slips")
    .select(`
      *,
      slip_selections (*)
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) { console.error("Fetch slips error:", error); return []; }
  return data || [];
}

export async function deleteSlip(slipId) {
  if (!supabase) return;
  await supabase.from("saved_slips").delete().eq("id", slipId);
}

export async function updateSlipStatus(slipId, status, resultProfit = null) {
  if (!supabase) return;
  const update = { status, updated_at: new Date().toISOString() };
  if (resultProfit !== null) update.result_profit = resultProfit;
  await supabase.from("saved_slips").update(update).eq("id", slipId);
}

// Toggle odds alerts (premium only)
export async function toggleOddsAlert(userId, slipId, enabled) {
  if (!supabase) return;
  await supabase
    .from("saved_slips")
    .update({ notify_odds_change: enabled })
    .eq("id", slipId)
    .eq("user_id", userId);
}

// ═══════════════════════════════════════════════════════════════════════
// NEWS
// ═══════════════════════════════════════════════════════════════════════

export async function getNewsForFixtures(fixtureIds) {
  if (!supabase || !fixtureIds?.length) return [];
  const { data } = await supabase
    .from("news_items")
    .select("*")
    .in("fixture_id", fixtureIds)
    .order("published_at", { ascending: false })
    .limit(20);
  return data || [];
}
