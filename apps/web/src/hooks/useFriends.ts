import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

const sb = supabase as unknown as { from: (t: string) => any };

export type FriendStatus = "pending" | "accepted" | "rejected" | "blocked";

export interface Friendship {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: FriendStatus;
  created_at: string;
  updated_at: string;
}

export interface FriendProfile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  skill_level: string | null;
  location: string | null;
}

export interface FriendEntry {
  friendship: Friendship;
  /** The other user (not me) */
  other: FriendProfile;
}

/**
 * Relation between current user and a target user.
 *   none      — no record
 *   outgoing  — I sent the request, target hasn't responded
 *   incoming  — Target sent me a request, I haven't responded
 *   friends   — accepted on both sides
 *   blocked   — I blocked them OR they blocked me
 */
export type FriendRelation = "none" | "outgoing" | "incoming" | "friends" | "blocked";

const hydrate = async (rows: Friendship[], myId: string): Promise<FriendEntry[]> => {
  if (!rows.length) return [];
  const otherIds = rows.map(r => (r.sender_id === myId ? r.receiver_id : r.sender_id));
  const { data: profiles } = await sb.from("profiles")
    .select("user_id, display_name, avatar_url, skill_level, location")
    .in("user_id", otherIds);
  const map: Record<string, FriendProfile> = {};
  (profiles ?? []).forEach((p: any) => { map[p.user_id] = p; });
  return rows.map(r => ({
    friendship: r,
    other: map[r.sender_id === myId ? r.receiver_id : r.sender_id] ?? {
      user_id: r.sender_id === myId ? r.receiver_id : r.sender_id,
      display_name: null, avatar_url: null, skill_level: null, location: null,
    },
  }));
};

// ── Lists ─────────────────────────────────────────────────────────────────────

export const useFriends = () => {
  const { user } = useAuth();
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [incoming, setIncoming] = useState<FriendEntry[]>([]);
  const [outgoing, setOutgoing] = useState<FriendEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) {
      setFriends([]); setIncoming([]); setOutgoing([]); setLoading(false); return;
    }
    setLoading(true);
    const { data } = await sb.from("friendships")
      .select("*")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order("updated_at", { ascending: false });

    const rows = (data as Friendship[]) ?? [];
    const acceptedRows = rows.filter(r => r.status === "accepted");
    const incomingRows = rows.filter(r => r.status === "pending" && r.receiver_id === user.id);
    const outgoingRows = rows.filter(r => r.status === "pending" && r.sender_id === user.id);

    const [accepted, inc, out] = await Promise.all([
      hydrate(acceptedRows, user.id),
      hydrate(incomingRows, user.id),
      hydrate(outgoingRows, user.id),
    ]);
    setFriends(accepted); setIncoming(inc); setOutgoing(out);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  return { friends, incoming, outgoing, loading, refetch: fetch };
};

// ── Relation with a specific user ─────────────────────────────────────────────

export const useFriendRelation = (otherUserId: string | undefined) => {
  const { user } = useAuth();
  const [relation, setRelation] = useState<FriendRelation>("none");
  const [friendshipId, setFriendshipId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!user || !otherUserId || user.id === otherUserId) {
      setRelation("none"); setFriendshipId(null); return;
    }
    setLoading(true);
    const { data } = await sb.from("friendships")
      .select("*")
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
      .limit(1)
      .maybeSingle();

    const row = data as Friendship | null;
    if (!row) { setRelation("none"); setFriendshipId(null); setLoading(false); return; }
    setFriendshipId(row.id);
    if (row.status === "blocked") setRelation("blocked");
    else if (row.status === "accepted") setRelation("friends");
    else if (row.status === "pending") setRelation(row.sender_id === user.id ? "outgoing" : "incoming");
    else setRelation("none");
    setLoading(false);
  }, [user, otherUserId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { relation, friendshipId, loading, refetch: fetch };
};

// ── Actions ───────────────────────────────────────────────────────────────────

export const useFriendActions = () => {
  const { user } = useAuth();

  const sendRequest = async (targetUserId: string): Promise<{ error?: string }> => {
    if (!user) return { error: "Not authenticated" };
    if (user.id === targetUserId) return { error: "Cannot friend yourself" };
    const { error } = await sb.from("friendships").insert({
      sender_id: user.id,
      receiver_id: targetUserId,
      status: "pending",
    });
    return error ? { error: error.message } : {};
  };

  const acceptRequest = async (friendshipId: string): Promise<{ error?: string }> => {
    const { error } = await sb.from("friendships")
      .update({ status: "accepted" })
      .eq("id", friendshipId);
    return error ? { error: error.message } : {};
  };

  const rejectRequest = async (friendshipId: string): Promise<{ error?: string }> => {
    // Receiver rejects — delete row so sender can retry later
    const { error } = await sb.from("friendships").delete().eq("id", friendshipId);
    return error ? { error: error.message } : {};
  };

  const cancelRequest = async (friendshipId: string): Promise<{ error?: string }> => {
    const { error } = await sb.from("friendships").delete().eq("id", friendshipId);
    return error ? { error: error.message } : {};
  };

  const removeFriend = async (friendshipId: string): Promise<{ error?: string }> => {
    const { error } = await sb.from("friendships").delete().eq("id", friendshipId);
    return error ? { error: error.message } : {};
  };

  return { sendRequest, acceptRequest, rejectRequest, cancelRequest, removeFriend };
};

// ── Pending count badge ───────────────────────────────────────────────────────

export const usePendingFriendCount = () => {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  const fetch = useCallback(async () => {
    if (!user) { setCount(0); return; }
    const { count: c } = await sb.from("friendships")
      .select("id", { count: "exact", head: true })
      .eq("receiver_id", user.id)
      .eq("status", "pending");
    setCount(c ?? 0);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);
  return { count, refetch: fetch };
};
