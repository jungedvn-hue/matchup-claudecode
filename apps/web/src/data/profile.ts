export interface Partner {
  id: string;
  name: string;
  avatar: string;
  skill: "beginner" | "intermediate" | "advanced" | "pro";
  winRate: number;
  matchesPlayed: number;
  lastPlayed: string;
  isFavorite: boolean;
}

export interface MatchRecord {
  id: string;
  opponent: string;
  opponentAvatar: string;
  result: "won" | "lost";
  score: string;
  date: string;
  event: string;
  group: string;
  duration: string;
  referee?: string;
  opponentVerified?: boolean;
  refereeVerified?: boolean;
}

export interface PlayerStats {
  totalMatches: number;
  wins: number;
  losses: number;
  winRate: number;
  currentStreak: number;
  bestStreak: number;
  avgScore: number;
  totalPoints: number;
  currentXP: number;
  level: number;
  activeStreak: number;
  verifiedRating: number;
  monthlyMatches: { month: string; wins: number; losses: number }[];
  skillProgress: { date: string; rating: number }[];
  topPartners: { name: string; matches: number; winRate: number }[];
}

export const favoritePartners: Partner[] = [
  { id: "p1", name: "Tom R.", avatar: "🧑", skill: "advanced", winRate: 72, matchesPlayed: 24, lastPlayed: "Hôm nay", isFavorite: true },
  { id: "p2", name: "Sarah L.", avatar: "👩", skill: "intermediate", winRate: 65, matchesPlayed: 18, lastPlayed: "Hôm qua", isFavorite: true },
  { id: "p3", name: "Alex K.", avatar: "🧔", skill: "pro", winRate: 58, matchesPlayed: 31, lastPlayed: "3 ngày trước", isFavorite: true },
  { id: "p4", name: "James P.", avatar: "👨", skill: "advanced", winRate: 80, matchesPlayed: 10, lastPlayed: "1 tuần trước", isFavorite: true },
  { id: "p5", name: "Lisa M.", avatar: "👩‍🦰", skill: "intermediate", winRate: 55, matchesPlayed: 14, lastPlayed: "2 tuần trước", isFavorite: true },
  { id: "p6", name: "David P.", avatar: "🧑‍🦱", skill: "beginner", winRate: 45, matchesPlayed: 8, lastPlayed: "Mar 10", isFavorite: true },
];

export const matchHistory: MatchRecord[] = [
  { id: "m1", opponent: "Tom R.", opponentAvatar: "🧑", result: "won", score: "11-7, 11-9", date: "Hôm nay", event: "Open Play Session", group: "Sunset Smashers", duration: "25 phút" },
  { id: "m2", opponent: "Sarah L.", opponentAvatar: "👩", result: "won", score: "11-5, 11-8", date: "Hôm qua", event: "Open Play Session", group: "Sunset Smashers", duration: "20 phút" },
  { id: "m3", opponent: "Alex K.", opponentAvatar: "🧔", result: "lost", score: "9-11, 7-11", date: "15/03", event: "Round Robin Mini", group: "Bay Area Pros", duration: "30 phút" },
  { id: "m4", opponent: "James P.", opponentAvatar: "👨", result: "won", score: "11-3, 11-6", date: "14/03", event: "Open Play Session", group: "Sunset Smashers", duration: "18 phút" },
  { id: "m5", opponent: "Lisa M.", opponentAvatar: "👩‍🦰", result: "won", score: "11-8, 9-11, 11-7", date: "12/03", event: "Weekend Mixer", group: "Weekend Warriors", duration: "35 phút" },
  { id: "m6", opponent: "David P.", opponentAvatar: "🧑‍🦱", result: "won", score: "11-4, 11-2", date: "10/03", event: "Beginner Clinic", group: "Morning Dinks", duration: "15 phút" },
  { id: "m7", opponent: "Tom R.", opponentAvatar: "🧑", result: "lost", score: "8-11, 11-9, 9-11", date: "08/03", event: "Round Robin Mini", group: "Sunset Smashers", duration: "40 phút" },
  { id: "m8", opponent: "Hoa T.", opponentAvatar: "👩‍🦳", result: "won", score: "11-6, 11-5", date: "05/03", event: "Open Play Session", group: "Sunset Smashers", duration: "22 phút" },
  { id: "m9", opponent: "Minh N.", opponentAvatar: "🧑", result: "won", score: "11-9, 11-10", date: "03/03", event: "Weekend Mixer", group: "Weekend Warriors", duration: "28 phút" },
  { id: "m10", opponent: "Alex K.", opponentAvatar: "🧔", result: "lost", score: "7-11, 6-11", date: "01/03", event: "Round Robin Mini", group: "Bay Area Pros", duration: "22 phút" },
];

export const playerStats: PlayerStats = {
  totalMatches: 156,
  wins: 105,
  losses: 51,
  winRate: 67,
  currentStreak: 4,
  bestStreak: 12,
  avgScore: 9.8,
  totalPoints: 3058,
  monthlyMatches: [
    { month: "T10", wins: 8, losses: 5 },
    { month: "T11", wins: 12, losses: 4 },
    { month: "T12", wins: 10, losses: 6 },
    { month: "T1", wins: 14, losses: 3 },
    { month: "T2", wins: 11, losses: 7 },
    { month: "T3", wins: 15, losses: 4 },
  ],
  skillProgress: [
    { date: "T10", rating: 3.2 },
    { date: "T11", rating: 3.5 },
    { date: "T12", rating: 3.6 },
    { date: "T1", rating: 3.9 },
    { date: "T2", rating: 4.0 },
    { date: "T3", rating: 4.2 },
  ],
  topPartners: [
    { name: "Tom R.", matches: 24, winRate: 72 },
    { name: "Sarah L.", matches: 18, winRate: 65 },
    { name: "Alex K.", matches: 31, winRate: 58 },
  ],
  currentXP: 1250,
  level: 4,
  activeStreak: 5,
  verifiedRating: 4.25,
};

export const pendingMatches: MatchRecord[] = [
  { 
    id: "pm1", 
    opponent: "David P.", 
    opponentAvatar: "🧑‍🦱", 
    result: "lost", 
    score: "8-11, 11-9, 5-11", 
    date: "Hôm nay", 
    event: "Challenge Match", 
    group: "Morning Dinks", 
    duration: "32 phút",
    referee: "Sarah L.",
    opponentVerified: false,
    refereeVerified: false
  },
];
