import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Tournament, TournamentMatch } from "@/lib/tournament/types";
import { useAuth } from "@/context/AuthContext";
import i18n from "@/i18n";

interface TournamentContextValue {
  tournaments: Tournament[];
  loading: boolean;
  addTournament: (t: Tournament) => Promise<void>;
  updateTournament: (t: Tournament) => Promise<void>;
  updateMatchScore: (matchId: string, scoreA: number, scoreB: number, status: string, winnerId?: string, setScores?: { a: number; b: number }[]) => Promise<void>;
  deleteTournament: (id: string) => Promise<void>;
  getTournament: (id: string) => Tournament | undefined;
  refreshTournaments: () => Promise<void>;
  // Actions used by the per-page realtime hook to apply scoped updates without
  // triggering a full refetch.
  applyMatchUpdate: (match: Partial<TournamentMatch> & { id: string }) => void;
  applyCategoryUpdate: (rawCategoryRow: any) => void;
}

const TournamentContext = createContext<TournamentContextValue | null>(null);

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DBParticipant {
  id: string;
  category_id: string;
  name: string;
  seed?: number;
  skill_level?: string;
}

interface DBMatch {
  id: string;
  category_id: string;
  tournament_id: string;
  pool_id?: string;
  bracket_round_id?: string;
  match_no: number;
  entry_a_id: string | null;
  entry_b_id: string | null;
  entry_a_name: string;
  entry_b_name: string;
  score_a: number;
  score_b: number;
  winner_id?: string;
  status: string;
  court_id?: string;
  referee_id?: string;
}

interface DBCategory {
  id: string;
  tournament_id: string;
  type: string;
  name: string;
  advancing_per_pool: number;
  wildcard_count: number;
  pool_allocation_mode: string;
  pools: any[];
  bracket_rounds: any[];
  participants: DBParticipant[];
  matches: DBMatch[];
}

interface DBTournament {
  id: string;
  name: string;
  date: string;
  location: string;
  format: string;
  points_per_game: number;
  win_by_two: boolean;
  num_sets?: number;
  max_points?: number | null;
  status: string;
  ranking_priority: any[];
  host_id: string;
  referees: any[];
  courts: any[];
  categories: DBCategory[];
}

export const TournamentProvider = ({ children }: { children: ReactNode }) => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const transformToDBMatch = (m: TournamentMatch, tournamentId: string) => ({
    id: m.id,
    category_id: m.categoryId,
    tournament_id: tournamentId,
    pool_id: m.poolId,
    bracket_round_id: m.bracketRoundId,
    match_no: m.matchNo,
    entry_a_id: (m.entryAId?.startsWith('bye-') || m.entryAId?.startsWith('tbd-')) ? null : m.entryAId,
    entry_b_id: (m.entryBId?.startsWith('bye-') || m.entryBId?.startsWith('tbd-')) ? null : m.entryBId,
    entry_a_name: m.entryAName,
    entry_b_name: m.entryBName,
    score_a: m.scoreA,
    score_b: m.scoreB,
    winner_id: m.winner,
    status: m.status || 'not_started',
    court_id: m.courtId,
    referee_id: m.refereeId
  });

  const fetchTournaments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select(`
          *,
          categories:tour_categories (
            *,
            participants:tour_participants (*),
            matches:tour_matches (*)
          )
        `);

      if (error) throw error;

      const transformed: Tournament[] = (data as unknown as DBTournament[] || []).map(t => {
        return {
        ...t,
        referees: t.referees || [],
        courts: t.courts || [],
        rankingPriority: t.ranking_priority || ["wins", "head_to_head", "point_diff", "points_scored"],
        numSets: t.num_sets ?? 1,
        maxPoints: t.max_points ?? undefined,
        categories: (t.categories || []).map((c) => {
          // Build a lookup of live match data (scores, status, winner) keyed by match id
          const liveMatches = (c.matches || []).map((m) => ({
            id: m.id,
            categoryId: m.category_id,
            poolId: m.pool_id,
            bracketRoundId: m.bracket_round_id,
            matchNo: m.match_no,
            entryAId: m.entry_a_id || "",
            entryBId: m.entry_b_id || "",
            entryAName: m.entry_a_name,
            entryBName: m.entry_b_name,
            scoreA: m.score_a,
            scoreB: m.score_b,
            setScores: ((m as any).set_scores as { a: number; b: number }[] | undefined) || [],
            winner: m.winner_id,
            status: m.status as any,
            courtId: m.court_id,
            refereeId: m.referee_id
          }));
          const liveMap = new Map(liveMatches.map(m => [m.id, m]));

          // Pools/brackets are stored as JSONB snapshots, but the canonical scores
          // live in tour_matches. Merge live data into the snapshots so the UI
          // (which reads from pools[*].matches) reflects the latest state.
          const mergePoolMatches = (matches: any[]) =>
            (matches || []).map((m) => liveMap.get(m.id) || m);

          const pools = (c.pools || []).map((p: any) => ({
            ...p,
            matches: mergePoolMatches(p.matches || []),
          }));
          const bracketRounds = (c.bracket_rounds || []).map((r: any) => ({
            ...r,
            matches: mergePoolMatches(r.matches || []),
          }));

          return {
            ...c,
            type: c.type as any,
            advancingPerPool: c.advancing_per_pool ?? 2,
            wildcardCount: c.wildcard_count || 0,
            entries: (c.participants || []).map((p: any) => ({
              id: p.id,
              name: p.name,
              seed: p.seed,
              skillLevel: p.skill_level,
              userId: p.user_id || undefined,
            })),
            pools,
            bracketRounds,
            poolAllocationMode: c.pool_allocation_mode as any,
            bracketFillMode: ((c as any).bracket_fill_mode as any) || "wildcard",
            matches: liveMatches
          };
        })
      };});

      setTournaments(transformed);
    } catch (err: any) {
      console.error("Error fetching tournaments:", err);
      toast.error("Failed to load tournaments from cloud");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTournaments();
  }, []);

  // Scoped realtime: pages subscribe via `useTournamentRealtime(ids)` and call
  // these actions to merge incoming events into state.
  const applyMatchUpdate = (updatedMatch: Partial<TournamentMatch> & { id: string }) => {
    setTournaments(prev => prev.map(t => ({
      ...t,
      categories: (t.categories || []).map(c => ({
        ...c,
        pools: (c.pools || []).map(p => ({
          ...p,
          matches: (p.matches || []).map(m => m.id === updatedMatch.id ? { ...m, ...updatedMatch } : m)
        })),
        bracketRounds: (c.bracketRounds || []).map(r => ({
          ...r,
          matches: (r.matches || []).map(m => m.id === updatedMatch.id ? { ...m, ...updatedMatch } : m)
        }))
      }))
    })));
  };

  const applyCategoryUpdate = (raw: any) => {
    setTournaments(prev => prev.map(t => ({
      ...t,
      categories: t.categories.map(c => {
        if (c.id !== raw.id) return c;
        const liveById = new Map<string, any>();
        (c.matches || []).forEach((m: any) => liveById.set(m.id, m));
        const mergeScores = (matches: any[]) =>
          (matches || []).map((m: any) => {
            const live = liveById.get(m.id);
            return live ? { ...m, scoreA: live.scoreA, scoreB: live.scoreB, winner: live.winner, status: live.status } : m;
          });
        const newPools = (raw.pools || []).map((p: any) => ({ ...p, matches: mergeScores(p.matches || []) }));
        const newRounds = (raw.bracket_rounds || []).map((r: any) => ({ ...r, matches: mergeScores(r.matches || []) }));
        return {
          ...c,
          pools: newPools,
          bracketRounds: newRounds,
          advancingPerPool: raw.advancing_per_pool ?? c.advancingPerPool,
          wildcardCount: raw.wildcard_count ?? c.wildcardCount,
          bracketFillMode: raw.bracket_fill_mode || c.bracketFillMode,
        };
      })
    })));
  };

  const addTournament = async (t: Tournament) => {
    try {
      if (!user) {
        throw new Error(i18n.t("tm.toast.tournamentSignInRequired") as string);
      }
      
      const { data: tourData, error: tourError } = await supabase
        .from('tournaments')
        .insert([{
          id: t.id,
          name: t.name,
          date: t.date,
          location: t.location,
          format: t.format,
          points_per_game: t.pointsPerGame,
          win_by_two: t.winByTwo,
          num_sets: t.numSets ?? 1,
          max_points: t.maxPoints ?? null,
          status: t.status,
          ranking_priority: t.rankingPriority,
          host_id: user?.id,
          referees: t.referees || [],
          courts: t.courts || []
        }])
        .select()
        .single();

      if (tourError) throw tourError;

      // Add Categories
      for (const cat of t.categories) {
        const { data: catData, error: catError } = await supabase
          .from('tour_categories')
          .insert([{
            id: cat.id,
            tournament_id: t.id,
            type: cat.type,
            name: cat.name,
            advancing_per_pool: cat.advancingPerPool,
            wildcard_count: cat.wildcardCount || 0,
            pool_allocation_mode: cat.poolAllocationMode,
            pools: cat.pools || [],
            bracket_rounds: cat.bracketRounds || [],
            bracket_fill_mode: cat.bracketFillMode || "wildcard"
          }])
          .select()
          .single();
          
        if (catError) throw catError;

        // Add Participants
        if (cat.entries.length > 0) {
          const participants = cat.entries.map(e => ({
            id: e.id,
            category_id: cat.id,
            name: e.name,
            seed: e.seed,
            skill_level: e.skillLevel,
            user_id: e.userId ?? null
          }));
          await supabase.from('tour_participants').insert(participants);
        }
      }

      setTournaments(prev => [t, ...prev]);
    } catch (err: any) {
      console.error("Supabase Error:", err);
      toast.error("Failed to save tournament to cloud");
      throw err;
    }
  };

  const updateTournament = async (t: Tournament) => {
    try {
      // 1. Update main tournament info
      const { error } = await supabase
        .from('tournaments')
        .update({
          name: t.name,
          status: t.status,
          location: t.location,
          referees: t.referees || [],
          courts: t.courts || []
        })
        .eq('id', t.id);

      if (error) throw error;

      // 2. Perform bulk operations per-category (delete+insert paired to limit data-loss window)
      for (const cat of t.categories) {
        // Update category structure (pools, brackets)
        const { error: catError } = await supabase
          .from('tour_categories')
          .update({
            pools: cat.pools || [],
            bracket_rounds: cat.bracketRounds || [],
            pool_allocation_mode: cat.poolAllocationMode,
            advancing_per_pool: cat.advancingPerPool,
            bracket_fill_mode: cat.bracketFillMode || "wildcard"
          })
          .eq('id', cat.id);

        if (catError) throw catError;

        // Sync participants: upsert is idempotent (entries don't change after creation in
        // current UX, but upsert guards against duplicate-key races on save() retries).
        if (cat.entries.length > 0) {
          const participants = cat.entries.map(e => ({
            id: e.id,
            category_id: cat.id,
            name: e.name,
            seed: e.seed,
            skill_level: e.skillLevel,
            user_id: e.userId ?? null
          }));
          const { error: partError } = await supabase.from('tour_participants').upsert(participants, { onConflict: 'id' });
          if (partError) throw partError;
        }

        // Collect matches for this category
        const catMatches: any[] = [];
        cat.pools?.forEach(p => p.matches?.forEach(m => catMatches.push(transformToDBMatch(m, t.id))));
        cat.bracketRounds?.forEach(r => r.matches?.forEach(m => catMatches.push(transformToDBMatch(m, t.id))));

        // Delete then immediately re-insert for this category only
        const { error: delError } = await supabase.from('tour_matches').delete().eq('category_id', cat.id);
        if (delError) throw delError;

        if (catMatches.length > 0) {
          const { error: matchError } = await supabase.from('tour_matches').insert(catMatches);
          if (matchError) throw matchError;
        }
      }

      setTournaments((prev) => prev.map((x) => (x.id === t.id ? t : x)));
    } catch (err: any) {
      console.error("Deep Sync Error:", err);
      toast.error("Failed to sync tournament data: " + err.message);
    }
  };

  const updateMatchScore = async (matchId: string, scoreA: number, scoreB: number, status: string, winnerId?: string, setScores?: { a: number; b: number }[]) => {
    try {
      const payload: Record<string, unknown> = {
        score_a: scoreA,
        score_b: scoreB,
        status: status,
        winner_id: winnerId,
      };
      if (setScores !== undefined) payload.set_scores = setScores;
      const { error } = await supabase
        .from('tour_matches')
        .update(payload as never)
        .eq('id', matchId);

      if (error) throw error;
    } catch (err) {
      toast.error("Failed to sync score");
    }
  };

  const deleteTournament = async (id: string) => {
    try {
      const { error } = await supabase.from('tournaments').delete().eq('id', id);
      if (error) throw error;
      setTournaments((prev) => prev.filter((x) => x.id !== id));
    } catch (err) {
      toast.error("Delete failed");
    }
  };

  const getTournament = (id: string) => tournaments.find((x) => x.id === id);

  return (
    <TournamentContext.Provider value={{
      tournaments,
      loading,
      addTournament,
      updateTournament,
      updateMatchScore,
      deleteTournament,
      getTournament,
      refreshTournaments: fetchTournaments,
      applyMatchUpdate,
      applyCategoryUpdate
    }}>
      {children}
    </TournamentContext.Provider>
  );
};

export const useTournaments = () => {
  const ctx = useContext(TournamentContext);
  if (!ctx) throw new Error("useTournaments must be used within TournamentProvider");
  return ctx;
};
