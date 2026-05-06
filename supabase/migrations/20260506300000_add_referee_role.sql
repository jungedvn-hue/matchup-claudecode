-- Add 'referee' to app_role enum so users can apply to be verified referees.
-- Verified referees show up in a global pool that hosts can browse when
-- assigning matches. The existing accessCode-based per-match invitation
-- flow is unaffected.

ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'referee';
