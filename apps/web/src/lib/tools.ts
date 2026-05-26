import type { LucideIcon } from "lucide-react";
import {
  Trophy, Calculator, ScanLine, Award, Receipt, Calendar,
  Map, DollarSign, BarChart3, TrendingUp, Activity, Gavel, Building2,
} from "lucide-react";

export type ToolCategory = "organize" | "finance" | "facility" | "player";
export type ToolStatus = "available" | "beta" | "coming_soon" | "premium_locked";
export type ToolRole = "host" | "court_owner" | "referee" | "player" | "any";

export interface Tool {
  id: string;
  category: ToolCategory;
  roles: ToolRole[];          // visibility roles (any → all logged-in)
  icon: LucideIcon;
  labelKey: string;            // i18n key for label
  descKey: string;             // i18n key for short description
  route?: string;              // navigates here
  status: ToolStatus;          // displayed badge
  priority: number;            // higher = shown first on HomePage preview
}

export const TOOLS: Tool[] = [
  // ── Tổ chức (host) ──────────────────────────────────────────────────────
  {
    id: "tour-mgr",
    category: "organize",
    roles: ["host"],
    icon: Trophy,
    labelKey: "tools.tourMgr.label",
    descKey: "tools.tourMgr.desc",
    route: "/tournaments?mine=1",
    status: "available",
    priority: 100,
  },
  {
    id: "checkin-scanner",
    category: "organize",
    roles: ["host"],
    icon: ScanLine,
    labelKey: "tools.checkin.label",
    descKey: "tools.checkin.desc",
    route: "/checkin",
    status: "available",
    priority: 90,
  },
  {
    id: "ref-invite",
    category: "organize",
    roles: ["host"],
    icon: Gavel,
    labelKey: "tools.refInvite.label",
    descKey: "tools.refInvite.desc",
    route: "/referees",
    status: "available",
    priority: 80,
  },
  {
    id: "schedule-gen",
    category: "organize",
    roles: ["host"],
    icon: Calendar,
    labelKey: "tools.scheduleGen.label",
    descKey: "tools.scheduleGen.desc",
    status: "coming_soon",
    priority: 50,
  },

  // ── Tài chính ───────────────────────────────────────────────────────────
  {
    id: "budget-calc",
    category: "finance",
    roles: ["host", "player"],
    icon: Calculator,
    labelKey: "tools.budget.label",
    descKey: "tools.budget.desc",
    route: "/tools/budget",
    status: "beta",
    priority: 70,
  },
  {
    id: "payout-calc",
    category: "finance",
    roles: ["host"],
    icon: DollarSign,
    labelKey: "tools.payout.label",
    descKey: "tools.payout.desc",
    status: "beta",
    priority: 60,
  },
  {
    id: "cost-split",
    category: "finance",
    roles: ["player"],
    icon: Receipt,
    labelKey: "tools.costSplit.label",
    descKey: "tools.costSplit.desc",
    status: "coming_soon",
    priority: 40,
  },

  // ── Vận hành sân (court_owner) ──────────────────────────────────────────
  {
    id: "my-venues",
    category: "facility",
    roles: ["court_owner"],
    icon: Building2,
    labelKey: "tools.myVenues.label",
    descKey: "tools.myVenues.desc",
    route: "/my-venues",
    status: "available",
    priority: 95,
  },
  {
    id: "court-schedule",
    category: "facility",
    roles: ["court_owner"],
    icon: Calendar,
    labelKey: "tools.courtSchedule.label",
    descKey: "tools.courtSchedule.desc",
    status: "coming_soon",
    priority: 75,
  },
  {
    id: "booking-calendar",
    category: "facility",
    roles: ["court_owner"],
    icon: Map,
    labelKey: "tools.booking.label",
    descKey: "tools.booking.desc",
    status: "coming_soon",
    priority: 65,
  },
  {
    id: "court-revenue",
    category: "facility",
    roles: ["court_owner"],
    icon: TrendingUp,
    labelKey: "tools.courtRevenue.label",
    descKey: "tools.courtRevenue.desc",
    status: "coming_soon",
    priority: 55,
  },

  // ── Người chơi ──────────────────────────────────────────────────────────
  {
    id: "elo-sim",
    category: "player",
    roles: ["player"],
    icon: BarChart3,
    labelKey: "tools.eloSim.label",
    descKey: "tools.eloSim.desc",
    status: "coming_soon",
    priority: 45,
  },
  {
    id: "practice-log",
    category: "player",
    roles: ["player"],
    icon: Activity,
    labelKey: "tools.practiceLog.label",
    descKey: "tools.practiceLog.desc",
    status: "coming_soon",
    priority: 35,
  },
  {
    id: "achievement-tracker",
    category: "player",
    roles: ["player"],
    icon: Award,
    labelKey: "tools.achievements.label",
    descKey: "tools.achievements.desc",
    status: "coming_soon",
    priority: 30,
  },
];

export const filterToolsForRoles = (tools: Tool[], userRoles: string[]): Tool[] => {
  const r = new Set(userRoles);
  return tools.filter(t => t.roles.includes("any") || t.roles.some(role => r.has(role)));
};

export const CATEGORIES: { id: ToolCategory; labelKey: string }[] = [
  { id: "organize",  labelKey: "tools.cat.organize" },
  { id: "finance",   labelKey: "tools.cat.finance" },
  { id: "facility",  labelKey: "tools.cat.facility" },
  { id: "player",    labelKey: "tools.cat.player" },
];
