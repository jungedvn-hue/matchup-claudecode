// =============================================
// Tournament Budget Planner - Types & Templates
// =============================================

export type BudgetCategory =
  | "venue"
  | "referee"
  | "branding"
  | "livestream"
  | "prizes"
  | "catering"
  | "marketing"
  | "misc";

export type Currency = "VND" | "USD";

export interface BudgetItem {
  id: string;
  category: BudgetCategory;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  currency: Currency;
  isPaid: boolean;
  notes?: string;
}

export interface RevenueSource {
  entryFeePerPerson: number;
  estimatedParticipants: number;
  sponsorship: number;
  currency: Currency;
}

export interface TournamentBudget {
  tournamentId: string;
  currency: Currency;
  revenue: RevenueSource;
  items: BudgetItem[];
  lastUpdated: string;
}

// Computed helpers
export const getTotalRevenue = (b: TournamentBudget): number => {
  const fee = b.revenue.entryFeePerPerson * b.revenue.estimatedParticipants;
  return fee + b.revenue.sponsorship;
};

export const getItemTotal = (item: BudgetItem): number =>
  item.quantity * item.unitPrice;

export const getTotalExpense = (b: TournamentBudget): number =>
  b.items.reduce((sum, item) => sum + getItemTotal(item), 0);

export const getProfitLoss = (b: TournamentBudget): number =>
  getTotalRevenue(b) - getTotalExpense(b);

export const getPaidAmount = (b: TournamentBudget): number =>
  b.items.filter(i => i.isPaid).reduce((sum, i) => sum + getItemTotal(i), 0);

// =============================================
// Category Metadata
// =============================================
export const CATEGORY_META: Record<BudgetCategory, { label: string; emoji: string; color: string }> = {
  venue:      { label: "Thuê sân",           emoji: "🏟️", color: "blue" },
  referee:    { label: "Trọng tài",           emoji: "🎯", color: "purple" },
  branding:   { label: "Branding & Agency",   emoji: "🎨", color: "pink" },
  livestream: { label: "Livestream & Media",  emoji: "📹", color: "red" },
  prizes:     { label: "Giải thưởng",         emoji: "🏆", color: "yellow" },
  catering:   { label: "Hậu cần & Catering",  emoji: "🍹", color: "green" },
  marketing:  { label: "Marketing",           emoji: "📢", color: "orange" },
  misc:       { label: "Chi phí khác",        emoji: "➕", color: "gray" },
};

// =============================================
// Budget Templates (3 sizes)
// =============================================
export type TemplateSize = "small" | "medium" | "large";

interface BudgetTemplate {
  name: string;
  description: string;
  participantRange: string;
  revenue: RevenueSource;
  items: Omit<BudgetItem, "id" | "isPaid">[];
}

export const BUDGET_TEMPLATES: Record<TemplateSize, BudgetTemplate> = {
  small: {
    name: "Giải Nhỏ",
    description: "Phù hợp với giải nội bộ, câu lạc bộ hoặc sự kiện thân mật",
    participantRange: "Dưới 32 người",
    revenue: { entryFeePerPerson: 150000, estimatedParticipants: 24, sponsorship: 0, currency: "VND" },
    items: [
      { category: "venue",     description: "Thuê sân thi đấu", unit: "sân/giờ", quantity: 4, unitPrice: 100000, currency: "VND", notes: "4 sân × 4 giờ" },
      { category: "referee",   description: "Thù lao trọng tài", unit: "người/ngày", quantity: 4, unitPrice: 300000, currency: "VND" },
      { category: "prizes",    description: "Cúp + huy chương", unit: "bộ", quantity: 3, unitPrice: 500000, currency: "VND" },
      { category: "catering",  description: "Nước uống VĐV", unit: "bình (20L)", quantity: 4, unitPrice: 80000, currency: "VND" },
      { category: "branding",  description: "In banner backdrop", unit: "cái", quantity: 1, unitPrice: 400000, currency: "VND" },
      { category: "misc",      description: "Chi phí phát sinh", unit: "lần", quantity: 1, unitPrice: 500000, currency: "VND" },
    ],
  },
  medium: {
    name: "Giải Trung",
    description: "Phù hợp với giải cộng đồng, liên quận hoặc giải mở",
    participantRange: "33 – 64 người",
    revenue: { entryFeePerPerson: 200000, estimatedParticipants: 48, sponsorship: 5000000, currency: "VND" },
    items: [
      { category: "venue",      description: "Thuê sân thi đấu", unit: "sân/giờ", quantity: 48, unitPrice: 120000, currency: "VND", notes: "6 sân × 8 giờ" },
      { category: "referee",    description: "Thù lao trọng tài", unit: "người/ngày", quantity: 6, unitPrice: 400000, currency: "VND" },
      { category: "branding",   description: "Event Agency - thiết kế & in ấn", unit: "gói", quantity: 1, unitPrice: 5000000, currency: "VND" },
      { category: "prizes",     description: "Tiền mặt + hiện vật", unit: "gói", quantity: 1, unitPrice: 10000000, currency: "VND" },
      { category: "catering",   description: "Nước + snack VĐV", unit: "phần", quantity: 48, unitPrice: 50000, currency: "VND" },
      { category: "marketing",  description: "Facebook Ads", unit: "chiến dịch", quantity: 1, unitPrice: 2000000, currency: "VND" },
      { category: "livestream", description: "Cameraman + thiết bị", unit: "ngày", quantity: 1, unitPrice: 3000000, currency: "VND" },
      { category: "misc",       description: "Chi phí phát sinh", unit: "lần", quantity: 1, unitPrice: 2000000, currency: "VND" },
    ],
  },
  large: {
    name: "Giải Lớn",
    description: "Phù hợp với giải tỉnh/thành phố, giải mở chuyên nghiệp",
    participantRange: "65+ người",
    revenue: { entryFeePerPerson: 350000, estimatedParticipants: 96, sponsorship: 30000000, currency: "VND" },
    items: [
      { category: "venue",      description: "Thuê venue cao cấp", unit: "ngày", quantity: 2, unitPrice: 20000000, currency: "VND", notes: "Kèm sân dự phòng" },
      { category: "referee",    description: "Trọng tài chuyên nghiệp", unit: "người/ngày", quantity: 20, unitPrice: 600000, currency: "VND" },
      { category: "branding",   description: "Full Event Agency (stage, backdrop, MC)", unit: "gói", quantity: 1, unitPrice: 30000000, currency: "VND" },
      { category: "prizes",     description: "Tổng tiền thưởng", unit: "gói", quantity: 1, unitPrice: 50000000, currency: "VND" },
      { category: "catering",   description: "Buffet VĐV + Ban tổ chức", unit: "suất", quantity: 110, unitPrice: 120000, currency: "VND" },
      { category: "marketing",  description: "Media package (KOL + Ads + PR)", unit: "gói", quantity: 1, unitPrice: 15000000, currency: "VND" },
      { category: "livestream", description: "Production team (3 cam + stream)", unit: "ngày", quantity: 2, unitPrice: 10000000, currency: "VND" },
      { category: "misc",       description: "Bảo hiểm + an ninh + y tế", unit: "gói", quantity: 1, unitPrice: 5000000, currency: "VND" },
    ],
  },
};

// =============================================
// Smart Estimate helper
// =============================================
export function smartEstimate(participants: number, courts: number, matchDuration: number, currency: Currency): Partial<BudgetItem>[] {
  const totalMatches = Math.ceil(participants * (participants - 1) / 4); // rough estimate
  const courtHours = Math.ceil((totalMatches * matchDuration) / (courts * 60));
  const referees = courts;
  const waterBottles = participants * 3;

  return [
    { category: "venue",     description: `${courts} sân × ${courtHours} giờ`, unit: "sân/giờ", quantity: courts * courtHours, unitPrice: currency === "VND" ? 120000 : 5, currency },
    { category: "referee",   description: `${referees} trọng tài (1/sân)`, unit: "người/ngày", quantity: referees, unitPrice: currency === "VND" ? 400000 : 15, currency },
    { category: "catering",  description: `Nước uống VĐV (3 chai/người)`, unit: "chai", quantity: waterBottles, unitPrice: currency === "VND" ? 10000 : 0.5, currency },
  ];
}

// =============================================
// Currency utilities
// =============================================
export const USD_TO_VND = 25000;

export const formatMoney = (amount: number, currency: Currency): string => {
  if (currency === "VND") {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(amount);
  }
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
};

export const convertCurrency = (amount: number, from: Currency, to: Currency): number => {
  if (from === to) return amount;
  if (from === "VND" && to === "USD") return amount / USD_TO_VND;
  return amount * USD_TO_VND;
};

// =============================================
// localStorage helpers
// =============================================
const STORAGE_KEY = "matchupvn_budgets";

export const loadBudget = (tournamentId: string): TournamentBudget | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const all = JSON.parse(raw);
    return all[tournamentId] ?? null;
  } catch { return null; }
};

export const saveBudget = (budget: TournamentBudget): void => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const all = raw ? JSON.parse(raw) : {};
    all[budget.tournamentId] = { ...budget, lastUpdated: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch { /* silent */ }
};

export const createEmptyBudget = (tournamentId: string, currency: Currency = "VND"): TournamentBudget => ({
  tournamentId,
  currency,
  revenue: { entryFeePerPerson: 0, estimatedParticipants: 0, sponsorship: 0, currency },
  items: [],
  lastUpdated: new Date().toISOString(),
});
