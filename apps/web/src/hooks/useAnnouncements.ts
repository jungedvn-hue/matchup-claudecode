import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

const sb = supabase as unknown as { from: (t: string) => any };

export interface Announcement {
  id: string;
  group_id: string;
  author_id: string;
  title: string | null;
  body: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface AnnouncementWithAuthor extends Announcement {
  author_name: string | null;
  author_avatar: string | null;
}

export const useAnnouncements = (groupId: string | undefined) => {
  const [items, setItems] = useState<AnnouncementWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!groupId) { setItems([]); setLoading(false); return; }
    setLoading(true);

    const { data } = await sb.from("group_announcements")
      .select("*").eq("group_id", groupId)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false });

    const rows = (data ?? []) as Announcement[];
    if (rows.length === 0) { setItems([]); setLoading(false); return; }

    const authorIds = Array.from(new Set(rows.map(r => r.author_id)));
    const { data: profiles } = await sb.from("profiles")
      .select("user_id, display_name, avatar_url").in("user_id", authorIds);
    const pMap: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
    (profiles ?? []).forEach((p: any) => { pMap[p.user_id] = p; });

    setItems(rows.map(r => ({
      ...r,
      author_name: pMap[r.author_id]?.display_name ?? null,
      author_avatar: pMap[r.author_id]?.avatar_url ?? null,
    })));
    setLoading(false);
  }, [groupId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { items, loading, refetch: fetch };
};

export const useAnnouncementActions = () => {
  const { user } = useAuth();

  const create = async (input: {
    groupId: string;
    title?: string;
    body: string;
    pinned?: boolean;
  }): Promise<{ error?: string }> => {
    if (!user) return { error: "Not authenticated" };
    const { error } = await sb.from("group_announcements").insert({
      group_id: input.groupId,
      author_id: user.id,
      title: input.title?.trim() || null,
      body: input.body.trim(),
      pinned: input.pinned ?? false,
    });
    return error ? { error: error.message } : {};
  };

  const update = async (id: string, patch: { title?: string | null; body?: string; pinned?: boolean }): Promise<{ error?: string }> => {
    const payload: any = {};
    if (patch.title !== undefined) payload.title = patch.title?.toString().trim() || null;
    if (patch.body !== undefined)  payload.body  = patch.body.trim();
    if (patch.pinned !== undefined) payload.pinned = patch.pinned;
    const { error } = await sb.from("group_announcements").update(payload).eq("id", id);
    return error ? { error: error.message } : {};
  };

  const remove = async (id: string): Promise<{ error?: string }> => {
    const { error } = await sb.from("group_announcements").delete().eq("id", id);
    return error ? { error: error.message } : {};
  };

  const togglePin = async (id: string, pinned: boolean): Promise<{ error?: string }> => {
    const { error } = await sb.from("group_announcements").update({ pinned }).eq("id", id);
    return error ? { error: error.message } : {};
  };

  return { create, update, remove, togglePin };
};
