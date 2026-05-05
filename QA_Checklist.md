# MatchUpVN — QA Checklist

**Last updated:** 2026-05-04 | **QA Run:** Authenticated Playwright E2E + Direct Supabase verification

---

## Bugs Fixed (16 total)

| # | Severity | File(s) | Issue / Fix |
|---|----------|---------|-------------|
| BUG-01 | 🔴 Critical | `src/App.tsx` | Tour-manager routes had no auth guard → wrap with `<ProtectedRoute>` |
| BUG-02 | 🟠 High | `src/context/TournamentContext.tsx` | Bulk delete then bulk insert lost data on partial fail → paired delete+insert per category |
| BUG-03 | 🟡 Medium | `src/lib/tournament/engine.ts` | Wildcards could duplicate auto-qualified → dedup by `Set<string>` |
| BUG-04 | 🟡 Medium | `src/lib/tournament/engine.ts` | H2H recursion unstable when subPriority empty → fallback to `"random"` |
| BUG-05 | 🟡 Medium | `src/pages/TourManagerControlPage.tsx` | Auto-fill resources only handled active category → iterate all |
| BUG-06 | 🟢 Low | `TournamentContext.tsx` + Page | Debug `console.log` in production → removed |
| BUG-07 | 🟠 High | `src/App.tsx` | Missing `/tournament-live/:tournamentId` route → added |
| BUG-08 | 🔴 Critical | `src/pages/TournamentLivePage.tsx` | `tournament.rankingPriority` crash when undefined → optional chaining |
| BUG-09 | 🔴 Critical | `supabase/migrations/20260503000000_fix_missing_timestamps.sql` | tournaments / tour_categories etc. missing `updated_at` → trigger failed every UPDATE. **SQL applied via Dashboard** |
| BUG-10 | 🟠 High | `src/pages/TourManagerCreatePage.tsx` | Player IDs collided across tournaments → `p-${catType}-${Date.now()}-${rand}-${i}` |
| BUG-11 | 🟠 High | `src/pages/TourManagerControlPage.tsx` (MatchCard) | Score inputs reverted by React (controlled value, async sync) → local state in MatchCard + explicit scores to `completeMatch` |
| BUG-12 | 🟠 High | `src/context/TournamentContext.tsx` (fetchTournaments) | Pools JSONB stale (scoreA=0) → merge live `tour_matches` into pool/bracket matches via Map |
| BUG-13 | 🔴 Critical | `src/context/TournamentContext.tsx` (fetchTournaments) | `advancing_per_pool` snake_case not mapped → `advancingPerPool=undefined` → `qualified` field always false → `generateKnockout` returned 0 qualified → silent fail |
| BUG-14 | 🟠 High | `src/context/TournamentContext.tsx` (updateTournament) | Participants delete+insert raced on retry → 409 duplicate key → switched to `upsert({ onConflict: 'id' })` |
| BUG-15 | 🟢 Low | `src/pages/TourManagerControlPage.tsx` | Debug `[KO]` logs from BUG-13 investigation → removed |
| BUG-16 | 🟠 High | `src/context/TournamentContext.tsx` (processQueue) | Realtime queue cleared before async setTournaments callback ran → batch was empty when callback executed → other tabs never updated UI. Snapshot queue then clear |
| FIX-P1/2/3 | 🟡 | Various | Missing TS imports, `playersPerPool as string` cast, Supabase types missing 4 tables |

---

## Routes (28/28) — ✅ All load OK

All public routes render without crashes. Auth-protected (tour-manager) routes correctly redirect to `/login`. No console errors except expected 404 on unknown routes.

---

## Authenticated E2E Tests — ✅ ALL PASSED

| # | Test | Status | Notes |
|---|------|--------|-------|
| M0 | Email/password login → /profile | ✅ | |
| M1 | Create tournament (4-step wizard) → cloud save | ✅ | Round Robin + Hybrid formats |
| M2 | Add players to category | ✅ | Bulk paste, unique IDs across tournaments |
| M3 | Tournament appears in list (Drafts tab) | ✅ | New tours show in Drafts until pools generated |
| M4+M5 | Generate Pools (auto) → matches created | ✅ | Snake seeding, RR matches |
| M6 | Score entry + Complete match → DB persists | ✅ | Local state in MatchCard prevents revert |
| M7 | Standings calculation (W/L/PD/PF, multi-pool) | ✅ | H2H recursion stable |
| M8 | Generate Knockout bracket | ✅ | Hybrid format, 4-player Semi-Finals + Final |
| M9a | Export CSV standings | ✅ | Downloads `{name}_{category}.csv` |
| M9b | Export PDF standings | ✅ | Opens browser print dialog (by design) |
| M3b | Delete tournament cascade | ✅ | 1 DELETE removes tour + cats + matches + participants |
| M11 | Realtime sync across 2 tabs | ✅ | Latency ~1.9s end-to-end (Supabase 500ms batch + WebSocket) |

---

## Database Infrastructure ✅

- 4 tournament tables created with RLS, cascade deletes, JSONB columns
- Realtime enabled on `tour_matches`
- Migration `20260503000000_fix_missing_timestamps.sql` applied (added `created_at`/`updated_at`)

---

## Test Workflow

- Playwright + Chromium for browser automation
- Login: `input[type="email"]` + `input[type="password"]` + first submit button, `waitForTimeout(4000)`
- CreatePage inputs: `input:not([type])` (shadcn doesn't set `type="text"`)
- Plus button: `button:has(svg[class*="lucide-plus"])`
- Direct DB verification via `@supabase/supabase-js` + signInWithPassword fastest for "save vs render" disambiguation
- Test scripts use `node << 'EOF'` heredoc to avoid escaping issues
