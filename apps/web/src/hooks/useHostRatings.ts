import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

const sb = supabase as unknown as { from: (t: string) => any };

export interface HostRating {
  id: string;
  group_id: string;
  host_user_id: string;
  rater_user_id: string;
  stars: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
  rater_name?: string;
  rater_avatar?: string;
}

export interface HostRatingSummary {
  rating_count: number;
  avg_stars: number;
}

// ── Summary for any host (used on profile / group header)
export const useHostRatingSummary = (hostUserId: string | undefined) => {
  const [summary, setSummary] = useState<HostRatingSummary>({ rating_count: 0, avg_stars: 0 });
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!hostUserId) { setLoading(false); return; }
    setLoading(true);
    const { data } = await sb.from("host_rating_summary")
      .select("rating_count, avg_stars")
      .eq("host_user_id", hostUserId)
      .maybeSingle();
    setSummary(data ?? { rating_count: 0, avg_stars: 0 });
    setLoading(false);
  }, [hostUserId]);

  useEffect(() => { fetch(); }, [fetch]);
  return { summary, loading, refetch: fetch };
};

// ── Ratings list for a group + my own rating
export const useGroupHostRatings = (groupId: string | undefined) => {
  const { user } = useAuth();
  const [ratings, setRatings] = useState<HostRating[]>([]);
  const [myRating, setMyRating] = useState<HostRating | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);
    const { data } = await sb.from("host_ratings")
      .select("*").eq("group_id", groupId).order("created_at", { ascending: false });
    const list = (data as HostRating[]) ?? [];
    if (list.length > 0) {
      const uids = list.map(r => r.rater_user_id);
      const { data: profiles } = await sb.from("profiles").select("user_id, display_name, avatar_url").in("user_id", uids);
      const pMap: Record<string, { display_name: string; avatar_url: string }> = {};
      (profiles ?? []).forEach((p: any) => { pMap[p.user_id] = p; });
      const hydrated = list.map(r => ({ ...r, rater_name: pMap[r.rater_user_id]?.display_name, rater_avatar: pMap[r.rater_user_id]?.avatar_url }));
      setRatings(hydrated);
      if (user) setMyRating(hydrated.find(r => r.rater_user_id === user.id) ?? null);
    } else {
      setRatings([]);
      setMyRating(null);
    }
    setLoading(false);
  }, [groupId, user]);

  useEffect(() => { fetch(); }, [fetch]);
  return { ratings, myRating, loading, refetch: fetch };
};

// ── Submit / update / delete
export const useHostRatingActions = () => {
  const { user } = useAuth();

  const submit = async (input: {
    groupId: string; hostUserId: string; stars: number; comment?: string;
  }): Promise<{ error?: string }> => {
    if (!user) return { error: "Not authenticated" };
    const { error } = await sb.from("host_ratings").upsert({
      group_id: input.groupId,
      host_user_id: input.hostUserId,
      rater_user_id: user.id,
      stars: input.stars,
      comment: input.comment?.trim() || null,
    }, { onConflict: "group_id,rater_user_id" });
    return error ? { error: error.message } : {};
  };

  const remove = async (id: string): Promise<{ error?: string }> => {
    const { error } = await sb.from("host_ratings").delete().eq("id", id);
    return error ? { error: error.message } : {};
  };

  return { submit, remove };
};
