export interface EventTicket {
  id: string;
  eventId: string;
  playerName: string;
  playerAvatar: string;
  status: "pending" | "approved" | "rejected";
  requestedAt: string;
  message?: string;
}

export type AssistantPermission = "check_in" | "approve_tickets" | "manage_players" | "view_stats";

export const assistantPermissionLabels: Record<AssistantPermission, string> = {
  check_in: "Check-in (Quét QR)",
  approve_tickets: "Duyệt vé",
  manage_players: "Quản lý người chơi",
  view_stats: "Xem thống kê",
};

// Available members to assign as assistants
export const availableMembers = [
  { id: "mem-1", name: "Tuấn A.", avatar: "👨", phone: "0901234567" },
  { id: "mem-2", name: "Lan P.", avatar: "👩", phone: "0912345678" },
  { id: "mem-3", name: "Khoa V.", avatar: "🧑", phone: "0923456789" },
  { id: "mem-4", name: "Hương N.", avatar: "👩‍🦱", phone: "0934567890" },
  { id: "mem-5", name: "Bảo T.", avatar: "👨‍🦲", phone: "0945678901" },
];

export interface GroupEvent {
  id: string;
  groupId: string;
  title: string;
  date: string;
  time: string;
  location: string;
  price: number;
  currency: string;
  maxSpots: number;
  bookedSpots: number;
  description: string;
  hostName: string;
  ticketRequests: EventTicket[];
}

export const groupEvents: GroupEvent[] = [
  {
    id: "evt-1",
    groupId: "sunset-smashers",
    title: "Open Play Session",
    date: "Hôm nay",
    time: "6:00 PM",
    location: "Sunset Park Courts - Sân 1 & 2",
    price: 50000,
    currency: "VND",
    maxSpots: 16,
    bookedSpots: 12,
    description: "Buổi chơi mở, xếp trận ngẫu nhiên. Tất cả trình độ đều được chào đón!",
    hostName: "Alex T.",
    ticketRequests: [
      { id: "tk-1", eventId: "evt-1", playerName: "Minh N.", playerAvatar: "🧑", status: "pending", requestedAt: "10 phút trước", message: "Mình mới tham gia nhóm, muốn thử chơi buổi đầu!" },
      { id: "tk-2", eventId: "evt-1", playerName: "Hoa T.", playerAvatar: "👩", status: "pending", requestedAt: "25 phút trước" },
      { id: "tk-3", eventId: "evt-1", playerName: "David P.", playerAvatar: "🧔", status: "approved", requestedAt: "1 giờ trước" },
      { id: "tk-4", eventId: "evt-1", playerName: "Lisa M.", playerAvatar: "👩‍🦰", status: "approved", requestedAt: "2 giờ trước" },
    ],
  },
  {
    id: "evt-2",
    groupId: "sunset-smashers",
    title: "Round Robin Mini",
    date: "Thứ 5",
    time: "7:00 PM",
    location: "Sunset Park Courts - Sân 3",
    price: 80000,
    currency: "VND",
    maxSpots: 8,
    bookedSpots: 6,
    description: "Giải đấu Round Robin nhỏ, 8 người chơi. Mỗi người đấu 3 trận.",
    hostName: "Alex T.",
    ticketRequests: [
      { id: "tk-5", eventId: "evt-2", playerName: "Tom H.", playerAvatar: "🧑", status: "pending", requestedAt: "30 phút trước", message: "Mình muốn tham gia round robin!" },
    ],
  },
  {
    id: "evt-3",
    groupId: "sunset-smashers",
    title: "Weekend Mixer",
    date: "Thứ 7",
    time: "9:00 AM",
    location: "Sunset Park Courts - Tất cả sân",
    price: 0,
    currency: "VND",
    maxSpots: 24,
    bookedSpots: 8,
    description: "Buổi giao lưu cuối tuần miễn phí. Chơi vui là chính!",
    hostName: "Alex T.",
    ticketRequests: [],
  },
  {
    id: "evt-4",
    groupId: "morning-dinks",
    title: "Beginner Clinic",
    date: "Thứ 6",
    time: "7:30 AM",
    location: "City Recreation Center - Sân 1",
    price: 30000,
    currency: "VND",
    maxSpots: 10,
    bookedSpots: 4,
    description: "Buổi hướng dẫn cho người mới. Coach sẽ dạy kỹ thuật cơ bản.",
    hostName: "Sarah W.",
    ticketRequests: [],
  },
  {
    id: "evt-5",
    groupId: "bay-area-pros",
    title: "Pro Doubles Night",
    date: "Thứ 6",
    time: "6:00 PM",
    location: "Elite Club - Sân A",
    price: 120000,
    currency: "VND",
    maxSpots: 12,
    bookedSpots: 8,
    description: "Buổi chơi đôi dành cho các tay vợt chuyên nghiệp. Xếp trận theo rating.",
    hostName: "Mike R.",
    ticketRequests: [],
  },
  {
    id: "evt-6",
    groupId: "bay-area-pros",
    title: "Weekend Tournament Prep",
    date: "Thứ 7",
    time: "8:00 AM",
    location: "Elite Club - Tất cả sân",
    price: 0,
    currency: "VND",
    maxSpots: 16,
    bookedSpots: 5,
    description: "Buổi tập luyện chuẩn bị cho giải đấu cuối tuần. Miễn phí cho thành viên.",
    hostName: "Mike R.",
    ticketRequests: [],
  },
];
