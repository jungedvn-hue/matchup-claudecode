import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTournaments } from "@/context/TournamentContext";

const POLL_INTERVAL_MS = 5000;

/**
 * Poll-based updates for the given tournament IDs.
 * Replaces the previous WebSocket subscription to avoid Supabase Realtime
 * connection limits when many viewers are on tournament pages at once.
 *
 * Every POLL_INTERVAL_MS, fetches rows updated since the last poll and feeds
 * them through the same applyMatchUpdate / applyCategoryUpdate handlers, so
 * callers and downstream consumers see identical behavior — just with up to
 * ~5s of latency instead of sub-second realtime.
 *
 * Pass a stable list (memoized or sorted) to avoid restarting the poller every render.
 */
export const useTournamentRealtime = (tournamentIds: string[]) => {
  const { applyMatchUpdate, applyCategoryUpdate } = useTournaments();
  const matchHandlerRef = useRef(applyMatchUpdate);
  const categoryHandlerRef = useRef(applyCategoryUpdate);
  matchHandlerRef.current = applyMatchUpdate;
  categoryHandlerRef.current = applyCategoryUpdate;

  const ids = [...tournamentIds].filter(Boolean).sort();
  const idsKey = ids.join(",");

  useEffect(() => {
    if (ids.length === 0) return;

    let cancelled = false;
    let lastPolledAt = new Date().toISOString();

    const poll = async () => {
      const since = lastPolledAt;
      const nextSince = new Date().toISOString();

      const [matchesRes, catsRes] = await Promise.all([
        supabase
          .from("tour_matches")
          .select(
            "id,category_id,pool_id,bracket_round_id,match_no,entry_a_id,entry_b_id,entry_a_name,entry_b_name,score_a,score_b,winner_id,status,court_id,referee_id"
          )
          .in("tournament_id", ids)
          .gt("updated_at", since),
        supabase
          .from("tour_categories")
          .select("*")
          .in("tournament_id", ids)
          .gt("updated_at", since),
      ]);

      if (cancelled) return;
      lastPolledAt = nextSince;

      (matchesRes.data ?? []).forEach((raw: any) => {
        matchHandlerRef.current({
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
      });

      (catsRes.data ?? []).forEach((row: any) => categoryHandlerRef.current(row));
    };

    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);
};
