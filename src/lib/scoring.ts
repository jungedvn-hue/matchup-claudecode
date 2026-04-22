/**
 * Scoring Utility for Matchupvn
 * Inspired by DUPR (Dynamic Universal Pickleball Rating)
 */

export type MatchResult = "won" | "lost";

export interface ScoringParams {
  playerRating: number;
  opponentRating: number;
  scoreA: number;
  scoreB: number;
  isWon: boolean;
}

/**
 * Calculates the delta for a player's rating based on a Proximity-ELO model.
 * Factors in: Win/Loss, Rating Gap, and Point Spread.
 */
export const calculateDUPRDelta = (params: ScoringParams): number => {
  const { playerRating, opponentRating, scoreA, scoreB, isWon } = params;
  
  // 1. Calculate Expected Outcome (Standard Elo)
  const expectedOutcome = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 1.0)); // Narrower scale (1.0) better for DUPR 2-8 range
  const actualOutcome = isWon ? 1 : 0;
  
  // 2. Base K-Factor for amateurs
  const K = 0.1; // Small steps for DUPR (typical range 2.0 - 8.0)
  
  // 3. Point Spread Multiplier
  // A win of 11-0 is more significant than 11-9
  const totalPoints = scoreA + scoreB;
  const pointMargin = Math.abs(scoreA - scoreB);
  const spreadMultiplier = totalPoints > 0 ? 0.5 + (pointMargin / totalPoints) : 1.0;
  
  // 4. Calculate Raw Delta
  const rawDelta = K * (actualOutcome - expectedOutcome) * spreadMultiplier;
  
  // Return rounded to 3 decimal places (Standard for ratings)
  return Math.round(rawDelta * 1000) / 1000;
};

/**
 * XP Rewards for Gamification
 */
export const XP_REWARDS = {
  MATCH_PLAYED: 50,
  MATCH_WON: 25,
  VERIFY_RESULT: 15,
  STREAK_BASE: 10, // 10 XP per day of streak
};

/**
 * Calculates XP gain for an action
 */
export const calculateXP = (
  action: keyof typeof XP_REWARDS | "STREAK_BONUS",
  streakDays: number = 0
): number => {
  if (action === "STREAK_BONUS") {
    return Math.min(100, streakDays * XP_REWARDS.STREAK_BASE); // Cap at 100 bonus
  }
  
  const baseXP = XP_REWARDS[action as keyof typeof XP_REWARDS] || 0;
  return baseXP;
};

/**
 * Level logic: Level = 1 + floor(sqrt(totalXP / 100))
 * Simple progression: 100, 400, 900, 1600...
 */
export const getLevelFromXP = (xp: number): number => {
  return Math.floor(Math.sqrt(xp / 100)) + 1;
};

export const getXPForNextLevel = (level: number): number => {
  return Math.pow(level, 2) * 100;
};
