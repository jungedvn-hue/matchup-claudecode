// Tool definitions for MatchUp AI Assistant.
// Each tool has: schema (Anthropic format) + executor (runs against Supabase).

// @ts-ignore
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface ToolContext {
  userId: string;
  supabase: SupabaseClient;
}

export interface ToolDef {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
  execute: (input: any, ctx: ToolContext) => Promise<unknown>;
}

// ── find_players_near ──────────────────────────────────────────────────────
const findPlayersNear: ToolDef = {
  name: "find_players_near",
  description:
    "Tìm người chơi pickleball/padel theo skill level và/hoặc thành phố. Dùng khi user hỏi 'tìm partner', 'người chơi gần tôi', 'ai trình giống tôi'.",
  input_schema: {
    type: "object",
    properties: {
      skill_level: {
        type: "string",
        enum: ["beginner", "intermediate", "advanced", "any"],
        description: "Trình độ muốn tìm. 'any' nếu user không chỉ rõ.",
      },
      city: {
        type: "string",
        description: "Thành phố hoặc địa điểm (vd: 'Hà Nội', 'Quận 1', 'CH Garden'). Để rỗng nếu không có.",
      },
      limit: { type: "number", default: 8, description: "Số kết quả tối đa, tối đa 15." },
    },
    required: ["skill_level"],
  },
  execute: async (input, { userId, supabase }) => {
    const limit = Math.min(input.limit ?? 8, 15);
    let q = supabase
      .from("profiles")
      .select("user_id, display_name, skill_level, dupr_rating, location, current_level")
      .neq("user_id", userId)
      .order("current_level", { ascending: false })
      .limit(limit);
    if (input.skill_level && input.skill_level !== "any") {
      q = q.eq("skill_level", input.skill_level);
    }
    if (input.city && input.city.trim().length > 1) {
      q = q.ilike("location", `%${input.city.trim()}%`);
    }
    const { data, error } = await q;
    if (error) return { error: error.message };
    return { count: data?.length ?? 0, players: data ?? [] };
  },
};

// ── find_courts_near ───────────────────────────────────────────────────────
const findCourtsNear: ToolDef = {
  name: "find_courts_near",
  description:
    "Tìm sân pickleball/padel (venue) theo thành phố hoặc tên. Dùng khi user hỏi 'sân gần tôi', 'sân ở Quận X', 'sân ABC còn slot không'.",
  input_schema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Tên sân hoặc thành phố/khu vực để search. Để rỗng = list top sân.",
      },
      limit: { type: "number", default: 8 },
    },
  },
  execute: async (input, { supabase }) => {
    const limit = Math.min(input.limit ?? 8, 15);
    let q = supabase
      .from("venues")
      .select("id, name, address, phone, amenities")
      .limit(limit);
    if (input.query && input.query.trim().length > 1) {
      const term = `%${input.query.trim()}%`;
      q = q.or(`name.ilike.${term},address.ilike.${term}`);
    }
    const { data, error } = await q;
    if (error) return { error: error.message };
    return { count: data?.length ?? 0, courts: data ?? [] };
  },
};

export const TOOLS: ToolDef[] = [findPlayersNear, findCourtsNear];

export const TOOL_SCHEMAS = TOOLS.map(({ name, description, input_schema }) => ({
  name,
  description,
  input_schema,
}));

export const TOOL_MAP = Object.fromEntries(TOOLS.map((t) => [t.name, t])) as Record<string, ToolDef>;
