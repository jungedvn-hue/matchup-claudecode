import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

const sb = supabase as unknown as { from: (t: string) => any; rpc: (fn: string, args?: any) => any };

// ── Types ────────────────────────────────────────────────────────────────────
export interface RefereeContribution {
  user_id: string;
  matches_officiated: number;
  social_verifications: number;
  tournaments_count: number;
  rating_avg: number | null;
  rating_count: number;
  certification_level: "community" | "regional" | "national";
  preferred_locations: string[] | null;
  bio: string | null;
}

export interface RefereeInvite {
  id: string;
  tournament_id: string;
  host_user_id: string;
  invitee_email: string;
  invitee_user_id: string | null;
  access_code: string;
  status: "pending" | "accepted" | "declined" | "expired";
  message: string | null;
  expires_at: string;
  responded_at: string | null;
  created_at: string;
}

// ── useRefereeContribution ────────────────────────────────────────────────────
export const useRefereeContribution = (userId?: string) => {
  const { user } = useAuth();
  const targetId = userId ?? user?.id;
  const [data, setData] = useState<RefereeContribution | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!targetId) { setLoading(false); return; }
    setLoading(true);
    const { data } = await sb.from("referee_contributions").select("*").eq("user_id", targetId).maybeSingle();
    setData((data as RefereeContribution) ?? null);
    setLoading(false);
  }, [targetId]);

  useEffect(() => { fetch(); }, [fetch]);

  const updateBio = async (bio: string | null, locations: string[] | null) => {
    if (!user) return { error: "Not authenticated" };
    const { error } = await sb.from("referee_contributions").upsert({
      user_id: user.id, bio, preferred_locations: locations,
    }, { onConflict: "user_id" });
    if (!error) await fetch();
    return { error };
  };

  return { data, loading, refetch: fetch, updateBio };
};

// ── useRefereeInvites (for current user as invitee or host) ─────────────────
export const useRefereeInvites = (mode: "invitee" | "host" = "invitee") => {
  const { user } = useAuth();
  const [invites, setInvites] = useState<RefereeInvite[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) { setInvites([]); setLoading(false); return; }
    setLoading(true);
    const filter = mode === "invitee"
      ? `invitee_user_id.eq.${user.id},invitee_email.eq.${user.email}`
      : `host_user_id.eq.${user.id}`;
    const { data } = await sb.from("referee_invites").select("*").or(filter)
      .order("created_at", { ascending: false });
    setInvites((data as RefereeInvite[]) ?? []);
    setLoading(false);
  }, [user, mode]);

  useEffect(() => { fetch(); }, [fetch]);

  const accept = async (code: string) => {
    const { data, error } = await sb.rpc("fn_accept_referee_invite", { p_code: code.toUpperCase() });
    if (!error) await fetch();
    return { inviteId: data as string | null, error };
  };

  const decline = async (id: string) => {
    const { data, error } = await sb.rpc("fn_decline_referee_invite", { p_invite_id: id });
    if (!error) await fetch();
    return { error };
  };

  return { invites, loading, refetch: fetch, accept, decline };
};

// ── Create invite (host) ─────────────────────────────────────────────────────
const generateCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // exclude I,O,0,1
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
};

export const useCreateRefereeInvite = () => {
  const { user } = useAuth();
  return async (input: { tournamentId: string; email: string; message?: string }) => {
    if (!user) return { error: "Not authenticated" };
    const code = generateCode();
    const { data, error } = await sb.from("referee_invites").insert({
      tournament_id: input.tournamentId,
      host_user_id: user.id,
      invitee_email: input.email.toLowerCase().trim(),
      access_code: code,
      message: input.message ?? null,
    }).select().single();
    return { invite: data as RefereeInvite | null, error: error?.message };
  };
};

// ── Browse certified referees ────────────────────────────────────────────────
export interface RefereeProfile extends RefereeContribution {
  display_name: string | null;
  avatar_url: string | null;
  location: string | null;
}

export const useRefereeBrowse = (search: string) => {
  const [results, setResults] = useState<RefereeProfile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      // Get top contributors first
      const { data: contribs } = await sb.from("referee_contributions")
        .select("*")
        .order("matches_officiated", { ascending: false })
        .limit(50);

      const userIds = (contribs ?? []).map((c: any) => c.user_id);
      if (userIds.length === 0) { setResults([]); setLoading(false); return; }

      const { data: profiles } = await sb.from("profiles")
        .select("user_id, display_name, avatar_url, location")
        .in("user_id", userIds);

      const pMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));
      let merged = (contribs ?? []).map((c: any): RefereeProfile => ({
        ...c,
        display_name: pMap.get(c.user_id)?.display_name ?? null,
        avatar_url: pMap.get(c.user_id)?.avatar_url ?? null,
        location: pMap.get(c.user_id)?.location ?? null,
      }));
      if (search.trim().length >= 2) {
        const q = search.toLowerCase();
        merged = merged.filter(r =>
          (r.display_name?.toLowerCase().includes(q)) ||
          (r.location?.toLowerCase().includes(q))
        );
      }
      if (cancelled) return;
      setResults(merged);
      setLoading(false);
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [search]);

  return { results, loading };
};
