import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { calculateDUPRDelta } from "@/lib/scoring";
import { awardMatchPlayedXP, awardMatchVerifiedXP, awardVerifyXP } from "@/lib/gamification";

// Loose typed Supabase client — schema not yet regenerated for new tables
const sb = supabase as unknown as {
  from: (t: string) => any;
};

export type MatchFormat = "singles" | "doubles";
export type MatchStatus = "pending_opponent" | "pending_referee" | "confirmed" | "disputed" | "cancelled";
export type MatchResult = "won" | "lost";

export interface SetScore {
  submitter: number;
  opponent: number;
}

export interface MatchRecord {
  id: string;
  submitter_user_id: string;
  opponent_user_id: string;
  referee_user_id: string | null;
  format: MatchFormat;
  partner_user_id: string | null;
  opponent_partner_user_id: string | null;
  result: MatchResult;
  status: MatchStatus;
  opponent_verified: boolean;
  referee_verified: boolean;
  verified: boolean;
  dupr_delta_submitter: number | null;
  dupr_delta_opponent: number | null;
  duration_minutes: number | null;
  created_at: string;
  updated_at: string;
  // sets
  submitter_score_set1: number | null; opponent_score_set1: number | null;
  submitter_score_set2: number | null; opponent_score_set2: number | null;
  submitter_score_set3: number | null; opponent_score_set3: number | null;
  submitter_score_set4: number | null; opponent_score_set4: number | null;
  submitter_score_set5: number | null; opponent_score_set5: number | null;
  // joined profile data (optional)
  submitter_profile?: { display_name: string | null; avatar_url: string | null; dupr_rating: number };
  opponent_profile?: { display_name: string | null; avatar_url: string | null; dupr_rating: number };
  referee_profile?: { display_name: string | null; avatar_url: string | null } | null;
}

export interface CreateMatchInput {
  opponentUserId: string;
  refereeUserId?: string | null;
  format: MatchFormat;
  partnerUserId?: string | null;
  opponentPartnerUserId?: string | null;
  sets: SetScore[];
  durationMinutes?: number | null;
  notes?: string | null;
}

const computeResult = (sets: SetScore[]): MatchResult => {
  const wonSets = sets.filter(s => s.submitter > s.opponent).length;
  const lostSets = sets.filter(s => s.opponent > s.submitter).length;
  return wonSets > lostSets ? "won" : "lost";
};

export const useCreateMatch = () => {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const createMatch = useCallback(async (input: CreateMatchInput): Promise<{ id: string } | { error: string }> => {
    if (!user) return { error: "Not logged in" };
    setSubmitting(true);
    try {
      const result = computeResult(input.sets);
      const setMap: Record<string, number | null> = {};
      for (let i = 0; i < 5; i++) {
        const s = input.sets[i];
        setMap[`submitter_score_set${i + 1}`] = s ? s.submitter : null;
        setMap[`opponent_score_set${i + 1}`] = s ? s.opponent : null;
      }
      const initialStatus: MatchStatus = input.refereeUserId ? "pending_opponent" : "pending_opponent";
      const { data, error } = await sb.from("match_records").insert({
        submitter_user_id: user.id,
        opponent_user_id: input.opponentUserId,
        referee_user_id: input.refereeUserId ?? null,
        format: input.format,
        partner_user_id: input.partnerUserId ?? null,
        opponent_partner_user_id: input.opponentPartnerUserId ?? null,
        result,
        status: initialStatus,
        duration_minutes: input.durationMinutes ?? null,
        notes: input.notes ?? null,
        ...setMap,
      }).select("id").single();
      if (error) return { error: error.message };
      // Award match_played XP to submitter immediately (logging the match)
      await awardMatchPlayedXP(user.id, data.id);
      return { id: data.id };
    } finally {
      setSubmitting(false);
    }
  }, [user]);

  return { createMatch, submitting };
};

export const useVerifyMatch = () => {
  const { user } = useAuth();
  const [working, setWorking] = useState(false);

  // role: 'opponent' or 'referee'; action: 'confirm' or 'dispute'
  const verifyMatch = useCallback(async (
    matchId: string,
    role: "opponent" | "referee",
    action: "confirm" | "dispute"
  ): Promise<{ ok: true } | { error: string }> => {
    if (!user) return { error: "Not logged in" };
    setWorking(true);
    try {
      const { data: match, error: fetchErr } = await sb
        .from("match_records")
        .select("*")
        .eq("id", matchId)
        .single();
      if (fetchErr) return { error: fetchErr.message };

      if (action === "dispute") {
        const { error } = await sb.from("match_records").update({
          status: "disputed",
        }).eq("id", matchId);
        if (error) return { error: error.message };
        return { ok: true };
      }

      // Confirm path
      const update: Record<string, unknown> = {};
      const now = new Date().toISOString();
      if (role === "opponent") {
        update.opponent_verified = true;
        update.opponent_verified_at = now;
      } else {
        update.referee_verified = true;
        update.referee_verified_at = now;
      }

      const opponentDone = role === "opponent" ? true : match.opponent_verified;
      const refereeDone = role === "referee" ? true : match.referee_verified;
      const refRequired = !!match.referee_user_id;
      const fullyVerified = opponentDone && (!refRequired || refereeDone);

      if (fullyVerified) {
        update.status = "confirmed";
        update.verified = true;

        // DUPR delta calculation
        const sets = [
          [match.submitter_score_set1, match.opponent_score_set1],
          [match.submitter_score_set2, match.opponent_score_set2],
          [match.submitter_score_set3, match.opponent_score_set3],
          [match.submitter_score_set4, match.opponent_score_set4],
          [match.submitter_score_set5, match.opponent_score_set5],
        ].filter(([a, b]) => a != null && b != null);
        const totalSubmitter = sets.reduce((s, [a]) => s + (a ?? 0), 0);
        const totalOpponent = sets.reduce((s, [, b]) => s + (b ?? 0), 0);

        const { data: subProf } = await sb.from("profiles").select("dupr_rating").eq("user_id", match.submitter_user_id).single();
        const { data: oppProf } = await sb.from("profiles").select("dupr_rating").eq("user_id", match.opponent_user_id).single();
        const subRating = subProf?.dupr_rating ?? 2.0;
        const oppRating = oppProf?.dupr_rating ?? 2.0;

        const subDelta = calculateDUPRDelta({
          playerRating: subRating,
          opponentRating: oppRating,
          scoreA: totalSubmitter,
          scoreB: totalOpponent,
          isWon: match.result === "won",
        });
        const oppDelta = -subDelta;

        update.dupr_delta_submitter = subDelta;
        update.dupr_delta_opponent = oppDelta;

        await sb.from("profiles").update({ dupr_rating: subRating + subDelta }).eq("user_id", match.submitter_user_id);
        await sb.from("profiles").update({ dupr_rating: oppRating + oppDelta }).eq("user_id", match.opponent_user_id);

        // Compute match-level totals + max margin for gamification
        const sumSub = sets.reduce((s, [a]) => s + (a ?? 0), 0);
        const sumOpp = sets.reduce((s, [, b]) => s + (b ?? 0), 0);
        const maxMargin = Math.max(...sets.map(([a, b]) => Math.abs((a ?? 0) - (b ?? 0))), 0);

        // Opponent already played the match → award MATCH_PLAYED to opponent now (submitter got it on create)
        await awardMatchPlayedXP(match.opponent_user_id, match.id);
        // Win/loss XP for both
        await awardMatchVerifiedXP(match.submitter_user_id, match.id, match.result === "won", sumSub, maxMargin);
        await awardMatchVerifiedXP(match.opponent_user_id, match.id, match.result === "lost", sumOpp, maxMargin);
        // Reward verifier (the user acting now) for verifying
        await awardVerifyXP(user.id, match.id);
        await sb.from("match_records").update({ xp_awarded: true }).eq("id", matchId);
      }

      const { error } = await sb.from("match_records").update(update).eq("id", matchId);
      if (error) return { error: error.message };
      return { ok: true };
    } finally {
      setWorking(false);
    }
  }, [user]);

  return { verifyMatch, working };
};

// Hydrate matches with profile data via a single bulk profile fetch
const hydrateMatchProfiles = async (matches: MatchRecord[]): Promise<MatchRecord[]> => {
  if (matches.length === 0) return matches;
  const userIds = new Set<string>();
  matches.forEach(m => {
    userIds.add(m.submitter_user_id);
    userIds.add(m.opponent_user_id);
    if (m.referee_user_id) userIds.add(m.referee_user_id);
  });
  const { data: profiles } = await sb.from("profiles")
    .select("user_id, display_name, avatar_url, dupr_rating")
    .in("user_id", Array.from(userIds));
  const profileMap = new Map<string, { display_name: string | null; avatar_url: string | null; dupr_rating: number }>();
  (profiles ?? []).forEach((p: { user_id: string; display_name: string | null; avatar_url: string | null; dupr_rating: number }) => {
    profileMap.set(p.user_id, { display_name: p.display_name, avatar_url: p.avatar_url, dupr_rating: p.dupr_rating });
  });
  return matches.map(m => ({
    ...m,
    submitter_profile: profileMap.get(m.submitter_user_id),
    opponent_profile: profileMap.get(m.opponent_user_id),
    referee_profile: m.referee_user_id ? profileMap.get(m.referee_user_id) ?? null : null,
  }));
};

export const useMatchRecords = (filter?: { result?: MatchResult; limit?: number }) => {
  const { user } = useAuth();
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!user) { setMatches([]); setLoading(false); return; }
    setLoading(true);
    let query = sb.from("match_records")
      .select("*")
      .or(`submitter_user_id.eq.${user.id},opponent_user_id.eq.${user.id}`)
      .order("created_at", { ascending: false });
    if (filter?.result) query = query.eq("result", filter.result);
    if (filter?.limit) query = query.limit(filter.limit);
    const { data, error } = await query;
    if (!error && data) {
      const hydrated = await hydrateMatchProfiles(data as MatchRecord[]);
      setMatches(hydrated);
    }
    setLoading(false);
  }, [user, filter?.result, filter?.limit]);

  useEffect(() => { refetch(); }, [refetch]);

  return { matches, loading, refetch };
};

export const usePendingVerifications = () => {
  const { user } = useAuth();
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!user) { setMatches([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await sb.from("match_records")
      .select("*")
      .in("status", ["pending_opponent", "pending_referee"])
      .or(`opponent_user_id.eq.${user.id},referee_user_id.eq.${user.id}`)
      .order("created_at", { ascending: false });
    if (!error && data) {
      const filtered = (data as MatchRecord[]).filter(m => {
        if (m.opponent_user_id === user.id && !m.opponent_verified) return true;
        if (m.referee_user_id === user.id && !m.referee_verified) return true;
        return false;
      });
      const hydrated = await hydrateMatchProfiles(filtered);
      setMatches(hydrated);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { refetch(); }, [refetch]);

  return { matches, loading, refetch };
};

export interface PlayerSearchResult {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  skill_level: string | null;
  dupr_rating: number;
}

export const usePlayerSearch = () => {
  const { user } = useAuth();
  const [results, setResults] = useState<PlayerSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const search = useCallback(async (term: string) => {
    if (!user || term.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const { data, error } = await sb.from("profiles")
      .select("user_id, display_name, avatar_url, skill_level, dupr_rating")
      .ilike("display_name", `%${term.trim()}%`)
      .neq("user_id", user.id)
      .limit(10);
    if (!error && data) setResults(data as PlayerSearchResult[]);
    setSearching(false);
  }, [user]);

  return { results, searching, search };
};

export interface PlayerStats {
  totalMatches: number;
  wins: number;
  losses: number;
  winRate: number;
  uniquePartners: number;
}

export const usePlayerStats = (userId?: string) => {
  const { user } = useAuth();
  const targetId = userId ?? user?.id;
  const [stats, setStats] = useState<PlayerStats>({ totalMatches: 0, wins: 0, losses: 0, winRate: 0, uniquePartners: 0 });
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!targetId) { setLoading(false); return; }
    setLoading(true);
    const { data } = await sb.from("match_records")
      .select("submitter_user_id, opponent_user_id, result, verified")
      .or(`submitter_user_id.eq.${targetId},opponent_user_id.eq.${targetId}`)
      .eq("verified", true);
    const rows = (data ?? []) as Array<{ submitter_user_id: string; opponent_user_id: string; result: MatchResult }>;
    let wins = 0, losses = 0;
    const partners = new Set<string>();
    rows.forEach(r => {
      const isSubmitter = r.submitter_user_id === targetId;
      const playerWon = isSubmitter ? r.result === "won" : r.result === "lost";
      if (playerWon) wins++; else losses++;
      partners.add(isSubmitter ? r.opponent_user_id : r.submitter_user_id);
    });
    const totalMatches = wins + losses;
    setStats({
      totalMatches,
      wins,
      losses,
      winRate: totalMatches ? Math.round((wins / totalMatches) * 100) : 0,
      uniquePartners: partners.size,
    });
    setLoading(false);
  }, [targetId]);

  useEffect(() => { refetch(); }, [refetch]);

  return { stats, loading, refetch };
};

export interface PlayerProfile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  location: string | null;
  bio: string | null;
  skill_level: string | null;
  play_time: string | null;
  play_style: string | null;
  dupr_rating: number;
  total_xp: number;
  current_level: number;
  gems: number;
}

export const usePlayerProfile = (userId?: string) => {
  const { user } = useAuth();
  const targetId = userId ?? user?.id;
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!targetId) { setProfile(null); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await sb.from("profiles")
      .select("user_id, display_name, avatar_url, location, bio, skill_level, play_time, play_style, dupr_rating, total_xp, current_level, gems")
      .eq("user_id", targetId)
      .single();
    if (!error && data) setProfile(data as PlayerProfile);
    setLoading(false);
  }, [targetId]);

  useEffect(() => { refetch(); }, [refetch]);

  return { profile, loading, refetch };
};
