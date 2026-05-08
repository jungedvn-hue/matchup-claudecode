-- Tournament undo support + livestream URLs
-- Phase: post-Player v1 polish

-- 1. Tournament-level livestream URLs (array of {platform, url, label})
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS livestream_urls JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 2. Tour match action history for undo (audit log of score changes)
-- Each entry: { at, by_user_id, prev_score_a, prev_score_b, prev_set_scores, prev_status, prev_winner_id, reason }
ALTER TABLE public.tour_matches
  ADD COLUMN IF NOT EXISTS action_history JSONB NOT NULL DEFAULT '[]'::jsonb;
