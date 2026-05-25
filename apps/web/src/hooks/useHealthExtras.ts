import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

const sb = supabase as unknown as { from: (t: string) => any; rpc: (fn: string, args?: any) => any };

// ── Types ────────────────────────────────────────────────────────────────────
export interface BodyProfile {
  user_id?: string;
  age?: number | null;
  weight_kg?: number | null;
  height_cm?: number | null;
  gender?: "male" | "female" | "other" | null;
  resting_hr?: number | null;
  max_hr?: number | null;
  fitness_goal?: "weight_loss" | "endurance" | "muscle" | "recovery" | "general" | null;
}

export type DeviceProvider =
  | "garmin" | "oura" | "fitbit" | "whoop"
  | "google_fit" | "samsung_health" | "web_bluetooth" | "csv_import";

export interface DeviceConnection {
  id: string;
  user_id: string;
  provider: DeviceProvider;
  provider_user_id: string | null;
  device_name: string | null;
  metadata: any;
  sync_enabled: boolean;
  last_sync_at: string | null;
  last_sync_error: string | null;
  created_at: string;
}

export type InsightType = "readiness" | "pattern" | "alert" | "weekly_summary" | "recommendation";
export type InsightSeverity = "info" | "positive" | "warning" | "urgent";

export interface HealthInsight {
  id: string;
  insight_type: InsightType;
  severity: InsightSeverity;
  title: string;
  body: string;
  emoji: string | null;
  data_snapshot: any;
  for_date: string;
  dismissed_at: string | null;
  created_at: string;
}

export interface TrainingLoad {
  acute: number | null;
  chronic: number | null;
  ratio: number | null;
}

export interface MatchCorrelation {
  matches_analyzed: number;
  sleep_winrate_corr: number | null;
  hrv_winrate_corr: number | null;
  resting_hr_winrate_corr: number | null;
  best_sleep_hours: number | null;
  best_hrv_ms: number | null;
}

// ── Heart rate zones (220 - age formula) ─────────────────────────────────────
export const calculateMaxHr = (age: number) => 220 - age;

export const getHrZones = (maxHr: number, restingHr: number = 60) => {
  // Karvonen method (HR reserve)
  const reserve = maxHr - restingHr;
  return {
    z1: { min: Math.round(restingHr + reserve * 0.5), max: Math.round(restingHr + reserve * 0.6), label: "Recovery", color: "blue" },
    z2: { min: Math.round(restingHr + reserve * 0.6), max: Math.round(restingHr + reserve * 0.7), label: "Easy", color: "emerald" },
    z3: { min: Math.round(restingHr + reserve * 0.7), max: Math.round(restingHr + reserve * 0.8), label: "Aerobic", color: "amber" },
    z4: { min: Math.round(restingHr + reserve * 0.8), max: Math.round(restingHr + reserve * 0.9), label: "Threshold", color: "orange" },
    z5: { min: Math.round(restingHr + reserve * 0.9), max: maxHr, label: "Max", color: "rose" },
  };
};

// ── useBodyProfile ────────────────────────────────────────────────────────────
export const useBodyProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<BodyProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) { setProfile(null); setLoading(false); return; }
    setLoading(true);
    const { data } = await sb.from("health_body_profile").select("*").eq("user_id", user.id).maybeSingle();
    setProfile((data as BodyProfile) ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  const save = async (p: BodyProfile): Promise<{ error?: string }> => {
    if (!user) return { error: "Not authenticated" };
    const payload = {
      user_id: user.id,
      ...p,
      max_hr: p.max_hr ?? (p.age ? calculateMaxHr(p.age) : null),
    };
    const { error } = await sb.from("health_body_profile").upsert(payload, { onConflict: "user_id" });
    if (error) return { error: error.message };
    await fetch();
    return {};
  };

  return { profile, loading, save, refetch: fetch };
};

// ── useTrainingLoad ──────────────────────────────────────────────────────────
export const useTrainingLoad = () => {
  const { user } = useAuth();
  const [load, setLoad] = useState<TrainingLoad>({ acute: null, chronic: null, ratio: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      const { data } = await sb.rpc("fn_training_load", { p_user: user.id });
      if (cancelled) return;
      const row = (data && data[0]) ?? { acute: null, chronic: null, ratio: null };
      setLoad({
        acute: row.acute != null ? Number(row.acute) : null,
        chronic: row.chronic != null ? Number(row.chronic) : null,
        ratio: row.ratio != null ? Number(row.ratio) : null,
      });
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  return { load, loading };
};

// ── useDeviceConnections ─────────────────────────────────────────────────────
export const useDeviceConnections = () => {
  const { user } = useAuth();
  const [connections, setConnections] = useState<DeviceConnection[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) { setConnections([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await sb.from("health_device_connections")
      .select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setConnections((data as DeviceConnection[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  const remove = async (id: string) => {
    const { error } = await sb.from("health_device_connections").delete().eq("id", id);
    if (!error) await fetch();
    return { error };
  };

  const upsertBluetooth = async (deviceName: string, metadata: any) => {
    if (!user) return { error: "Not authenticated" };
    const { error } = await sb.from("health_device_connections").upsert({
      user_id: user.id, provider: "web_bluetooth",
      provider_user_id: deviceName, device_name: deviceName, metadata, sync_enabled: true,
      last_sync_at: new Date().toISOString(),
    }, { onConflict: "user_id,provider,provider_user_id" });
    if (!error) await fetch();
    return { error };
  };

  return { connections, loading, refetch: fetch, remove, upsertBluetooth };
};

// ── useHealthInsights ─────────────────────────────────────────────────────────
export const useHealthInsights = () => {
  const { user } = useAuth();
  const [insights, setInsights] = useState<HealthInsight[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) { setInsights([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await sb.from("health_insights")
      .select("*").eq("user_id", user.id).is("dismissed_at", null)
      .order("for_date", { ascending: false }).order("created_at", { ascending: false }).limit(10);
    setInsights((data as HealthInsight[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  const generate = async () => {
    if (!user) return { count: 0 };
    const { data } = await sb.rpc("fn_generate_insights", { p_user: user.id });
    await fetch();
    return { count: Number(data ?? 0) };
  };

  const dismiss = async (id: string) => {
    const { error } = await sb.from("health_insights")
      .update({ dismissed_at: new Date().toISOString() }).eq("id", id);
    if (!error) setInsights(prev => prev.filter(i => i.id !== id));
    return { error };
  };

  return { insights, loading, refetch: fetch, generate, dismiss };
};

// ── useMatchCorrelations ──────────────────────────────────────────────────────
export const useMatchCorrelations = () => {
  const { user } = useAuth();
  const [data, setData] = useState<MatchCorrelation | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) { setData(null); setLoading(false); return; }
    const { data: row } = await sb.from("health_match_correlations").select("*").eq("user_id", user.id).maybeSingle();
    setData(row as MatchCorrelation);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  const recompute = async () => {
    if (!user) return;
    await sb.rpc("fn_compute_match_correlations", { p_user: user.id });
    await fetch();
  };

  return { data, loading, refetch: fetch, recompute };
};

// ── Recovery score (HRV + sleep + resting HR + training load) ────────────────
// Returns 0-100 score with 3 tiers: Ready / Light / Rest
export interface RecoveryScore {
  score: number;
  tier: "ready" | "light" | "rest";
  factors: { hrv: number | null; sleep: number | null; restingHr: number | null; load: number | null };
}

export function computeRecoveryScore(args: {
  todayHrv: number | null;
  baselineHrv: number | null;
  sleepHours: number | null;
  todayRestingHr: number | null;
  baselineRestingHr: number | null;
  trainingLoadRatio: number | null;
}): RecoveryScore {
  const factors: RecoveryScore["factors"] = { hrv: null, sleep: null, restingHr: null, load: null };

  // HRV factor: 50 points max
  if (args.todayHrv && args.baselineHrv && args.baselineHrv > 0) {
    const ratio = args.todayHrv / args.baselineHrv;
    factors.hrv = Math.max(0, Math.min(50, 50 * Math.min(1, ratio)));
  } else if (args.todayHrv) {
    // No baseline → use absolute (HRV ≥ 50ms = good)
    factors.hrv = Math.max(0, Math.min(50, args.todayHrv));
  }

  // Sleep factor: 25 points max (7-9h optimal)
  if (args.sleepHours != null) {
    if (args.sleepHours >= 7 && args.sleepHours <= 9) factors.sleep = 25;
    else if (args.sleepHours >= 6 && args.sleepHours < 7) factors.sleep = 18;
    else if (args.sleepHours >= 5 && args.sleepHours < 6) factors.sleep = 10;
    else if (args.sleepHours > 9) factors.sleep = 20;
    else factors.sleep = 5;
  }

  // Resting HR factor: 15 points max (lower than baseline = better)
  if (args.todayRestingHr && args.baselineRestingHr && args.baselineRestingHr > 0) {
    const delta = args.todayRestingHr - args.baselineRestingHr;
    if (delta <= 0) factors.restingHr = 15;
    else if (delta <= 5) factors.restingHr = 10;
    else if (delta <= 10) factors.restingHr = 5;
    else factors.restingHr = 0;
  }

  // Training load factor: 10 points max (sweet spot 0.95-1.25)
  if (args.trainingLoadRatio != null) {
    if (args.trainingLoadRatio >= 0.95 && args.trainingLoadRatio <= 1.25) factors.load = 10;
    else if (args.trainingLoadRatio >= 0.8 && args.trainingLoadRatio < 0.95) factors.load = 7;
    else if (args.trainingLoadRatio > 1.25 && args.trainingLoadRatio <= 1.5) factors.load = 5;
    else factors.load = 2;
  }

  const total = (factors.hrv ?? 0) + (factors.sleep ?? 0) + (factors.restingHr ?? 0) + (factors.load ?? 0);
  // Scale to 100 only if at least HRV is present
  const score = factors.hrv != null ? Math.round(total) : Math.round((factors.sleep ?? 0) * 4);

  const tier: RecoveryScore["tier"] = score >= 70 ? "ready" : score >= 50 ? "light" : "rest";
  return { score, tier, factors };
}
