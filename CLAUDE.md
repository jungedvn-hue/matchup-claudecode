# MatchUpVN — Claude Code Instructions

## Workflow rules (LUÔN áp dụng)

1. **Plan trước, build sau** — Luôn propose plan và chờ user approve trước khi viết code.
2. **Session memory** — Đầu mỗi phiên làm việc, ĐỌC file memory session gần nhất tại:
   `/Users/seltec/.claude/projects/-Volumes-TPA-DISK-Tuan-Pham-Jun-AI-1--Project-22--MatchUp-MatchUp-x-ClaudeCode-matchupvn-ClaudeCode/memory/project_session_2026_05_13_14.md`
   (và các file session mới hơn nếu có).
3. **Lưu tiến độ** — CHỈ cập nhật/tạo file session memory khi user **báo kết thúc phiên** ("kết thúc phiên", "end session", "lưu lại nhé"). Không lưu sau mỗi feature.
4. **Ngôn ngữ** — Giao tiếp với user bằng tiếng Việt, terse (ngắn gọn).
5. **Design system** — Health Hub là canonical UX/UI reference. Mirror patterns của nó.
6. **Bilingual** — Mọi feature mới phải có đầy đủ EN + VI keys qua i18next. Không hardcode string.

## Stack
- React + TypeScript + Vite
- Supabase (Postgres + RLS + Auth)
- Tailwind CSS + shadcn/ui
- i18next (EN/VI)
- Deployed: app.matchup.asia (Vercel), matchup.asia (Cloudflare Pages)
