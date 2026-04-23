import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Tournament } from "@/lib/tournament/types";
import { useAuth } from "@/context/AuthContext";

interface TournamentContextValue {
  tournaments: Tournament[];
  loading: boolean;
  addTournament: (t: Tournament) => Promise<void>;
  updateTournament: (t: Tournament) => Promise<void>;
  updateMatchScore: (matchId: string, scoreA: number, scoreB: number, status: string, winnerId?: string) => Promise<void>;
  deleteTournament: (id: string) => Promise<void>;
  getTournament: (id: string) => Tournament | undefined;
  refreshTournaments: () => Promise<void>;
}

const TournamentContext = createContext<TournamentContextValue | null>(null);

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const TournamentProvider = ({ children }: { children: ReactNode }) => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const transformToDBMatch = (m: any, tournamentId: string) => ({
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

      // Transform relational data back to our Frontend Type structure
      const transformed: Tournament[] = (data as any[]).map(t => ({
        ...t,
        referees: t.referees || [],
        courts: t.courts || [],
        rankingPriority: t.ranking_priority || ["wins", "head_to_head", "point_diff", "points_scored"],
        categories: (t.categories || []).map((c: any) => ({
          ...c,
          wildcardCount: c.wildcard_count || 0,
          entries: c.participants || [],
          pools: c.pools || [], 
          bracketRounds: c.bracket_rounds || [],
          matches: (c.matches || []).map((m: any) => ({
            id: m.id,
            categoryId: m.category_id,
            poolId: m.pool_id,
            bracketRoundId: m.bracket_round_id,
            matchNo: m.match_no,
            entryAId: m.entry_a_id,
            entryBId: m.entry_b_id,
            entryAName: m.entry_a_name,
            entryBName: m.entry_b_name,
            scoreA: m.score_a,
            scoreB: m.score_b,
            winner: m.winner_id,
            status: m.status,
            courtId: m.court_id,
            refereeId: m.referee_id
          }))
        }))
      }));

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

    // Setup Real-time listener for Matches with batching
    let updateQueue: any[] = [];
    let timeout: NodeJS.Timeout | null = null;

    const processQueue = () => {
      if (updateQueue.length === 0) return;
      
      setTournaments(prev => {
        let next = [...prev];
        updateQueue.forEach(updatedMatch => {
          next = next.map(t => ({
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
          }));
        });
        return next;
      });
      
      updateQueue = [];
      timeout = null;
    };

    const matchSubscription = supabase
      .channel('live-scores')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tour_matches' }, (payload: any) => {
        const raw = payload.new;
        const updatedMatch = {
          id: raw.id,
          categoryId: raw.category_id,
          poolId: raw.pool_id,
          bracketRoundId: raw.bracket_round_id,
          matchNo: raw.match_no,
          entryAId: raw.entry_a_id,
          entryBId: raw.entry_b_id,
          entryAName: raw.entry_a_name,
          entryBName: raw.entry_b_name,
          scoreA: raw.score_a,
          scoreB: raw.score_b,
          winner: raw.winner_id,
          status: raw.status,
          courtId: raw.court_id,
          refereeId: raw.referee_id
        };

        updateQueue.push(updatedMatch);
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(processQueue, 500); // Gộp tất cả update trong 500ms
      })
      .subscribe();

    return () => {
      supabase.removeChannel(matchSubscription);
    };
  }, []);

  const addTournament = async (t: Tournament) => {
    try {
      if (!user) {
        toast.error("Bạn cần đăng nhập để tạo giải đấu!");
        return;
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
            bracket_rounds: cat.bracketRounds || []
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
            skill_level: e.skillLevel
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

      // 2. Prepare all matches for deep sync
      const allMatchesToUpsert: any[] = [];
      for (const cat of t.categories) {
        // Collect matches from pools
        cat.pools?.forEach(p => {
          p.matches?.forEach(m => {
            allMatchesToUpsert.push(transformToDBMatch(m, t.id));
          });
        });
        // Collect matches from bracket rounds
        cat.bracketRounds?.forEach(r => {
          r.matches?.forEach(m => {
            allMatchesToUpsert.push(transformToDBMatch(m, t.id));
          });
        });
      }

      // 3. Perform bulk operations
      for (const cat of t.categories) {
        // Update category structure (pools, brackets)
        await supabase
          .from('tour_categories')
          .update({
            pools: cat.pools || [],
            bracket_rounds: cat.bracketRounds || [],
            pool_allocation_mode: cat.poolAllocationMode,
            advancing_per_pool: cat.advancingPerPool
          })
          .eq('id', cat.id);

        // Delete all existing matches for this category to avoid duplicates
        await supabase.from('tour_matches').delete().eq('category_id', cat.id);
      }

      if (allMatchesToUpsert.length > 0) {
        const { error: matchError } = await supabase
          .from('tour_matches')
          .insert(allMatchesToUpsert); // Use insert instead of upsert since we cleared old ones
        
        if (matchError) throw matchError;
      }

      setTournaments((prev) => prev.map((x) => (x.id === t.id ? t : x)));
    } catch (err: any) {
      console.error("Deep Sync Error:", err);
      toast.error("Failed to sync deep data: " + err.message);
    }
  };

  const updateMatchScore = async (matchId: string, scoreA: number, scoreB: number, status: string, winnerId?: string) => {
    try {
      const { error } = await supabase
        .from('tour_matches')
        .update({
          score_a: scoreA,
          score_b: scoreB,
          status: status,
          winner_id: winnerId
        })
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
      refreshTournaments: fetchTournaments
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
