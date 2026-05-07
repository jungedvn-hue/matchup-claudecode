-- Gamification core: profiles ext + 8 tables + seed data
-- Phase 1 of Player PRD v1

-- =========================================================================
-- 1. Extend profiles with gamification fields
-- =========================================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_xp INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS current_level INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gems INTEGER NOT NULL DEFAULT 0;

-- =========================================================================
-- 2. player_streaks
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.player_streaks (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_activity_date DATE,
  freeze_count INTEGER NOT NULL DEFAULT 0 CHECK (freeze_count >= 0 AND freeze_count <= 2),
  streak_freeze_used_today BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.player_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own streak"
  ON public.player_streaks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own streak"
  ON public.player_streaks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_player_streaks_updated_at ON public.player_streaks;
CREATE TRIGGER update_player_streaks_updated_at
  BEFORE UPDATE ON public.player_streaks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- 3. xp_transactions — audit log
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.xp_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  source TEXT NOT NULL CHECK (source IN (
    'match_played', 'match_won', 'verify_result', 'daily_quest',
    'achievement', 'streak_bonus', 'league_reward', 'onboarding', 'admin_adjust'
  )),
  reference_id UUID,
  multiplier REAL NOT NULL DEFAULT 1.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS xp_transactions_user_idx ON public.xp_transactions (user_id, created_at DESC);

ALTER TABLE public.xp_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own xp"
  ON public.xp_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own xp"
  ON public.xp_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =========================================================================
-- 4. achievements (definitions) + player_achievements (unlocks)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name_en TEXT NOT NULL,
  name_vi TEXT NOT NULL,
  description_en TEXT,
  description_vi TEXT,
  icon TEXT,
  category TEXT NOT NULL,
  max_tier INT NOT NULL DEFAULT 1,
  tier_thresholds INT[] NOT NULL DEFAULT '{1}',
  xp_reward INT NOT NULL DEFAULT 0,
  gem_reward INT NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Achievements public read"
  ON public.achievements FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.player_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  current_tier INT NOT NULL DEFAULT 0,
  progress INT NOT NULL DEFAULT 0,
  unlocked_at TIMESTAMPTZ,
  notified BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS player_achievements_user_idx ON public.player_achievements (user_id);

ALTER TABLE public.player_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players read own achievements"
  ON public.player_achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Players manage own achievements"
  ON public.player_achievements FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Public read of others' unlocked achievements (for profile pages)
CREATE POLICY "Public read unlocked achievements"
  ON public.player_achievements FOR SELECT
  USING (unlocked_at IS NOT NULL);

DROP TRIGGER IF EXISTS update_player_achievements_updated_at ON public.player_achievements;
CREATE TRIGGER update_player_achievements_updated_at
  BEFORE UPDATE ON public.player_achievements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- 5. daily_quests (templates) + player_quests (assignments)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.daily_quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name_en TEXT NOT NULL,
  name_vi TEXT NOT NULL,
  description_en TEXT,
  description_vi TEXT,
  quest_type TEXT NOT NULL CHECK (quest_type IN (
    'play_matches', 'win_matches', 'score_points', 'verify_matches',
    'unique_partner', 'win_by_margin', 'referee_matches', 'daily_login',
    'complete_all_quests'
  )),
  target INT NOT NULL,
  xp_reward INT NOT NULL,
  gem_reward INT NOT NULL DEFAULT 0,
  is_bonus BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_quests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Quests public read"
  ON public.daily_quests FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.player_quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quest_id UUID NOT NULL REFERENCES public.daily_quests(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  progress INT NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (user_id, quest_id, date)
);

CREATE INDEX IF NOT EXISTS player_quests_user_date_idx ON public.player_quests (user_id, date DESC);

ALTER TABLE public.player_quests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players manage own quests"
  ON public.player_quests FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =========================================================================
-- 6. leagues (definitions) + player_leagues (weekly standings)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier INT NOT NULL UNIQUE CHECK (tier BETWEEN 1 AND 10),
  name_en TEXT NOT NULL,
  name_vi TEXT NOT NULL,
  color TEXT NOT NULL,
  min_level INT NOT NULL DEFAULT 1,
  promotion_count INT NOT NULL DEFAULT 5,
  demotion_count INT NOT NULL DEFAULT 5,
  gem_reward_top INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leagues public read"
  ON public.leagues FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.player_leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  xp_earned_this_week INT NOT NULL DEFAULT 0,
  placement INT,
  promotion_demotion TEXT CHECK (promotion_demotion IN ('promoted', 'demoted', 'stayed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (user_id, week_start)
);

CREATE INDEX IF NOT EXISTS player_leagues_week_idx ON public.player_leagues (week_start, league_id);
CREATE INDEX IF NOT EXISTS player_leagues_user_idx ON public.player_leagues (user_id, week_start DESC);

ALTER TABLE public.player_leagues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "League standings public read"
  ON public.player_leagues FOR SELECT USING (true);

CREATE POLICY "Users manage own league"
  ON public.player_leagues FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =========================================================================
-- 7. xp_boosts
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.xp_boosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  multiplier REAL NOT NULL DEFAULT 2.0,
  activated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('quest_complete', 'achievement', 'gem_purchase', 'admin')),
  consumed BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS xp_boosts_user_active_idx ON public.xp_boosts (user_id, expires_at) WHERE consumed = false;

ALTER TABLE public.xp_boosts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own boosts"
  ON public.xp_boosts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =========================================================================
-- 8. handle_new_user — also init player_streaks
-- =========================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'display_name',
      split_part(NEW.email, '@', 1)
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture'
    )
  )
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.player_streaks (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Backfill streaks rows for existing users
INSERT INTO public.player_streaks (user_id)
SELECT u.id FROM auth.users u
LEFT JOIN public.player_streaks s ON s.user_id = u.id
WHERE s.user_id IS NULL;

-- =========================================================================
-- 9. SEED — Achievements (20 keys, ~25 unlock states via tiers)
-- =========================================================================
INSERT INTO public.achievements (key, name_en, name_vi, description_en, description_vi, icon, category, max_tier, tier_thresholds, xp_reward, gem_reward, sort_order)
VALUES
  ('match_milestone', 'Match Milestone', 'Cột mốc trận đấu', 'Play matches to unlock tiers', 'Chơi trận để mở khoá các bậc', 'trophy', 'match', 5, '{1,10,50,100,500}', 100, 10, 10),
  ('victory', 'Victory', 'Chiến thắng', 'Win matches to unlock tiers', 'Thắng trận để mở khoá', 'medal', 'victory', 5, '{1,10,50,100,500}', 150, 15, 20),
  ('streak_3', 'On Fire', 'Khởi động', '3-day playing streak', 'Chuỗi 3 ngày liên tiếp', 'flame', 'streak', 1, '{3}', 50, 5, 30),
  ('streak_7', 'Hot Week', 'Tuần nóng', '7-day playing streak', 'Chuỗi 7 ngày liên tiếp', 'flame', 'streak', 1, '{7}', 100, 10, 31),
  ('streak_30', 'Iron Will', 'Ý chí thép', '30-day playing streak', 'Chuỗi 30 ngày liên tiếp', 'flame', 'streak', 1, '{30}', 500, 50, 32),
  ('streak_100', 'Unstoppable', 'Bất khuất', '100-day playing streak', 'Chuỗi 100 ngày liên tiếp', 'flame', 'streak', 1, '{100}', 2000, 200, 33),
  ('tournament_participant', 'Competitor', 'Đấu thủ', 'Join your first tournament', 'Tham gia giải đấu đầu tiên', 'flag', 'tournament', 1, '{1}', 100, 10, 40),
  ('tournament_finalist', 'Finalist', 'Vào chung kết', 'Reach a tournament final', 'Vào trận chung kết', 'star', 'tournament', 1, '{1}', 300, 30, 41),
  ('tournament_champion', 'Champion', 'Quán quân', 'Win tournaments', 'Vô địch giải đấu', 'crown', 'tournament', 3, '{1,3,10}', 500, 50, 42),
  ('social_partner', 'Social Player', 'Cộng đồng', 'Play with unique opponents', 'Đấu với nhiều đối thủ khác nhau', 'users', 'social', 4, '{1,5,10,20}', 100, 10, 50),
  ('skill_amateur', 'Amateur', 'Tay vợt nghiệp dư', 'Reach Amateur tier', 'Đạt bậc Amateur', 'badge', 'skill', 1, '{2}', 50, 5, 60),
  ('skill_challenger', 'Challenger', 'Tay vợt thử thách', 'Reach Challenger tier', 'Đạt bậc Challenger', 'badge', 'skill', 1, '{5}', 200, 20, 61),
  ('skill_elite', 'Elite', 'Tay vợt tinh nhuệ', 'Reach Elite tier', 'Đạt bậc Elite', 'badge', 'skill', 1, '{10}', 500, 50, 62),
  ('skill_master', 'Master', 'Cao thủ', 'Reach Master tier', 'Đạt bậc Cao thủ', 'badge', 'skill', 1, '{20}', 1000, 100, 63),
  ('perfect_shutout', 'Shutout', 'Trắng séc', 'Win 11-0 matches', 'Thắng 11-0 séc đấu', 'zap', 'perfect', 3, '{1,5,20}', 200, 20, 70),
  ('perfect_winstreak', 'Win Streak', 'Chuỗi thắng', 'Consecutive match wins', 'Thắng liên tiếp', 'trending-up', 'perfect', 3, '{5,10,20}', 300, 30, 71),
  ('verifier', 'Trustworthy', 'Đáng tin', 'Verify match results', 'Xác nhận kết quả trận', 'check-circle', 'trust', 3, '{10,50,200}', 150, 15, 80),
  ('referee_active', 'Active Referee', 'Trọng tài tích cực', 'Referee matches', 'Làm trọng tài', 'gavel', 'trust', 3, '{10,50,200}', 200, 20, 81),
  ('host_first_event', 'First Event', 'Sự kiện đầu tiên', 'Organize your first event', 'Tổ chức sự kiện đầu tiên', 'calendar', 'host', 1, '{1}', 200, 20, 90),
  ('early_adopter', 'Pioneer', 'Người tiên phong', 'Joined during MatchUp beta', 'Tham gia trong giai đoạn beta', 'sparkles', 'special', 1, '{1}', 500, 50, 100)
ON CONFLICT (key) DO NOTHING;

-- =========================================================================
-- 10. SEED — Daily Quests (15 templates)
-- =========================================================================
INSERT INTO public.daily_quests (key, name_en, name_vi, description_en, description_vi, quest_type, target, xp_reward, gem_reward, is_bonus)
VALUES
  ('play_1', 'Quick Game', 'Trận nhanh', 'Play 1 match today', 'Chơi 1 trận hôm nay', 'play_matches', 1, 20, 2, false),
  ('play_2', 'Double Up', 'Gấp đôi', 'Play 2 matches today', 'Chơi 2 trận hôm nay', 'play_matches', 2, 35, 4, false),
  ('play_3', 'Marathon', 'Marathon', 'Play 3 matches today', 'Chơi 3 trận hôm nay', 'play_matches', 3, 50, 6, false),
  ('win_1', 'Take One', 'Thắng 1 trận', 'Win 1 match today', 'Thắng 1 trận hôm nay', 'win_matches', 1, 30, 3, false),
  ('win_2', 'Take Two', 'Thắng 2 trận', 'Win 2 matches today', 'Thắng 2 trận hôm nay', 'win_matches', 2, 55, 5, false),
  ('score_50', 'Point Hunter', 'Săn điểm', 'Score 50 total points', 'Ghi 50 điểm tổng', 'score_points', 50, 25, 3, false),
  ('score_100', 'Sharpshooter', 'Xạ thủ', 'Score 100 total points', 'Ghi 100 điểm tổng', 'score_points', 100, 45, 5, false),
  ('verify_1', 'Honest', 'Trung thực', 'Verify 1 match result', 'Xác nhận 1 kết quả', 'verify_matches', 1, 20, 2, false),
  ('verify_2', 'Reliable', 'Đáng tin', 'Verify 2 match results', 'Xác nhận 2 kết quả', 'verify_matches', 2, 35, 4, false),
  ('new_partner', 'New Friend', 'Bạn mới', 'Play with a new partner', 'Đấu với đối thủ mới', 'unique_partner', 1, 30, 4, false),
  ('margin_5', 'Dominator', 'Áp đảo', 'Win a set by 5+ points', 'Thắng séc cách 5+ điểm', 'win_by_margin', 5, 25, 3, false),
  ('referee_1', 'Fair Play', 'Công bằng', 'Referee 1 match', 'Làm trọng tài 1 trận', 'referee_matches', 1, 25, 3, false),
  ('streak_login', 'Daily Check-in', 'Điểm danh', 'Open the app today', 'Mở app hôm nay', 'daily_login', 1, 15, 2, false),
  ('all_three', 'Triple Threat', 'Bộ ba', 'Complete all 3 daily quests', 'Hoàn thành cả 3 quest', 'complete_all_quests', 3, 50, 10, true),
  ('win_streak_today', 'Hot Streak', 'Chuỗi nóng', 'Win 2 matches in a row', 'Thắng 2 trận liên tiếp', 'win_matches', 2, 40, 5, false)
ON CONFLICT (key) DO NOTHING;

-- =========================================================================
-- 11. SEED — Leagues (10 tiers)
-- =========================================================================
INSERT INTO public.leagues (tier, name_en, name_vi, color, min_level, promotion_count, demotion_count, gem_reward_top)
VALUES
  (1, 'Bronze', 'Đồng', '#CD7F32', 1, 5, 0, 10),
  (2, 'Silver', 'Bạc', '#C0C0C0', 3, 5, 5, 15),
  (3, 'Gold', 'Vàng', '#FFD700', 6, 5, 5, 25),
  (4, 'Sapphire', 'Sapphire', '#0F52BA', 11, 5, 5, 40),
  (5, 'Ruby', 'Hồng ngọc', '#E0115F', 16, 5, 5, 60),
  (6, 'Emerald', 'Lục bảo', '#50C878', 21, 5, 5, 90),
  (7, 'Amethyst', 'Thạch anh tím', '#9966CC', 26, 5, 5, 130),
  (8, 'Pearl', 'Ngọc trai', '#EAE0C8', 31, 5, 5, 180),
  (9, 'Obsidian', 'Hắc diệu', '#3D3635', 41, 5, 5, 250),
  (10, 'Diamond', 'Kim cương', '#B9F2FF', 51, 0, 5, 500)
ON CONFLICT (tier) DO NOTHING;
