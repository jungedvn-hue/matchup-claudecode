import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import {
  generateDailyQuests, claimQuest as claimQuestFn,
  type PlayerQuestRow,
} from "@/lib/gamification";

const sb = supabase as unknown as { from: (t: string) => any };

export interface StreakRow {
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  freeze_count: number;
}

export const useStreak = () => {
  const { user } = useAuth();
  const [streak, setStreak] = useState<StreakRow | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!user) { setStreak(null); setLoading(false); return; }
    setLoading(true);
    const { data } = await sb.from("player_streaks").select("*").eq("user_id", user.id).single();
    if (data) setStreak(data as StreakRow);
    setLoading(false);
  }, [user]);

  useEffect(() => { refetch(); }, [refetch]);
  return { streak, loading, refetch };
};

export const useDailyQuests = () => {
  const { user } = useAuth();
  const [quests, setQuests] = useState<PlayerQuestRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!user) { setQuests([]); setLoading(false); return; }
    setLoading(true);
    const fresh = await generateDailyQuests(user.id);
    setQuests(fresh);
    setLoading(false);
  }, [user]);

  const claim = useCallback(async (playerQuestId: string) => {
    if (!user) return { error: "Not logged in" };
    const res = await claimQuestFn(user.id, playerQuestId);
    await refetch();
    return res;
  }, [user, refetch]);

  useEffect(() => { refetch(); }, [refetch]);
  return { quests, loading, refetch, claim };
};

export interface AchievementRow {
  id: string;
  key: string;
  name_en: string; name_vi: string;
  description_en: string | null; description_vi: string | null;
  icon: string | null;
  category: string;
  max_tier: number;
  tier_thresholds: number[];
  xp_reward: number;
  gem_reward: number;
}

export interface PlayerAchievementRow {
  id: string;
  achievement_id: string;
  current_tier: number;
  progress: number;
  unlocked_at: string | null;
  achievement?: AchievementRow;
}

export const useAchievements = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Array<AchievementRow & { current_tier: number; progress: number; unlocked_at: string | null }>>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!user) { setItems([]); setLoading(false); return; }
    setLoading(true);
    const { data: defs } = await sb.from("achievements").select("*").order("sort_order");
    const { data: mine } = await sb.from("player_achievements").select("*").eq("user_id", user.id);
    const mineMap = new Map<string, { current_tier: number; progress: number; unlocked_at: string | null }>();
    (mine ?? []).forEach((p: { achievement_id: string; current_tier: number; progress: number; unlocked_at: string | null }) => {
      mineMap.set(p.achievement_id, { current_tier: p.current_tier, progress: p.progress, unlocked_at: p.unlocked_at });
    });
    const merged = (defs ?? []).map((d: AchievementRow) => ({
      ...d,
      current_tier: mineMap.get(d.id)?.current_tier ?? 0,
      progress: mineMap.get(d.id)?.progress ?? 0,
      unlocked_at: mineMap.get(d.id)?.unlocked_at ?? null,
    }));
    setItems(merged);
    setLoading(false);
  }, [user]);

  useEffect(() => { refetch(); }, [refetch]);
  return { items, loading, refetch };
};

export interface XPTransactionRow {
  id: string;
  amount: number;
  source: string;
  reference_id: string | null;
  created_at: string;
}

export const useXPHistory = (limit = 20) => {
  const { user } = useAuth();
  const [items, setItems] = useState<XPTransactionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!user) { setItems([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await sb.from("xp_transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (data) setItems(data as XPTransactionRow[]);
    setLoading(false);
  }, [user, limit]);

  useEffect(() => { refetch(); }, [refetch]);
  return { items, loading, refetch };
};
