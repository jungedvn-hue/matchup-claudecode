import {
  TournamentMatch,
  Pool,
  Standing,
  BracketRound,
  MatchStatus,
} from "./types";

let matchCounter = 0;
const nextMatchId = () => `m-${Date.now()}-${++matchCounter}`;

export function getWinnerId(m: TournamentMatch): string | undefined {
  if (m.winner) return m.winner;
  if (m.status !== "completed") return undefined;
  if (m.scoreA > m.scoreB) return m.entryAId;
  if (m.scoreB > m.scoreA) return m.entryBId;
  return undefined;
}

// ── Pool Allocation (Snake Seeding) ──
export function autoAllocatePools(
  entries: { id: string; name: string; seed?: number; skillLevel?: string }[],
  poolCount: number
): Pool[] {
  const sorted = [...entries].sort((a, b) => (a.seed ?? 999) - (b.seed ?? 999));
  const pools: Pool[] = Array.from({ length: poolCount }, (_, i) => ({
    id: `pool-${String.fromCharCode(65 + i)}`,
    name: String.fromCharCode(65 + i),
    entryIds: [],
    matches: [],
  }));

  // Snake seeding: 1→A, 2→B, 3→C, 3→C, 2→B, 1→A ...
  sorted.forEach((entry, idx) => {
    const round = Math.floor(idx / poolCount);
    const pos = idx % poolCount;
    const poolIdx = round % 2 === 0 ? pos : poolCount - 1 - pos;
    pools[poolIdx].entryIds.push(entry.id);
  });

  return pools;
}

export function suggestPoolCount(entryCount: number): number {
  if (entryCount <= 6) return 1;
  if (entryCount <= 12) return 2;
  if (entryCount <= 20) return 4;
  if (entryCount <= 32) return 4;
  if (entryCount <= 64) return 8;
  return Math.min(16, Math.ceil(entryCount / 6));
}

export function suggestAdvancingPerPool(poolCount: number, format: string): number {
  if (format === "round_robin") return 0;
  if (poolCount <= 2) return 4;
  if (poolCount <= 4) return 2;
  return 2;
}

// ── Round Robin Match Generator ──
export function generateRoundRobinMatches(
  pool: Pool,
  categoryId: string,
  entryMap: Record<string, string>
): TournamentMatch[] {
  const ids = pool.entryIds;
  const matches: TournamentMatch[] = [];
  let matchNo = 1;

  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      matches.push({
        id: nextMatchId(),
        categoryId,
        poolId: pool.id,
        matchNo: matchNo++,
        entryAId: ids[i],
        entryBId: ids[j],
        entryAName: entryMap[ids[i]] || ids[i],
        entryBName: entryMap[ids[j]] || ids[j],
        scoreA: 0,
        scoreB: 0,
        status: "not_started",
      });
    }
  }
  return matches;
}

// ── Standings Calculator ──
export function calculateStandings(
  matches: TournamentMatch[],
  entryIds: string[],
  entryMap: Record<string, string>,
  advancingCount: number,
  rankingPriority: RankingCriterion[] = ["wins", "head_to_head", "point_diff", "points_scored"],
  isMiniLeague: boolean = false
): Standing[] {
  const stats: Record<string, Standing> = {};

  entryIds.forEach((id) => {
    stats[id] = {
      entryId: id,
      entryName: entryMap[id] || id,
      played: 0,
      wins: 0,
      losses: 0,
      pointsScored: 0,
      pointsConceded: 0,
      pointDiff: 0,
      rank: 0,
      qualified: false,
    };
  });

  matches
    .filter((m) => m.status === "completed")
    .forEach((m) => {
      const a = stats[m.entryAId];
      const b = stats[m.entryBId];
      if (!a || !b) return;
      a.played++;
      b.played++;
      a.pointsScored += m.scoreA;
      a.pointsConceded += m.scoreB;
      b.pointsScored += m.scoreB;
      b.pointsConceded += m.scoreA;
      
      const winnerId = getWinnerId(m);
      
      if (winnerId === m.entryAId) { a.wins++; b.losses++; }
      else if (winnerId === m.entryBId) { b.wins++; a.losses++; }
    });

  const sorted = Object.values(stats).map((s) => ({
    ...s,
    pointDiff: s.pointsScored - s.pointsConceded,
  }));

  sorted.sort((a, b) => {
    for (const criterion of rankingPriority) {
      if (criterion === "wins") {
        if (b.wins !== a.wins) return b.wins - a.wins;
      }
      
      if (criterion === "head_to_head" && !isMiniLeague) {
        // Standard Head-to-Head tiebreaker: look at the mini-league of players tied on wins
        // We only do this if it's NOT already a mini-league to prevent recursion
        const tiedOnWins = sorted.filter(p => p.wins === a.wins);
        
        if (tiedOnWins.length > 1) {
          // If only 2 people are tied, just check their direct match
          if (tiedOnWins.length === 2) {
            const m = matches.find(m => 
              m.status === "completed" &&
              (m.entryAId === a.entryId && m.entryBId === b.entryId || 
               m.entryAId === b.entryId && m.entryBId === a.entryId)
            );
            if (m) {
              const winnerId = getWinnerId(m);
              if (winnerId === a.entryId) return -1;
              if (winnerId === b.entryId) return 1;
            }
          } else {
            // 3+ players tied: check mini-league standings
            // Matches between ONLY the tied players
            const miniMatches = matches.filter(m => 
              tiedOnWins.some(p => p.entryId === m.entryAId) && 
              tiedOnWins.some(p => p.entryId === m.entryBId)
            );
            
            // Calculate standings for just this group, WITHOUT the H2H criterion to avoid recursion
            const subPriority = rankingPriority.filter(c => c !== "head_to_head");
            const miniStandings = calculateStandings(
              miniMatches, 
              tiedOnWins.map(p => p.entryId), 
              entryMap, 
              0, 
              subPriority,
              true // mark as mini-league
            );
            
            const rankA = miniStandings.find(s => s.entryId === a.entryId)?.rank || 0;
            const rankB = miniStandings.find(s => s.entryId === b.entryId)?.rank || 0;
            if (rankA !== rankB) return rankA - rankB;
          }
        }
      }

      if (criterion === "point_diff") {
        if (b.pointDiff !== a.pointDiff) return b.pointDiff - a.pointDiff;
      }

      if (criterion === "points_scored") {
        if (b.pointsScored !== a.pointsScored) return b.pointsScored - a.pointsScored;
      }

      if (criterion === "match_diff") {
        const diffA = a.wins - a.losses;
        const diffB = b.wins - b.losses;
        if (diffB !== diffA) return diffB - diffA;
      }

      if (criterion === "random") {
        if (a.entryId !== b.entryId) return a.entryId.localeCompare(b.entryId);
      }
    }
    return 0;
  });

  return sorted.map((s, i) => ({
    ...s,
    rank: i + 1,
    qualified: advancingCount > 0 && i < advancingCount,
  }));
}
 
export function getWildcardEntries(
  pools: Pool[],
  entryMap: Record<string, string>,
  advancingPerPool: number,
  wildcardCount: number,
  rankingPriority: RankingCriterion[]
): { id: string; name: string; stats: Standing }[] {
  if (wildcardCount <= 0 || pools.length === 0) return [];
 
  // 1. Get all standings for all pools
  const allStandings = pools.flatMap(pool => 
    calculateStandings(pool.matches, pool.entryIds, entryMap, advancingPerPool, rankingPriority)
  );
 
  // 2. Identify candidates (teams that didn't automatically qualify)
  // Specifically looking for teams at rank (advancingPerPool + 1) as "Best 3rd/Next place"
  // Or more broadly, all non-qualified teams
  const candidates = allStandings.filter(s => !s.qualified);
 
  // 3. Sort candidates using the same priority logic
  // Note: Since they come from different pools, head-to-head might not apply unless they played cross-pool (unlikely here)
  candidates.sort((a, b) => {
    for (const criterion of rankingPriority) {
      if (criterion === "wins") if (b.wins !== a.wins) return b.wins - a.wins;
      if (criterion === "point_diff") if (b.pointDiff !== a.pointDiff) return b.pointDiff - a.pointDiff;
      if (criterion === "points_scored") if (b.pointsScored !== a.pointsScored) return b.pointsScored - a.pointsScored;
      if (criterion === "match_diff") {
        const diffA = a.wins - a.losses;
        const diffB = b.wins - b.losses;
        if (diffB !== diffA) return diffB - diffA;
      }
    }
    return 0;
  });
 
  // 4. Return the top N
  return candidates.slice(0, wildcardCount).map(s => ({
    id: s.entryId,
    name: s.entryName,
    stats: s
  }));
}

// ── Bracket Generator (Professional Seeding) ──
export function nearestBracketSize(n: number): number {
  let s = 2;
  while (s < n) s *= 2;
  return s;
}

export function generateBracket(
  qualifiedEntries: { id: string; name: string }[],
  categoryId: string
): BracketRound[] {
  const size = nearestBracketSize(qualifiedEntries.length);
  const padded = [...qualifiedEntries];
  while (padded.length < size) padded.push({ id: `bye-${padded.length}`, name: "BYE" });

  // 1. Group by Seed (Standard Seeding Pattern: 1 vs 8, 4 vs 5, 2 vs 7, 3 vs 6)
  // This is a recursive pattern for power of 2
  const getSeeding = (n: number): number[] => {
    if (n === 1) return [1];
    const prev = getSeeding(n / 2);
    const result: number[] = [];
    prev.forEach((seed) => {
      result.push(seed);
      result.push(n - seed + 1);
    });
    return result;
  };

  const seedPattern = getSeeding(size);
  const reordered = seedPattern.map((sIdx) => padded[sIdx - 1]);

  const roundNames: Record<number, string> = {
    2: "Final",
    4: "Semi-Finals",
    8: "Quarter-Finals",
    16: "Round of 16",
    32: "Round of 32",
    64: "Round of 64",
  };

  const rounds: BracketRound[] = [];
  let currentEntries = reordered;
  let roundNum = 0;

  while (currentEntries.length > 1) {
    const roundId = `bracket-r${roundNum}`;
    const matches: TournamentMatch[] = [];

    for (let i = 0; i < currentEntries.length; i += 2) {
      const a = currentEntries[i];
      const b = currentEntries[i + 1];
      const isBye = a.name === "BYE" || b.name === "BYE";
      
      matches.push({
        id: nextMatchId(),
        categoryId,
        bracketRoundId: roundId,
        matchNo: i / 2 + 1,
        entryAId: a.id,
        entryBId: b.id,
        entryAName: a.name,
        entryBName: b.name,
        scoreA: 0,
        scoreB: 0,
        winner: isBye ? (a.name !== "BYE" ? a.id : b.id) : undefined,
        status: isBye ? "completed" : "not_started",
      });
    }

    rounds.push({
      id: roundId,
      name: roundNames[currentEntries.length] || `Round ${roundNum + 1}`,
      matches,
    });

    // Next round entries are winners/placeholders
    currentEntries = matches.map((m) => {
      if (m.winner) {
        const w = m.winner === m.entryAId
          ? { id: m.entryAId, name: m.entryAName }
          : { id: m.entryBId, name: m.entryBName };
        return w;
      }
      return { id: `tbd-${m.id}`, name: "TBD" };
    });
    roundNum++;
  }

  return rounds;
}

// ── Tournament Progress ──
export function getTournamentProgress(
  matches: TournamentMatch[]
): { total: number; completed: number; inProgress: number; pct: number } {
  const real = matches.filter((m) => m.entryAName !== "BYE" && m.entryBName !== "BYE");
  const completed = real.filter((m) => m.status === "completed").length;
  const inProgress = real.filter((m) => m.status === "in_progress").length;
  return {
    total: real.length,
    completed,
    inProgress,
    pct: real.length ? Math.round((completed / real.length) * 100) : 0,
  };
}

// ── Advanced Resource Management ──
export function getAvailableResources(
  matches: TournamentMatch[],
  referees: { id: string; name: string }[],
  courts: { id: string; name: string }[]
) {
  // Find all currently active matches (in_progress) to see which resources are occupied
  const activeMatches = matches.filter((m) => m.status === "in_progress");
  const busyCourts = new Set(activeMatches.map((m) => m.courtId).filter(Boolean));
  const busyReferees = new Set(activeMatches.map((m) => m.refereeId).filter(Boolean));

  return {
    availableCourts: courts.filter((c) => !busyCourts.has(c.id)),
    availableReferees: referees.filter((r) => !busyReferees.has(r.id)),
  };
}

export function autoFillEmptyCourts(
  matches: TournamentMatch[],
  referees: { id: string; name: string }[],
  courts: { id: string; name: string }[]
): TournamentMatch[] {
  if (courts.length === 0) return matches;

  const updatedMatches = [...matches];
  const { availableCourts, availableReferees } = getAvailableResources(updatedMatches, referees, courts);

  if (availableCourts.length === 0) return updatedMatches; // Cannot assign

  // Filter queue: not started, not BYE, and BOTH players must be known (not TBD)
  const queue = updatedMatches.filter(
    (m) =>
      m.status === "not_started" &&
      m.entryAName !== "BYE" &&
      m.entryBName !== "BYE" &&
      m.entryAName !== "TBD" &&
      m.entryBName !== "TBD" &&
      !m.courtId // Don't re-assign if already has court waiting
  );

  // We should assign matches in order of presentation (matchNo logic) or bracket order
  // Assuming the array order is basically chronological priority (pools first, then bracket)
  let courtIdx = 0;
  let refIdx = 0;

  for (const match of queue) {
    if (courtIdx >= availableCourts.length) break; // Out of empty courts
    
    // Find index of match in updatedMatches to modify it directly
    const mIdx = updatedMatches.findIndex((m) => m.id === match.id);
    if (mIdx !== -1) {
      updatedMatches[mIdx] = {
        ...updatedMatches[mIdx],
        courtId: availableCourts[courtIdx].id,
      };
      courtIdx++;

      // Assign ref if available
      if (refIdx < availableReferees.length) {
        updatedMatches[mIdx].refereeId = availableReferees[refIdx].id;
        refIdx++;
      }
    }
  }

  return updatedMatches;
}
