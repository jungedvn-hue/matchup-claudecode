import { supabase } from "@/integrations/supabase/client";
import { XP_REWARDS, getLevelFromXP } from "@/lib/scoring";

const sb = supabase as unknown as { from: (t: string) => any; rpc?: any };

export type XPSource =
  | "match_played" | "match_won" | "verify_result"
  | "daily_quest" | "achievement" | "streak_bonus"
  | "league_reward" | "onboarding" | "admin_adjust";

export type Tier = "Amateur" | "Challenger" | "Elite" | "Master" | "Grandmaster";

export const getTierFromLevel = (level: number): Tier => {
  if (level >= 51) return "Grandmaster";
  if (level >= 21) return "Master";
  if (level >= 11) return "Elite";
  if (level >= 5) return "Challenger";
  return "Amateur";
};

export const getXPForLevel = (level: number): number => Math.pow(level, 2) * 100;

// =========================================================================
// XP awards
// =========================================================================
export const awardXP = async (
  userId: string,
  amount: number,
  source: XPSource,
  referenceId?: string
): Promise<{ ok: true; newTotalXP: number; newLevel: number; leveledUp: boolean } | { error: string }> => {
  if (amount <= 0) return { error: "Amount must be positive" };

  // Read current XP
  const { data: profile, error: pErr } = await sb.from("profiles")
    .select("total_xp, current_level")
    .eq("user_id", userId)
    .single();
  if (pErr) return { error: pErr.message };

  const oldXP = profile?.total_xp ?? 0;
  const oldLevel = profile?.current_level ?? 1;
  const newXP = oldXP + amount;
  const newLevel = getLevelFromXP(newXP);
  const leveledUp = newLevel > oldLevel;

  await sb.from("xp_transactions").insert({
    user_id: userId,
    amount,
    source,
    reference_id: referenceId ?? null,
  });

  await sb.from("profiles")
    .update({ total_xp: newXP, current_level: newLevel })
    .eq("user_id", userId);

  return { ok: true, newTotalXP: newXP, newLevel, leveledUp };
};

// =========================================================================
// Streak management
// =========================================================================
export interface StreakState {
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  freeze_count: number;
  bonusXP?: number;
}

export const updateDailyStreak = async (userId: string): Promise<StreakState | null> => {
  const today = new Date().toISOString().slice(0, 10);
  const { data: streak } = await sb.from("player_streaks")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (!streak) {
    // Init row
    const init: StreakState = {
      current_streak: 1,
      longest_streak: 1,
      last_activity_date: today,
      freeze_count: 0,
    };
    await sb.from("player_streaks").insert({ user_id: userId, ...init });
    return init;
  }

  const last = streak.last_activity_date;
  if (last === today) return streak as StreakState;

  let current = streak.current_streak;
  let freezes = streak.freeze_count;

  if (last) {
    const lastDate = new Date(last);
    const todayDate = new Date(today);
    const dayGap = Math.round((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    if (dayGap === 1) current += 1;
    else if (dayGap === 2 && freezes > 0) {
      // Use freeze
      freezes -= 1;
      current += 1;
    } else current = 1;
  } else {
    current = 1;
  }

  const longest = Math.max(streak.longest_streak, current);
  const bonusXP = Math.min(100, current * 10);

  await sb.from("player_streaks").update({
    current_streak: current,
    longest_streak: longest,
    last_activity_date: today,
    freeze_count: freezes,
  }).eq("user_id", userId);

  if (bonusXP > 0) await awardXP(userId, bonusXP, "streak_bonus");

  return { current_streak: current, longest_streak: longest, last_activity_date: today, freeze_count: freezes, bonusXP };
};

// =========================================================================
// Quest system
// =========================================================================
export interface DailyQuestRow {
  id: string;
  key: string;
  name_en: string; name_vi: string;
  description_en: string | null; description_vi: string | null;
  quest_type: string;
  target: number;
  xp_reward: number;
  gem_reward: number;
  is_bonus: boolean;
  is_active: boolean;
}

export interface PlayerQuestRow {
  id: string;
  user_id: string;
  quest_id: string;
  date: string;
  progress: number;
  completed: boolean;
  claimed_at: string | null;
  quest?: DailyQuestRow;
}

export const generateDailyQuests = async (userId: string): Promise<PlayerQuestRow[]> => {
  const today = new Date().toISOString().slice(0, 10);

  // Already assigned today?
  const { data: existing } = await sb.from("player_quests")
    .select("*, quest:daily_quests(*)")
    .eq("user_id", userId)
    .eq("date", today);
  if (existing && existing.length > 0) return existing as PlayerQuestRow[];

  // Pick 3 random non-bonus quests + 1 bonus
  const { data: pool } = await sb.from("daily_quests").select("*").eq("is_active", true);
  const all = (pool ?? []) as DailyQuestRow[];
  const regular = all.filter(q => !q.is_bonus);
  const bonus = all.filter(q => q.is_bonus);

  const shuffled = [...regular].sort(() => Math.random() - 0.5).slice(0, 3);
  const picks = [...shuffled, ...(bonus.length > 0 ? [bonus[0]] : [])];

  const inserts = picks.map(q => ({
    user_id: userId,
    quest_id: q.id,
    date: today,
    progress: 0,
    completed: false,
  }));
  if (inserts.length > 0) await sb.from("player_quests").insert(inserts);

  // Re-read with join
  const { data: fresh } = await sb.from("player_quests")
    .select("*, quest:daily_quests(*)")
    .eq("user_id", userId)
    .eq("date", today);
  return (fresh ?? []) as PlayerQuestRow[];
};

// QuestTrigger drives progress updates
export interface QuestTrigger {
  type: "match_played" | "match_won" | "match_verified" | "score_points" | "referee_match" | "new_partner" | "win_margin" | "daily_login";
  amount?: number; // delta
  partnerUserId?: string;
}

export const updateQuestProgress = async (userId: string, trigger: QuestTrigger): Promise<void> => {
  const today = new Date().toISOString().slice(0, 10);
  const { data: quests } = await sb.from("player_quests")
    .select("*, quest:daily_quests(*)")
    .eq("user_id", userId)
    .eq("date", today)
    .eq("completed", false);
  const rows = (quests ?? []) as PlayerQuestRow[];
  for (const pq of rows) {
    if (!pq.quest) continue;
    let delta = 0;
    const qType = pq.quest.quest_type;
    if (qType === "play_matches" && trigger.type === "match_played") delta = 1;
    else if (qType === "win_matches" && trigger.type === "match_won") delta = 1;
    else if (qType === "verify_matches" && trigger.type === "match_verified") delta = 1;
    else if (qType === "score_points" && trigger.type === "score_points") delta = trigger.amount ?? 0;
    else if (qType === "referee_matches" && trigger.type === "referee_match") delta = 1;
    else if (qType === "unique_partner" && trigger.type === "new_partner") delta = 1;
    else if (qType === "win_by_margin" && trigger.type === "win_margin" && (trigger.amount ?? 0) >= pq.quest.target) {
      // One-shot completion
      delta = pq.quest.target;
    }
    else if (qType === "daily_login" && trigger.type === "daily_login") delta = 1;

    if (delta > 0) {
      const newProgress = Math.min(pq.quest.target, pq.progress + delta);
      const completed = newProgress >= pq.quest.target;
      await sb.from("player_quests").update({
        progress: newProgress,
        completed,
      }).eq("id", pq.id);
    }
  }

  // Bonus quest: complete_all_quests — auto-mark when 3 regular quests done
  const { data: refresh } = await sb.from("player_quests")
    .select("*, quest:daily_quests(*)")
    .eq("user_id", userId)
    .eq("date", today);
  const refreshed = (refresh ?? []) as PlayerQuestRow[];
  const completedRegular = refreshed.filter(p => p.quest && !p.quest.is_bonus && p.completed).length;
  const bonusRow = refreshed.find(p => p.quest?.is_bonus);
  if (bonusRow && bonusRow.quest && !bonusRow.completed && completedRegular >= bonusRow.quest.target) {
    await sb.from("player_quests").update({ progress: completedRegular, completed: true }).eq("id", bonusRow.id);
  }
};

export const claimQuest = async (userId: string, playerQuestId: string): Promise<{ ok: true; xp: number; gems: number } | { error: string }> => {
  const { data: pq } = await sb.from("player_quests")
    .select("*, quest:daily_quests(*)")
    .eq("id", playerQuestId)
    .eq("user_id", userId)
    .single();
  if (!pq) return { error: "Not found" };
  if (!pq.completed) return { error: "Not completed yet" };
  if (pq.claimed_at) return { error: "Already claimed" };
  const xp = pq.quest.xp_reward;
  const gems = pq.quest.gem_reward;
  await awardXP(userId, xp, "daily_quest", playerQuestId);
  if (gems > 0) {
    const { data: profile } = await sb.from("profiles").select("gems").eq("user_id", userId).single();
    await sb.from("profiles").update({ gems: (profile?.gems ?? 0) + gems }).eq("user_id", userId);
  }
  await sb.from("player_quests").update({ claimed_at: new Date().toISOString() }).eq("id", playerQuestId);
  return { ok: true, xp, gems };
};

// =========================================================================
// Achievement progress (basic — match_milestone + victory + streak tiers)
// =========================================================================
export interface AchievementTrigger {
  type: "match_played" | "match_won" | "streak_updated" | "verify_done" | "referee_done" | "shutout_won" | "winstreak_updated" | "skill_changed" | "tournament_won";
  value?: number; // streak value, winstreak value, skill numeric
}

const KEY_BY_TYPE: Record<AchievementTrigger["type"], string[]> = {
  match_played: ["match_milestone"],
  match_won: ["victory"],
  streak_updated: ["streak_3", "streak_7", "streak_30", "streak_100"],
  verify_done: ["verifier"],
  referee_done: ["referee_active"],
  shutout_won: ["perfect_shutout"],
  winstreak_updated: ["perfect_winstreak"],
  skill_changed: ["skill_amateur", "skill_challenger", "skill_elite", "skill_master"],
  tournament_won: ["tournament_champion"],
};

export const checkAchievementProgress = async (userId: string, trigger: AchievementTrigger): Promise<string[]> => {
  const keys = KEY_BY_TYPE[trigger.type] ?? [];
  if (keys.length === 0) return [];
  const unlockedKeys: string[] = [];

  const { data: defs } = await sb.from("achievements").select("*").in("key", keys);
  const definitions = (defs ?? []) as Array<{ id: string; key: string; max_tier: number; tier_thresholds: number[]; xp_reward: number; gem_reward: number }>;

  for (const def of definitions) {
    const { data: existing } = await sb.from("player_achievements")
      .select("*")
      .eq("user_id", userId)
      .eq("achievement_id", def.id)
      .maybeSingle();

    let progress = (existing?.progress ?? 0);
    if (trigger.type === "streak_updated" || trigger.type === "winstreak_updated" || trigger.type === "skill_changed") {
      progress = trigger.value ?? progress;
    } else {
      progress = progress + 1;
    }

    // Find matching tier reached
    const thresholds = def.tier_thresholds || [];
    let newTier = 0;
    for (let i = 0; i < thresholds.length; i++) {
      if (progress >= thresholds[i]) newTier = i + 1;
    }
    const oldTier = existing?.current_tier ?? 0;
    const justUnlocked = newTier > oldTier;

    const update = {
      user_id: userId,
      achievement_id: def.id,
      progress,
      current_tier: newTier,
      unlocked_at: justUnlocked ? new Date().toISOString() : (existing?.unlocked_at ?? null),
      notified: existing?.notified ?? false,
    };

    if (existing) {
      await sb.from("player_achievements").update(update).eq("id", existing.id);
    } else {
      await sb.from("player_achievements").insert(update);
    }

    if (justUnlocked) {
      unlockedKeys.push(def.key);
      // Award XP/gems for new tier
      await awardXP(userId, def.xp_reward, "achievement", def.id);
      if (def.gem_reward > 0) {
        const { data: profile } = await sb.from("profiles").select("gems").eq("user_id", userId).single();
        await sb.from("profiles").update({ gems: (profile?.gems ?? 0) + def.gem_reward }).eq("user_id", userId);
      }
    }
  }

  return unlockedKeys;
};

// =========================================================================
// Match XP convenience
// =========================================================================
export const awardMatchPlayedXP = async (userId: string, matchId: string) => {
  await awardXP(userId, XP_REWARDS.MATCH_PLAYED, "match_played", matchId);
  await updateQuestProgress(userId, { type: "match_played" });
  await checkAchievementProgress(userId, { type: "match_played" });
};

export const awardMatchVerifiedXP = async (
  userId: string,
  matchId: string,
  isWinner: boolean,
  totalScore: number,
  marginThisMatch: number,
) => {
  if (isWinner) {
    await awardXP(userId, XP_REWARDS.MATCH_WON, "match_won", matchId);
    await updateQuestProgress(userId, { type: "match_won" });
    await checkAchievementProgress(userId, { type: "match_won" });
    if (marginThisMatch >= 11) {
      // 11-0 shutout heuristic: largest single-set margin >= 11
      await checkAchievementProgress(userId, { type: "shutout_won" });
    }
  }
  await updateQuestProgress(userId, { type: "score_points", amount: totalScore });
  await updateQuestProgress(userId, { type: "win_margin", amount: marginThisMatch });
};

export const awardVerifyXP = async (userId: string, matchId: string) => {
  await awardXP(userId, XP_REWARDS.VERIFY_RESULT, "verify_result", matchId);
  await updateQuestProgress(userId, { type: "match_verified" });
  await checkAchievementProgress(userId, { type: "verify_done" });
};
