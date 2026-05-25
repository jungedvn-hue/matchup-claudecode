import { AssistantPermission } from "@/data/events";

export interface GroupAssistant {
  id: string;
  groupId: string;
  name: string;
  avatar: string;
  phone?: string;
  assignedCourts: string[];
  permissions: AssistantPermission[];
  assignedAt: string;
}

export interface GroupReview {
  id: string;
  userName: string;
  avatar: string;
  rating: number;
  comment: string;
  date: string;
}

export interface Group {
  id: string;
  name: string;
  role: string;
  members: number;
  location: string;
  nextEvent: string;
  skill: "beginner" | "intermediate" | "advanced" | "pro";
  activePlayers: number;
  emoji: string;
  featured: boolean;
  description: string;
  courtName: string;
  createdAt: string;
  distance: string;
  isOpen: boolean;
  avgRating: number;
  totalReviews: number;
  reviews: GroupReview[];
  assistants: GroupAssistant[];
}

export const groups: Group[] = [
  {
    id: "sunset-smashers",
    name: "Sunset Smashers",
    role: "Host",
    members: 45,
    location: "Sunset Park",
    nextEvent: "Tonight 6PM",
    skill: "intermediate",
    activePlayers: 12,
    emoji: "🔥",
    featured: true,
    description: "Nhóm chơi pickleball buổi chiều tại Sunset Park. Chào đón mọi trình độ từ trung cấp trở lên!",
    courtName: "Sunset Park Courts (4 sân)",
    createdAt: "Jan 2024",
    distance: "0.8 km",
    isOpen: true,
    avgRating: 4.6,
    totalReviews: 28,
    reviews: [
      { id: "r1", userName: "Alex T.", avatar: "🧑‍🦱", rating: 5, comment: "Nhóm rất vui, tổ chức chuyên nghiệp!", date: "2 ngày trước" },
      { id: "r2", userName: "Maria L.", avatar: "👩", rating: 4, comment: "Sân tốt, mọi người thân thiện.", date: "5 ngày trước" },
      { id: "r3", userName: "John K.", avatar: "👨‍🦰", rating: 5, comment: "Host nhiệt tình, trận đấu hấp dẫn!", date: "1 tuần trước" },
    ],
    assistants: [
      { id: "mem-2", groupId: "sunset-smashers", name: "Lan P.", avatar: "👩", phone: "0912345678", assignedCourts: ["Sân 1", "Sân 2"], permissions: ["check_in", "approve_tickets"], assignedAt: "1 tuần trước" },
    ],
  },
  {
    id: "morning-dinks",
    name: "Morning Dinks",
    role: "Host",
    members: 32,
    location: "City Rec",
    nextEvent: "Tomorrow 7:30AM",
    skill: "beginner",
    activePlayers: 8,
    emoji: "☀️",
    featured: false,
    description: "Nhóm chơi sáng sớm dành cho người mới bắt đầu. Không khí thân thiện, vui vẻ!",
    courtName: "City Recreation Center (2 sân)",
    createdAt: "Mar 2024",
    distance: "1.2 km",
    isOpen: true,
    avgRating: 4.2,
    totalReviews: 15,
    reviews: [
      { id: "r4", userName: "Sarah W.", avatar: "👩‍🦳", rating: 4, comment: "Phù hợp cho người mới!", date: "3 ngày trước" },
    ],
    assistants: [],
  },
  {
    id: "bay-area-pros",
    name: "Bay Area Pros",
    role: "Player",
    members: 18,
    location: "Elite Club",
    nextEvent: "Sat 5PM",
    skill: "pro",
    activePlayers: 4,
    emoji: "🏆",
    featured: false,
    description: "Nhóm dành cho các tay vợt chuyên nghiệp khu vực Bay Area. Thi đấu cạnh tranh cao.",
    courtName: "Elite Pickleball Club (6 sân)",
    createdAt: "Nov 2023",
    distance: "3.5 km",
    isOpen: false,
    avgRating: 4.8,
    totalReviews: 42,
    reviews: [
      { id: "r5", userName: "David P.", avatar: "🧔", rating: 5, comment: "Trình độ cao, rất đáng chơi.", date: "1 ngày trước" },
      { id: "r6", userName: "Lisa M.", avatar: "👩‍🦰", rating: 5, comment: "Sân chất lượng, đối thủ mạnh.", date: "4 ngày trước" },
    ],
    assistants: [],
  },
  {
    id: "weekend-warriors",
    name: "Weekend Warriors",
    role: "Player",
    members: 56,
    location: "Golden Gate Park",
    nextEvent: "Sun 9AM",
    skill: "advanced",
    activePlayers: 20,
    emoji: "⚡",
    featured: false,
    description: "Chơi cuối tuần tại Golden Gate Park. Trình độ nâng cao, nhiều trận đấu sôi nổi.",
    courtName: "Golden Gate Park Courts (3 sân)",
    createdAt: "Feb 2024",
    distance: "2.1 km",
    isOpen: true,
    avgRating: 4.4,
    totalReviews: 35,
    reviews: [
      { id: "r7", userName: "Tom H.", avatar: "🧑", rating: 4, comment: "Cuối tuần lý tưởng!", date: "2 ngày trước" },
    ],
    assistants: [],
  },
  {
    id: "lunch-break-league",
    name: "Lunch Break League",
    role: "Host",
    members: 24,
    location: "Downtown Courts",
    nextEvent: "Mon 12PM",
    skill: "intermediate",
    activePlayers: 6,
    emoji: "🎯",
    featured: false,
    description: "Chơi nhanh trong giờ nghỉ trưa. Mỗi session 45 phút, phù hợp dân văn phòng!",
    courtName: "Downtown Public Courts (2 sân)",
    createdAt: "May 2024",
    distance: "0.5 km",
    isOpen: true,
    avgRating: 3.9,
    totalReviews: 12,
    reviews: [
      { id: "r8", userName: "Amy C.", avatar: "👧", rating: 4, comment: "Tiện cho giờ trưa!", date: "1 tuần trước" },
    ],
    assistants: [],
  },
];

export const nearbyGroups: Group[] = [
  {
    id: "court-side-crew",
    name: "Court Side Crew",
    role: "none",
    members: 38,
    location: "Marina Green",
    nextEvent: "Today 4PM",
    skill: "intermediate",
    activePlayers: 6,
    emoji: "🎾",
    featured: false,
    description: "Nhóm chơi thân thiện tại Marina Green, mở cho tất cả mọi người.",
    courtName: "Marina Green Courts (3 sân)",
    createdAt: "Apr 2024",
    distance: "0.3 km",
    isOpen: true,
    avgRating: 4.3,
    totalReviews: 20,
    reviews: [],
    assistants: [],
  },
  {
    id: "mission-mixers",
    name: "Mission Mixers",
    role: "none",
    members: 62,
    location: "Mission Rec Center",
    nextEvent: "Wed 6:30PM",
    skill: "beginner",
    activePlayers: 0,
    emoji: "🌮",
    featured: false,
    description: "Nhóm casual tại Mission, kết hợp chơi bóng và giao lưu ăn uống.",
    courtName: "Mission Rec Center (2 sân)",
    createdAt: "Jun 2024",
    distance: "1.8 km",
    isOpen: true,
    avgRating: 4.1,
    totalReviews: 18,
    reviews: [],
    assistants: [],
  },
  {
    id: "nob-hill-nets",
    name: "Nob Hill Nets",
    role: "none",
    members: 15,
    location: "Nob Hill Courts",
    nextEvent: "Fri 5PM",
    skill: "advanced",
    activePlayers: 2,
    emoji: "🏔️",
    featured: false,
    description: "Nhóm nhỏ trình độ cao tại Nob Hill. Ưu tiên competitive play.",
    courtName: "Nob Hill Community Courts (1 sân)",
    createdAt: "Feb 2024",
    distance: "2.4 km",
    isOpen: false,
    avgRating: 4.7,
    totalReviews: 9,
    reviews: [],
    assistants: [],
  },
];
