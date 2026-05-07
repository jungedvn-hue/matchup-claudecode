-- Multi-set match support
-- Adds best-of-N configuration to tournaments and per-set score tracking on matches.

ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS num_sets INT NOT NULL DEFAULT 1
  CHECK (num_sets IN (1, 3, 5, 7));

-- Max points cap: when a team reaches this, they win the set even without
-- a 2-point gap. NULL = no cap (pure win-by-X rules).
ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS max_points INT;

ALTER TABLE tour_matches
  ADD COLUMN IF NOT EXISTS set_scores JSONB NOT NULL DEFAULT '[]'::jsonb;

-- set_scores format: [{"a": 11, "b": 7}, {"a": 9, "b": 11}, {"a": 11, "b": 6}]
-- score_a / score_b remain the aggregate "sets won" for backward compatibility
-- when num_sets > 1; for num_sets = 1 they remain the raw point score.

COMMENT ON COLUMN tournaments.num_sets IS 'Best of N (1, 3, 5, 7). Default 1 = single game.';
COMMENT ON COLUMN tour_matches.set_scores IS 'JSON array of per-set scores: [{"a":int,"b":int}, ...]';
