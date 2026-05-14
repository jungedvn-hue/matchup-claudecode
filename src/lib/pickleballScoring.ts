// Pickleball scoring rules validator.
// Per USAPA rules:
//   - Game ends when one side reaches `pointsPerGame` AND leads by ≥ 2.
//   - When `winByTwo=true` and tied at points-1 (e.g. 10-10 in game-to-11),
//     play continues until one side leads by 2, optionally up to a `maxPoints` cap.
//   - When cap is reached, the side with higher score wins regardless of margin.

export interface ScoringConfig {
  pointsPerGame: number;     // 11 / 15 / 21 (game cap, target to win)
  winByTwo: boolean;         // standard pickleball: true
  maxPoints?: number;        // optional hard cap when winByTwo (e.g. 15 for game-to-11)
}

export type ScoreValidation =
  | { valid: true; status: "in_progress" | "complete"; winner?: "a" | "b" }
  | { valid: false; reason: string };

export function validateScore(
  config: ScoringConfig,
  scoreA: number,
  scoreB: number
): ScoreValidation {
  if (!Number.isFinite(scoreA) || !Number.isFinite(scoreB) || scoreA < 0 || scoreB < 0) {
    return { valid: false, reason: "Score must be a non-negative number" };
  }
  if (!Number.isInteger(scoreA) || !Number.isInteger(scoreB)) {
    return { valid: false, reason: "Score must be a whole number" };
  }

  const target = config.pointsPerGame;
  const cap = config.maxPoints ?? Math.ceil(target * 1.4);
  const high = Math.max(scoreA, scoreB);
  const low = Math.min(scoreA, scoreB);

  if (high > cap) {
    return { valid: false, reason: `Score cannot exceed cap (${cap})` };
  }

  // Below target: still in progress (e.g. 5-3 in game-to-11)
  if (high < target) {
    return { valid: true, status: "in_progress" };
  }

  // At or above target
  if (config.winByTwo) {
    // Reached cap → forced win
    if (high === cap) {
      return scoreA === scoreB
        ? { valid: false, reason: "Tied at cap is impossible" }
        : { valid: true, status: "complete", winner: scoreA > scoreB ? "a" : "b" };
    }
    // Win by 2
    if (high - low >= 2) {
      return { valid: true, status: "complete", winner: scoreA > scoreB ? "a" : "b" };
    }
    // At target but tied or 1-pt margin → still in progress (deuce)
    return { valid: true, status: "in_progress" };
  }

  // No win-by-2: first to target wins
  if (scoreA > scoreB) return { valid: true, status: "complete", winner: "a" };
  if (scoreB > scoreA) return { valid: true, status: "complete", winner: "b" };
  return { valid: false, reason: "Cannot tie at target without win-by-2 rule" };
}

/** Pretty-print rule for UI display, e.g. "Game to 11, win by 2 (cap 15)" */
export function formatScoringRule(config: ScoringConfig): string {
  const cap = config.maxPoints ?? Math.ceil(config.pointsPerGame * 1.4);
  return `${config.pointsPerGame}${config.winByTwo ? `, win by 2 (cap ${cap})` : ""}`;
}

/** Validate an entire match (best-of-N sets); returns winner or in-progress state. */
export function validateMatch(
  config: ScoringConfig,
  sets: Array<{ a: number; b: number }>,
  numSets = 3
): { valid: boolean; reason?: string; winner?: "a" | "b"; setsA: number; setsB: number; complete: boolean } {
  let setsA = 0, setsB = 0;
  const setsToWin = Math.ceil(numSets / 2);

  for (let i = 0; i < sets.length; i++) {
    const s = sets[i];
    const v = validateScore(config, s.a, s.b);
    if (!v.valid) return { valid: false, reason: `Set ${i + 1}: ${v.reason}`, setsA, setsB, complete: false };
    if (v.status === "complete") {
      if (v.winner === "a") setsA++; else setsB++;
    } else {
      // In-progress set must be the last one
      if (i < sets.length - 1) {
        return { valid: false, reason: `Set ${i + 1} is incomplete but not the last set`, setsA, setsB, complete: false };
      }
    }
    if (setsA >= setsToWin) return { valid: true, winner: "a", setsA, setsB, complete: true };
    if (setsB >= setsToWin) return { valid: true, winner: "b", setsA, setsB, complete: true };
  }

  return { valid: true, setsA, setsB, complete: false };
}
