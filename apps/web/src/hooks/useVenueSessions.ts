import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

const sb = supabase as unknown as { from: (t: string) => any; rpc: (fn: string, args?: any) => any };

export interface OpenSession {
  user_id: string;
  session_id: string;
  venue_id: string;
  court_ref: string | null;
  title: string;
}

// Resolve which of the given users are currently in an open venue session
// (→ where to deliver a gifted drink). Returns a map keyed by user_id.
export const useOpenSessions = (userIds: string[]) => {
  const [map, setMap] = useState<Record<string, OpenSession>>({});
  const key = [...userIds].sort().join(",");

  const refetch = useCallback(async () => {
    if (userIds.length === 0) { setMap({}); return; }
    const { data } = await sb.rpc("fn_users_open_sessions", { p_users: userIds });
    const next: Record<string, OpenSession> = {};
    (data as OpenSession[] | null)?.forEach(s => { next[s.user_id] = s; });
    setMap(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => { refetch(); }, [refetch]);

  return { sessions: map, refetch };
};

export type VenueSessionStatus = "open" | "closed" | "cancelled";

export interface VenueSession {
  id: string;
  venue_id: string;
  title: string;
  court_ref: string | null;
  starts_at: string;
  ends_at: string | null;
  cohost_user_id: string | null;
  credit_back_rate: number;
  attribution_days: number;
  status: VenueSessionStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type VenueSessionInput = {
  title: string;
  court_ref?: string | null;
  starts_at: string;
  ends_at?: string | null;
  status?: VenueSessionStatus;
};

// ───────── Venue-side: list + CRUD sessions ─────────
export const useVenueSessions = (venueId: string | undefined) => {
  const { user } = useAuth();
  const [items, setItems] = useState<VenueSession[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!venueId) { setItems([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await sb.from("venue_sessions")
      .select("*").eq("venue_id", venueId)
      .order("starts_at", { ascending: false });
    setItems((data as VenueSession[]) ?? []);
    setLoading(false);
  }, [venueId]);

  useEffect(() => { refetch(); }, [refetch]);

  const create = async (input: VenueSessionInput) => {
    if (!venueId || !user) return { data: null, error: new Error("no_venue") };
    const { data, error } = await sb.from("venue_sessions")
      .insert({ ...input, venue_id: venueId, created_by: user.id }).select().single();
    if (!error) await refetch();
    return { data: data as VenueSession | null, error };
  };

  const update = async (id: string, input: Partial<VenueSessionInput>) => {
    const { data, error } = await sb.from("venue_sessions")
      .update(input).eq("id", id).select().single();
    if (!error) await refetch();
    return { data: data as VenueSession | null, error };
  };

  const remove = async (id: string) => {
    const { error } = await sb.from("venue_sessions").delete().eq("id", id);
    if (!error) await refetch();
    return { error };
  };

  return { items, loading, refetch, create, update, remove };
};

// ───────── Player-side: single session + members + join ─────────
export const useVenueSession = (sessionId: string | undefined) => {
  const { user } = useAuth();
  const [session, setSession] = useState<VenueSession | null>(null);
  const [members, setMembers] = useState<{ user_id: string; joined_at: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!sessionId) { setSession(null); setMembers([]); setLoading(false); return; }
    setLoading(true);
    const { data: s } = await sb.from("venue_sessions").select("*").eq("id", sessionId).maybeSingle();
    setSession((s as VenueSession | null) ?? null);
    const { data: m } = await sb.from("venue_session_members")
      .select("user_id, joined_at").eq("session_id", sessionId);
    setMembers((m as { user_id: string; joined_at: string }[]) ?? []);
    setLoading(false);
  }, [sessionId]);

  useEffect(() => { refetch(); }, [refetch]);

  const joined = !!user && members.some(m => m.user_id === user.id);

  const join = async () => {
    if (!sessionId || !user) return { error: new Error("no_auth") };
    const { error } = await sb.from("venue_session_members")
      .insert({ session_id: sessionId, user_id: user.id });
    if (!error) await refetch();
    return { error };
  };

  const leave = async () => {
    if (!sessionId || !user) return { error: new Error("no_auth") };
    const { error } = await sb.from("venue_session_members")
      .delete().eq("session_id", sessionId).eq("user_id", user.id);
    if (!error) await refetch();
    return { error };
  };

  return { session, members, joined, loading, refetch, join, leave };
};
