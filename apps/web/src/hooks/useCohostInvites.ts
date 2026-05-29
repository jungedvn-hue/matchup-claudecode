import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

const sb = supabase as unknown as { from: (t: string) => any; rpc: (fn: string, args?: any) => any };

export type CohostInviteStatus = "pending" | "accepted" | "declined" | "cancelled";

export interface CohostInvite {
  id: string;
  session_id: string;
  venue_id: string;
  host_user_id: string;
  credit_back_rate: number;
  attribution_days: number;
  status: CohostInviteStatus;
  created_at: string;
  responded_at: string | null;
  session?: { title: string; starts_at: string; venue?: { name: string } | null } | null;
  host?: { display_name: string | null; avatar_url: string | null } | null;
}

// Venue owner: invites for a single session + invite/cancel actions.
export const useSessionCohostInvites = (sessionId: string | undefined) => {
  const [invites, setInvites] = useState<CohostInvite[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!sessionId) { setInvites([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await sb.from("venue_cohost_invites")
      .select("*").eq("session_id", sessionId)
      .order("created_at", { ascending: false });
    const rows = (data as CohostInvite[]) ?? [];
    // host_user_id references auth.users, so resolve profile names separately.
    const ids = [...new Set(rows.map(r => r.host_user_id))];
    if (ids.length) {
      const { data: profs } = await sb.from("profiles")
        .select("user_id, display_name, avatar_url").in("user_id", ids);
      const map = new Map<string, any>((profs ?? []).map((p: any) => [p.user_id, p]));
      rows.forEach(r => { r.host = map.get(r.host_user_id) ?? null; });
    }
    setInvites(rows);
    setLoading(false);
  }, [sessionId]);

  useEffect(() => { refetch(); }, [refetch]);

  const invite = async (hostId: string, rate: number, days: number) => {
    const { error } = await sb.rpc("invite_cohost", {
      p_session_id: sessionId, p_host_id: hostId, p_rate: rate, p_days: days,
    });
    if (!error) await refetch();
    return { error };
  };

  const cancel = async (inviteId: string) => {
    const { error } = await sb.rpc("cancel_cohost_invite", { p_invite_id: inviteId });
    if (!error) await refetch();
    return { error };
  };

  return { invites, loading, refetch, invite, cancel };
};

// Host: my pending/responded invitations + respond.
export const useMyCohostInvites = () => {
  const { user } = useAuth();
  const [invites, setInvites] = useState<CohostInvite[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!user) { setInvites([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await sb.from("venue_cohost_invites")
      .select("*, session:venue_sessions(title, starts_at, venue:venues(name))")
      .eq("host_user_id", user.id)
      .order("created_at", { ascending: false });
    setInvites((data as CohostInvite[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { refetch(); }, [refetch]);

  const respond = async (inviteId: string, accept: boolean) => {
    const { error } = await sb.rpc("respond_cohost_invite", { p_invite_id: inviteId, p_accept: accept });
    if (!error) await refetch();
    return { error };
  };

  return { invites, loading, refetch, respond };
};
