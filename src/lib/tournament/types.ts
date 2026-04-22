export type TournamentFormat = "round_robin" | "knockout" | "hybrid";
export type CategoryType = "singles" | "mens_doubles" | "womens_doubles" | "mixed_doubles";
export type MatchStatus = "not_started" | "in_progress" | "completed";
export type SkillLevel = "beginner" | "intermediate" | "advanced";
export type RankingCriterion = "wins" | "head_to_head" | "point_diff" | "points_scored" | "match_diff" | "random";
export type PoolAllocationMode = "auto" | "manual";


export interface TournamentPlayer {
  id: string;
  name: string;
  gender?: "male" | "female";
  skillLevel?: SkillLevel;
  seed?: number;
}

export interface TournamentTeam {
  id: string;
  name: string;
  player1: TournamentPlayer;
  player2: TournamentPlayer;
  seed?: number;
}

export type TournamentEntry = TournamentPlayer | TournamentTeam;

export interface TournamentReferee {
  id: string;
  name: string;
}

export interface TournamentCourt {
  id: string;
  name: string;
}

export interface TournamentMatch {
  id: string;
  categoryId: string;
  poolId?: string;
  bracketRoundId?: string;
  matchNo: number;
  entryAId: string;
  entryBId: string;
  entryAName: string;
  entryBName: string;
  scoreA: number;
  scoreB: number;
  winner?: string;
  status: MatchStatus;
  courtId?: string;
  refereeId?: string;
  timeSlot?: string;
}

export interface Pool {
  id: string;
  name: string;
  entryIds: string[];
  matches: TournamentMatch[];
}

export interface Standing {
  entryId: string;
  entryName: string;
  played: number;
  wins: number;
  losses: number;
  pointsScored: number;
  pointsConceded: number;
  pointDiff: number;
  rank: number;
  qualified: boolean;
}

export interface BracketRound {
  id: string;
  name: string;
  matches: TournamentMatch[];
}

export interface TournamentCategory {
  id: string;
  type: CategoryType;
  name: string;
  skillFilter?: SkillLevel;
  maxEntries?: number;
  entries: { id: string; name: string; seed?: number; skillLevel?: SkillLevel }[];
  pools: Pool[];
  bracketRounds: BracketRound[];
  advancingPerPool: number;
  wildcardCount: number;
  poolAllocationMode: PoolAllocationMode;
}

export interface Tournament {
  id: string;
  name: string;
  date: string;
  location: string;
  format: TournamentFormat;
  pointsPerGame: number;
  winByTwo: boolean;
  courtsAvailable: number;
  matchDuration: number;
  playersPerPool: number;
  rankingPriority: RankingCriterion[];
  categories: TournamentCategory[];

  referees: TournamentReferee[];
  courts: TournamentCourt[];
  status: "draft" | "active" | "completed";
  createdAt: string;
}
