import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface HealthDailyLog {
  id?: string;
  user_id?: string;
  date: string; // YYYY-MM-DD
  steps?: number | null;
  distance_km?: number | null;
  calories_burned?: number | null;
  avg_hr?: number | null;
  resting_hr?: number | null;
  hrv_ms?: number | null;
  stress_level?: "low" | "medium" | "high" | null;
  sleep_hours?: number | null;
  sleep_quality?: number | null;
  notes?: string | null;
}

export interface HealthGoals {
  daily_steps: number;
  daily_distance_km: number;
  daily_calories: number;
  weekly_matches: number;
}

const DEFAULT_GOALS: HealthGoals = {
  daily_steps: 8000,
  daily_distance_km: 5,
  daily_calories: 500,
  weekly_matches: 3,
};

const todayISO = () => new Date().toISOString().slice(0, 10);

const isoDaysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

export const useHealthData = (rangeDays = 30) => {
  const { user } = useAuth();
  const [today, setToday] = useState<HealthDailyLog | null>(null);
  const [recent, setRecent] = useState<HealthDailyLog[]>([]);
  const [goals, setGoals] = useState<HealthGoals>(DEFAULT_GOALS);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const since = isoDaysAgo(rangeDays);
    const [logsRes, goalsRes] = await Promise.all([
      (supabase.from as any)("health_daily_logs")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", since)
        .order("date", { ascending: true }),
      (supabase.from as any)("health_goals")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    const logs = (logsRes.data ?? []) as HealthDailyLog[];
    setRecent(logs);
    setToday(logs.find((l) => l.date === todayISO()) ?? null);

    if (goalsRes.data) {
      setGoals({
        daily_steps: goalsRes.data.daily_steps,
        daily_distance_km: Number(goalsRes.data.daily_distance_km),
        daily_calories: goalsRes.data.daily_calories,
        weekly_matches: goalsRes.data.weekly_matches,
      });
    }
    setLoading(false);
  }, [user, rangeDays]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const upsertToday = useCallback(
    async (patch: Partial<HealthDailyLog>) => {
      if (!user) return { error: new Error("Not authenticated") };
      const row = { user_id: user.id, date: todayISO(), ...patch };
      const { error } = await (supabase.from as any)("health_daily_logs").upsert(row, {
        onConflict: "user_id,date",
      });
      if (!error) await refresh();
      return { error };
    },
    [user, refresh]
  );

  const saveGoals = useCallback(
    async (next: HealthGoals) => {
      if (!user) return { error: new Error("Not authenticated") };
      const { error } = await (supabase.from as any)("health_goals").upsert(
        { user_id: user.id, ...next },
        { onConflict: "user_id" }
      );
      if (!error) setGoals(next);
      return { error };
    },
    [user]
  );

  return { today, recent, goals, loading, refresh, upsertToday, saveGoals };
};
