# Admin Panel — Setup Guide

**Status:** Sprint 1 complete — foundation + auth + shell + Users list demo.

---

## 1. Repo structure (post-monorepo)

```
matchupvn-ClaudeCode/                  ← workspace root
├── pnpm-workspace.yaml
├── package.json                       ← workspace root scripts
├── vercel.json                        ← web app build config
├── apps/
│   ├── web/                           ← matchupvn user app (formerly root)
│   └── admin/                         ← MỚI: admin.matchup.asia
├── packages/                          ← (empty, reserved)
├── supabase/migrations/               ← shared DB
├── docs/admin/                        ← specs + setup
├── landing/                           ← Cloudflare Pages landing site
└── ...
```

## 2. Dev workflow

```bash
# Install (run from root)
pnpm install

# Web app (port 8080)
pnpm dev
# or: pnpm --filter web dev

# Admin app (port 5174)
pnpm dev:admin
# or: pnpm --filter admin dev

# Build both
pnpm build:all
```

## 3. Bootstrap super_admin

**Prerequisite:** tài khoản `jun.gedvn@gmail.com` đã tồn tại trên Supabase Auth.

Migration `20260525110000_seed_super_admin.sql` tự động insert vào `admin_users`.

Verify:
```sql
select au.email, a.role, a.status
from admin_users a
join auth.users au on au.id = a.user_id;
```

Thêm admin khác (chạy tay):
```sql
insert into admin_users (user_id, role, status, created_by)
select id, 'ops_manager', 'active',
  (select user_id from admin_users where role='super_admin' limit 1)
from auth.users where email = 'ops1@matchup.asia';
```

## 4. Login flow (admin app)

1. Truy cập `http://localhost:5174`
2. Login bằng email + password Supabase
3. Lần đầu: scan QR bằng Google Authenticator / Authy → nhập 6 số
4. Mỗi session sau: verify TOTP 6 số
5. Vào Dashboard

**MFA reset** (nếu mất authenticator):
```sql
-- Super_admin chạy:
update admin_users set mfa_enrolled = false where user_id = '<target_user_id>';
-- Sau đó dùng Supabase dashboard để xóa factor:
-- Auth → Users → [user] → MFA → Remove factor
```

## 5. Deploy

### Web app (app.matchup.asia)
- Vercel project hiện tại — đã cập nhật `vercel.json` để build từ `apps/web/`
- Push main → auto-deploy

### Admin app (admin.matchup.asia) — TODO sprint 2
1. Tạo Vercel project mới: `matchupvn-admin`
2. Import git repo, set:
   - **Root Directory**: `apps/admin`
   - **Build Command**: `pnpm install && pnpm --filter admin build`
   - **Output Directory**: `dist`
   - **Install Command**: (leave default)
   - **ENV vars**:
     - `VITE_SUPABASE_URL` = (same as web)
     - `VITE_SUPABASE_PUBLISHABLE_KEY` = (same as web)
3. Custom domain: `admin.matchup.asia`
4. **CRITICAL — Cloudflare WAF**: tạo IP allowlist rule cho domain này

## 6. Security checklist (production)

- [ ] Cloudflare WAF IP allowlist cho admin.matchup.asia
- [ ] MFA enrolled cho mọi admin (verify trong `admin_users.mfa_enrolled`)
- [ ] Audit log retention setup (cron archive sau 24 tháng)
- [ ] Session timeout tuned trong Supabase Auth settings
- [ ] CSP headers trong Vercel/Cloudflare

## 7. Adding a new admin module (pattern)

1. Tạo PRD nếu chưa có (xem `docs/admin/0X-*.md`)
2. SQL migration nếu cần bảng mới (gắn RLS + `is_admin()` policy)
3. Tạo page trong `apps/admin/src/pages/<Module>Page.tsx`
4. Thêm route trong `apps/admin/src/App.tsx`
5. Thêm nav item trong `apps/admin/src/layout/Sidebar.tsx`
6. Thêm i18n keys vào `apps/admin/src/i18n/en.json` + `vi.json`
7. Mọi mutation → gọi `logAdminAction(...)` từ `@/lib/admin-api`

## 8. What's done (Sprint 1)

✅ Monorepo (pnpm workspace)
✅ App cũ moved → `apps/web/`
✅ Admin app scaffold (`apps/admin/`)
✅ Supabase auth + TOTP MFA enforcement
✅ RBAC via `is_admin()` RPC
✅ Audit log RPC `admin_log_action()`
✅ Shell layout (sidebar 20+ items, topbar with lang toggle)
✅ Dashboard page (KPI placeholders)
✅ Users list (server-side pagination, search, PII masking)
✅ i18n EN + VI
✅ Seed super_admin migration

## 9. Next sprints (preview)

- **Sprint 2**: User detail page + Suspend flow + Venue approval queue
- **Sprint 3**: Transactions list + Refund flow + Reconciliation
- **Sprint 4**: Real dashboard metrics + Broadcasts
- **Sprint 5**: Tournament/Group/Marketplace/Event modules
- **Sprint 6**: Referee admin + Health Hub + Points + Legal

See [README.md](./README.md#7-roadmap) for full 12-week roadmap.
