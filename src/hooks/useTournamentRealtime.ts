import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTournaments } from "@/context/TournamentContext";

/**
 * Subscribe to realtime changes ONLY for the given tournament IDs.
 * Pages call this on mount with the tournaments they care about — replaces the
 * old global subscription so a viewer of giải A no longer receives events from
 * giải B/C/D… etc.
 *
 * Pass a stable list (memoized or sorted) to avoid resubscribing every render.
 */
export const useTournamentRealtime = (tournamentIds: string[]) => {
  const { applyMatchUpdate, applyCategoryUpdate } = useTournaments();
  // Use refs so we don't resubscribe when context-provided functions change identity
  const matchHandlerRef = useRef(applyMatchUpdate);
  const categoryHandlerRef = useRef(applyCategoryUpdate);
  matchHandlerRef.current = applyMatchUpdate;
  categoryHandlerRef.current = applyCategoryUpdate;

  // Stringify the list to use as a stable effect dependency
  const ids = [...tournamentIds].filter(Boolean).sort();
  const idsKey = ids.join(",");

  useEffect(() => {
    if (ids.length === 0) return;

    // Postgres-changes filter syntax: tournament_id=in.(id1,id2,id3)
    const filter = `tournament_id=in.(${ids.join(",")})`;

    // Batched match updates so rapid score changes don't thrash setState
    let queue: any[] = [];
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const flush = () => {
      if (queue.length === 0) return;
      const batch = queue;
      queue = [];
      timeout = null;
      batch.forEach((u) => matchHandlerRef.current(u));
    };

    const matchChan = supabase
      .channel(`scoped-matches-${idsKey}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "tour_matches", filter },
        (payload: any) => {
          const raw = payload.new;
          queue.push({
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
            refereeId: raw.referee_id,
          });
          if (timeout) clearTimeout(timeout);
          timeout = setTimeout(flush, 500);
        }
      )
      .subscribe();

    const catChan = supabase
      .channel(`scoped-categories-${idsKey}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "tour_categories", filter },
        (payload: any) => categoryHandlerRef.current(payload.new)
      )
      .subscribe();

    return () => {
      if (timeout) clearTimeout(timeout);
      supabase.removeChannel(matchChan);
      supabase.removeChannel(catChan);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);
};
