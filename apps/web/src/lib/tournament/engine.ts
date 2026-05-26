import {
  TournamentMatch,
  Pool,
  Standing,
  BracketRound,
  MatchStatus,
  RankingCriterion,
  BracketTemplateMatch,
  BracketSlotRef,
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

// ── Round Robin Match Generator (Circle method) ──
// Generates rounds via the classic circle method so each team plays once per
// round, then flattens rounds in order. On a single court this yields fair
// rest spacing (each team rests ~1 match between its games).
export const MATCH_ORDER_VERSION = 2;

function buildCircleRounds<T>(items: T[]): T[][][] {
  const arr = [...items];
  const odd = arr.length % 2 === 1;
  if (odd) arr.push(null as unknown as T); // BYE placeholder
  const n = arr.length;
  const rounds: T[][][] = [];
  for (let r = 0; r < n - 1; r++) {
    const round: T[][] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = arr[i];
      const b = arr[n - 1 - i];
      if (a !== null && b !== null) round.push([a, b]);
    }
    rounds.push(round);
    // Rotate: keep arr[0] fixed, rotate rest clockwise.
    const rest = arr.slice(1);
    rest.unshift(rest.pop() as T);
    for (let k = 1; k < n; k++) arr[k] = rest[k - 1];
  }
  return rounds;
}

export function generateRoundRobinMatches(
  pool: Pool,
  categoryId: string,
  entryMap: Record<string, string>
): TournamentMatch[] {
  const ids = pool.entryIds;
  if (ids.length < 2) return [];

  const seedLabel = (entryId: string): string => {
    const idx = ids.indexOf(entryId);
    return `${pool.name}${idx + 1}`;
  };

  const rounds = buildCircleRounds(ids);
  const matches: TournamentMatch[] = [];
  let matchNo = 1;
  rounds.forEach((round) => {
    round.forEach(([a, b]) => {
      matches.push({
        id: nextMatchId(),
        categoryId,
        poolId: pool.id,
        matchNo: matchNo++,
        entryAId: a,
        entryBId: b,
        entryAName: entryMap[a] || a,
        entryBName: entryMap[b] || b,
        entryASeedLabel: seedLabel(a),
        entryBSeedLabel: seedLabel(b),
        scoreA: 0,
        scoreB: 0,
        status: "not_started",
      });
    });
  });
  return matches;
}

// Regenerate match order for an existing pool using the circle method,
// preserving any played scores keyed by entry-pair (orientation-agnostic).
export function rearrangePoolMatches(
  pool: Pool,
  categoryId: string,
  entryMap: Record<string, string>
): TournamentMatch[] {
  const key = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const old = new Map<string, TournamentMatch>();
  (pool.matches || []).forEach((m) => old.set(key(m.entryAId, m.entryBId), m));

  const fresh = generateRoundRobinMatches(pool, categoryId, entryMap);
  return fresh.map((m) => {
    const prev = old.get(key(m.entryAId, m.entryBId));
    if (!prev) return m;
    // Preserve recorded state. Orientation A/B might have flipped; remap scores.
    const sameOrientation = prev.entryAId === m.entryAId;
    return {
      ...m,
      id: prev.id,
      scoreA: sameOrientation ? prev.scoreA : prev.scoreB,
      scoreB: sameOrientation ? prev.scoreB : prev.scoreA,
      setScores: prev.setScores
        ? (sameOrientation ? prev.setScores : prev.setScores.map((s) => ({ a: s.b, b: s.a })))
        : undefined,
      winner: prev.winner,
      status: prev.status,
      courtId: prev.courtId,
      refereeId: prev.refereeId,
      timeSlot: prev.timeSlot,
      livestreamUrl: prev.livestreamUrl,
    };
  });
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
            // Ensure at least one fallback criterion so sort is stable
            const subPriority: RankingCriterion[] = rankingPriority.filter(c => c !== "head_to_head");
            if (subPriority.length === 0) subPriority.push("random");
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
 
  // 2. Identify candidates: non-qualified teams, deduplicated by entryId
  const seenIds = new Set<string>();
  const candidates = allStandings.filter(s => {
    if (s.qualified || seenIds.has(s.entryId)) return false;
    seenIds.add(s.entryId);
    return true;
  });
 
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

// ── Bracket Pairing Templates ──
// A "template" defines R1 pairings symbolically (e.g. 1A vs 2B) — actual entries
// fill in at knockout-generation time based on pool standings.

export const poolLetter = (i: number): string => String.fromCharCode(65 + i);

export function formatSlotRef(slot: BracketSlotRef): string {
  if (slot.type === "pool_rank") return `${slot.rank}${poolLetter(slot.poolIndex)}`;
  if (slot.type === "wildcard") return `W${slot.index}`;
  return "BYE";
}

// Build a list of all available pool-rank slots given pool count and advancing per pool.
export function listPoolRankSlots(poolCount: number, advancingPerPool: number): BracketSlotRef[] {
  const slots: BracketSlotRef[] = [];
  for (let r = 1; r <= advancingPerPool; r++) {
    for (let p = 0; p < poolCount; p++) {
      slots.push({ type: "pool_rank", poolIndex: p, rank: r });
    }
  }
  return slots;
}

const poolRank = (p: number, r: number): BracketSlotRef =>
  ({ type: "pool_rank", poolIndex: p, rank: r });

function padWithByes(matches: BracketTemplateMatch[], expected: number): BracketTemplateMatch[] {
  while (matches.length < expected) matches.push({ a: { type: "bye" }, b: { type: "bye" } });
  return matches;
}

function fallbackPairing(
  poolCount: number,
  advancingPerPool: number,
  wildcardCount: number,
): BracketTemplateMatch[] {
  const slots = listPoolRankSlots(poolCount, advancingPerPool);
  for (let i = 0; i < wildcardCount; i++) slots.push({ type: "wildcard", index: i + 1 });
  const size = nearestBracketSize(Math.max(2, slots.length));
  while (slots.length < size) slots.push({ type: "bye" });
  const matches: BracketTemplateMatch[] = [];
  for (let i = 0; i < size / 2; i++) matches.push({ a: slots[i], b: slots[size - 1 - i] });
  return matches;
}

// Cross-pool preset: avoids same-pool rematch by pairing pools (A,B), (C,D)…
// For each pair: 1A-2B and 1B-2A — i.e. 1st of one meets 2nd of the other.
// Requires even poolCount and advancingPerPool === 2 (most common shape).
export function generateCrossPoolTemplate(
  poolCount: number,
  advancingPerPool: number,
  wildcardCount: number = 0,
): BracketTemplateMatch[] {
  const expectedSize = nearestBracketSize(Math.max(2, poolCount * advancingPerPool + wildcardCount));
  if (poolCount % 2 !== 0 || advancingPerPool !== 2 || wildcardCount > 0) {
    return fallbackPairing(poolCount, advancingPerPool, wildcardCount);
  }
  const matches: BracketTemplateMatch[] = [];
  for (let pairIdx = 0; pairIdx < poolCount / 2; pairIdx++) {
    const p1 = pairIdx * 2;
    const p2 = pairIdx * 2 + 1;
    matches.push({ a: poolRank(p1, 1), b: poolRank(p2, 2) });
    matches.push({ a: poolRank(p2, 1), b: poolRank(p1, 2) });
  }
  return padWithByes(matches, expectedSize / 2);
}

// Snake preset: spread top seeds maximally across the bracket.
// 1A-2D, 1B-2C, 1C-2B, 1D-2A — 1st of pool p meets 2nd of pool (poolCount-1-p).
export function generateSnakeTemplate(
  poolCount: number,
  advancingPerPool: number,
  wildcardCount: number = 0,
): BracketTemplateMatch[] {
  const expectedSize = nearestBracketSize(Math.max(2, poolCount * advancingPerPool + wildcardCount));
  if (advancingPerPool !== 2 || wildcardCount > 0) {
    return fallbackPairing(poolCount, advancingPerPool, wildcardCount);
  }
  const matches: BracketTemplateMatch[] = [];
  for (let p = 0; p < poolCount; p++) {
    matches.push({ a: poolRank(p, 1), b: poolRank(poolCount - 1 - p, 2) });
  }
  return padWithByes(matches, expectedSize / 2);
}

// Validate that a template uses each non-BYE slot at most once.
export function validateTemplate(
  template: BracketTemplateMatch[],
  poolCount: number,
  advancingPerPool: number,
  wildcardCount: number,
): { ok: true } | { ok: false; reason: string } {
  const seen = new Set<string>();
  const expectedSize = nearestBracketSize(Math.max(2, poolCount * advancingPerPool + wildcardCount));
  if (template.length !== expectedSize / 2) {
    return { ok: false, reason: `Expected ${expectedSize / 2} matches, got ${template.length}` };
  }
  for (const m of template) {
    for (const s of [m.a, m.b]) {
      if (s.type === "bye") continue;
      const key = formatSlotRef(s);
      if (seen.has(key)) return { ok: false, reason: `Duplicate slot ${key}` };
      if (s.type === "pool_rank") {
        if (s.poolIndex >= poolCount) return { ok: false, reason: `Pool ${poolLetter(s.poolIndex)} not in range` };
        if (s.rank > advancingPerPool) return { ok: false, reason: `${formatSlotRef(s)} exceeds advancingPerPool` };
      }
      if (s.type === "wildcard" && s.index > wildcardCount) {
        return { ok: false, reason: `Wildcard W${s.index} exceeds count` };
      }
      seen.add(key);
    }
  }
  return { ok: true };
}

// Resolve a template against actual pool standings → ordered list of entries
// in bracket-seed order (suitable for feeding into the bracket rounds builder).
export function resolveTemplateToEntries(
  template: BracketTemplateMatch[],
  standingsByPool: Standing[][],
  wildcards: { entryId: string; entryName: string }[],
): { id: string; name: string; poolId?: string }[] {
  const flat: { id: string; name: string; poolId?: string }[] = [];
  template.forEach((m) => {
    flat.push(resolveSlot(m.a, standingsByPool, wildcards));
    flat.push(resolveSlot(m.b, standingsByPool, wildcards));
  });
  return flat;
}

function resolveSlot(
  slot: BracketSlotRef,
  standingsByPool: Standing[][],
  wildcards: { entryId: string; entryName: string }[],
): { id: string; name: string; poolId?: string } {
  if (slot.type === "bye") return { id: `bye-${Math.random().toString(36).slice(2, 7)}`, name: "BYE" };
  if (slot.type === "wildcard") {
    const w = wildcards[slot.index - 1];
    if (!w) return { id: `bye-wc-${slot.index}`, name: "BYE" };
    return { id: w.entryId, name: w.entryName };
  }
  const poolStandings = standingsByPool[slot.poolIndex] || [];
  const s = poolStandings[slot.rank - 1];
  if (!s) return { id: `bye-${formatSlotRef(slot)}`, name: "BYE" };
  return { id: s.entryId, name: s.entryName };
}

// Standard Seeding Pattern (recursive for power of 2): [1,8,4,5,2,7,3,6] for n=8.
const getSeedingPattern = (n: number): number[] => {
  if (n === 1) return [1];
  const prev = getSeedingPattern(n / 2);
  const result: number[] = [];
  prev.forEach((seed) => {
    result.push(seed);
    result.push(n - seed + 1);
  });
  return result;
};

// Reorder qualified entries so same-pool teams land in opposite bracket halves
// (and, where possible, opposite quarters). Uses a greedy fewer-teammates-first
// placement: each entry is assigned to the half/quarter currently holding the
// fewest of its teammates, breaking ties by which half has more free slots so
// the bracket stays balanced.
export function separatePoolEntries<T extends { id: string; name: string; poolId?: string }>(
  entries: T[],
  size: number
): T[] {
  const seedPattern = getSeedingPattern(size);
  const halfSize = size / 2;
  // seedsHalf1 / seedsHalf2: seed numbers (1-based) belonging to each bracket half,
  // sorted ascending so we assign best seeds within the half first.
  const seedsHalf1 = seedPattern.slice(0, halfSize).sort((a, b) => a - b);
  const seedsHalf2 = seedPattern.slice(halfSize).sort((a, b) => a - b);

  const result: (T | undefined)[] = new Array(size);
  let cur1 = 0;
  let cur2 = 0;
  const countByPoolHalf: Record<string, { 1: number; 2: number }> = {};

  for (const entry of entries) {
    const pool = entry.poolId;
    let preferred: 1 | 2;

    if (pool) {
      const counts = countByPoolHalf[pool] ?? { 1: 0, 2: 0 };
      if (counts[1] < counts[2]) preferred = 1;
      else if (counts[2] < counts[1]) preferred = 2;
      else preferred = cur1 <= cur2 ? 1 : 2;
    } else {
      preferred = cur1 <= cur2 ? 1 : 2;
    }

    // Fall back to the other half if preferred is full.
    if (preferred === 1 && cur1 >= seedsHalf1.length) preferred = 2;
    else if (preferred === 2 && cur2 >= seedsHalf2.length) preferred = 1;

    const seed = preferred === 1 ? seedsHalf1[cur1++] : seedsHalf2[cur2++];
    result[seed - 1] = entry;

    if (pool) {
      const counts = countByPoolHalf[pool] ?? { 1: 0, 2: 0 };
      counts[preferred]++;
      countByPoolHalf[pool] = counts;
    }
  }

  return result as T[];
}

export function generateBracket(
  qualifiedEntries: { id: string; name: string; poolId?: string }[],
  categoryId: string,
  options?: { separatePools?: boolean; useTemplateOrder?: boolean }
): BracketRound[] {
  const size = nearestBracketSize(qualifiedEntries.length);
  const padded = [...qualifiedEntries];
  while (padded.length < size) padded.push({ id: `bye-${padded.length}`, name: "BYE" });

  // Template mode: caller already resolved entries into R1 pairing order
  // (entries[0] vs entries[1], entries[2] vs entries[3], ...). Skip seed pattern.
  let reordered: typeof padded;
  if (options?.useTemplateOrder) {
    reordered = padded;
  } else {
    const seedOrdered = options?.separatePools
      ? separatePoolEntries(padded, size)
      : padded;
    const seedPattern = getSeedingPattern(size);
    reordered = seedPattern.map((sIdx) => seedOrdered[sIdx - 1]);
  }

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

// ── Bracket Advancement (cascade winners into next rounds) ──
// Returns updated rounds and the list of matches whose entry/winner fields changed,
// so callers can persist them. Handles BYE cascades automatically.
export function advanceBracket(
  rounds: BracketRound[],
  completedMatchId: string
): { rounds: BracketRound[]; updatedMatches: TournamentMatch[] } {
  const updated = rounds.map((r) => ({
    ...r,
    matches: r.matches.map((m) => ({ ...m })),
  }));
  const updatedMatches: TournamentMatch[] = [];

  // Locate the completed match
  let roundIdx = -1;
  let matchIdx = -1;
  for (let r = 0; r < updated.length; r++) {
    const idx = updated[r].matches.findIndex((m) => m.id === completedMatchId);
    if (idx !== -1) {
      roundIdx = r;
      matchIdx = idx;
      break;
    }
  }
  if (roundIdx === -1) return { rounds: updated, updatedMatches };

  let curRoundIdx = roundIdx;
  let curMatchIdx = matchIdx;
  const completed = updated[curRoundIdx].matches[curMatchIdx];
  let curWinnerId = getWinnerId(completed);
  if (!curWinnerId) return { rounds: updated, updatedMatches };
  let curWinnerName =
    curWinnerId === completed.entryAId ? completed.entryAName : completed.entryBName;

  while (curRoundIdx < updated.length - 1) {
    const nextRoundIdx = curRoundIdx + 1;
    const nextMatchIdx = Math.floor(curMatchIdx / 2);
    const slotA = curMatchIdx % 2 === 0;
    const nextMatch = updated[nextRoundIdx].matches[nextMatchIdx];
    if (!nextMatch) break;

    if (slotA) {
      nextMatch.entryAId = curWinnerId;
      nextMatch.entryAName = curWinnerName;
    } else {
      nextMatch.entryBId = curWinnerId;
      nextMatch.entryBName = curWinnerName;
    }

    // If the opposing slot is a BYE, auto-complete and cascade further
    const otherName = slotA ? nextMatch.entryBName : nextMatch.entryAName;
    if (otherName === "BYE") {
      nextMatch.winner = curWinnerId;
      nextMatch.status = "completed";
      updatedMatches.push({ ...nextMatch });
      curMatchIdx = nextMatchIdx;
      curRoundIdx = nextRoundIdx;
      // curWinnerId / curWinnerName unchanged
      continue;
    }

    updatedMatches.push({ ...nextMatch });
    break;
  }

  return { rounds: updated, updatedMatches };
}

// ── Bracket Revert (undo a completed match — clear cascaded slot in next round) ──
// Returns updated rounds and the list of downstream matches that were rolled back,
// so callers can persist them. Mirrors advanceBracket: also unwinds BYE auto-cascades.
export function revertBracket(
  rounds: BracketRound[],
  undoneMatchId: string
): { rounds: BracketRound[]; updatedMatches: TournamentMatch[] } {
  const updated = rounds.map((r) => ({
    ...r,
    matches: r.matches.map((m) => ({ ...m })),
  }));
  const updatedMatches: TournamentMatch[] = [];

  let roundIdx = -1;
  let matchIdx = -1;
  for (let r = 0; r < updated.length; r++) {
    const idx = updated[r].matches.findIndex((m) => m.id === undoneMatchId);
    if (idx !== -1) {
      roundIdx = r;
      matchIdx = idx;
      break;
    }
  }
  if (roundIdx === -1) return { rounds: updated, updatedMatches };

  let curRoundIdx = roundIdx;
  let curMatchIdx = matchIdx;

  while (curRoundIdx < updated.length - 1) {
    const nextRoundIdx = curRoundIdx + 1;
    const nextMatchIdx = Math.floor(curMatchIdx / 2);
    const slotA = curMatchIdx % 2 === 0;
    const nextMatch = updated[nextRoundIdx].matches[nextMatchIdx];
    if (!nextMatch) break;

    const wasByeAdvance =
      nextMatch.status === "completed" &&
      (nextMatch.entryAName === "BYE" || nextMatch.entryBName === "BYE");

    if (slotA) {
      nextMatch.entryAId = `tbd-${nextMatch.id}`;
      nextMatch.entryAName = "TBD";
    } else {
      nextMatch.entryBId = `tbd-${nextMatch.id}`;
      nextMatch.entryBName = "TBD";
    }
    nextMatch.winner = undefined;
    nextMatch.status = "not_started";
    nextMatch.scoreA = 0;
    nextMatch.scoreB = 0;
    updatedMatches.push({ ...nextMatch });

    if (wasByeAdvance) {
      curMatchIdx = nextMatchIdx;
      curRoundIdx = nextRoundIdx;
      continue;
    }
    break;
  }

  return { rounds: updated, updatedMatches };
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
