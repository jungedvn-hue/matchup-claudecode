import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as unknown as { from: (t: string) => any; rpc: (fn: string, args?: any) => any };

export type GroupInviteStatus = "pending" | "accepted" | "declined" | "cancelled";

export interface GroupInviteRow {
  id: string;
  group_id: string;
  inviter_user_id: string;
  invitee_user_id: string;
  status: GroupInviteStatus;
  message: string | null;
  created_at: string;
  responded_at: string | null;
}

export interface PendingInvite {
  invite: GroupInviteRow;
  group:  { id: string; name: string; cover_emoji: string | null; city: string | null };
  inviter: { user_id: string; display_name: string | null; avatar_url: string | null };
}

// Pending invites addressed to the current user
export const useMyPendingGroupInvites = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) { setItems([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await sb.from("group_invites")
      .select("*")
      .eq("invitee_user_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    const rows = (data ?? []) as GroupInviteRow[];
    if (rows.length === 0) { setItems([]); setLoading(false); return; }

    const groupIds   = Array.from(new Set(rows.map(r => r.group_id)));
    const inviterIds = Array.from(new Set(rows.map(r => r.inviter_user_id)));
    const [{ data: groups }, { data: profiles }] = await Promise.all([
      sb.from("groups").select("id, name, cover_emoji, city").in("id", groupIds),
      sb.from("profiles").select("user_id, display_name, avatar_url").in("user_id", inviterIds),
    ]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const gmap: Record<string, any> = {}; (groups ?? []).forEach((g: any) => { gmap[g.id] = g; });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pmap: Record<string, any> = {}; (profiles ?? []).forEach((p: any) => { pmap[p.user_id] = p; });

    setItems(rows.map(r => ({
      invite: r,
      group:  gmap[r.group_id] ?? { id: r.group_id, name: "", cover_emoji: null, city: null },
      inviter: pmap[r.inviter_user_id] ?? { user_id: r.inviter_user_id, display_name: null, avatar_url: null },
    })));
    setLoading(false);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  return { items, loading, refetch: fetch };
};

// Invitee actions
export const respondToGroupInvite = async (inviteId: string, accept: boolean) => {
  const { error } = await sb.rpc("respond_to_group_invite", { p_invite_id: inviteId, p_accept: accept });
  return { error: error?.message ?? null };
};

// Host action
export const inviteFriendsToGroup = async (
  groupId: string,
  inviteeIds: string[],
  message?: string,
) => {
  const { data, error } = await sb.rpc("invite_friends_to_group", {
    p_group_id: groupId,
    p_invitee_ids: inviteeIds,
    p_message: message ?? null,
  });
  return { invited: (data as number) ?? 0, error: error?.message ?? null };
};

// Pending invitee IDs for a group (so the dialog can hide already-invited friends)
export const useGroupPendingInviteeIds = (groupId: string | undefined) => {
  const [ids, setIds] = useState<Set<string>>(new Set());
  const fetch = useCallback(async () => {
    if (!groupId) { setIds(new Set()); return; }
    const { data } = await sb.from("group_invites")
      .select("invitee_user_id")
      .eq("group_id", groupId)
      .eq("status", "pending");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setIds(new Set((data ?? []).map((r: any) => r.invitee_user_id as string)));
  }, [groupId]);
  useEffect(() => { fetch(); }, [fetch]);
  return { ids, refetch: fetch };
};
