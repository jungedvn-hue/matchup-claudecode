# MatchUp Admin Panel — Overview

**Domain:** `admin.matchup.asia`
**Audience:** Internal team (founder, ops, finance, support, moderator, analyst)
**Created:** 2026-05-25
**Status:** Planning / V1 spec

---

## 1. Mục tiêu

Xây dựng Admin Panel **tập trung, đầy đủ** để vận hành toàn bộ nền tảng MatchUp:
- Thay thế 8 admin pages rải rác hiện tại (`AdminUsersPage`, `AdminStatsPage`, `AdminTournamentsPage`, `AdminPointsPage`, `AdminPlatformSettingsPage`, `AdminApplicationsPage`, `AdminHostPromosPage`, `AdminRefereeCertificationsPage`).
- Bao trùm **mọi module** đã có trên platform (xem [Module Map](#3-module-map)).
- RBAC chặt chẽ + audit log đầy đủ + 2FA bắt buộc.

## 2. Kiến trúc

### Triển khai
- **App riêng** tại `admin.matchup.asia` (Vercel project độc lập)
- Cùng repo, tổ chức monorepo (`apps/web` + `apps/admin` + `packages/{ui,supabase,i18n}`)
- Auth: Supabase Auth + MFA TOTP **bắt buộc**
- IP allowlist qua Cloudflare WAF (chỉ IP team nội bộ)

### Stack
| Layer | Tech |
|---|---|
| Framework | Vite + React + TypeScript |
| UI | shadcn/ui + Tailwind (share `packages/ui`) |
| Data grid | TanStack Table v8 (server-side) |
| Charts | Recharts |
| Forms | react-hook-form + zod |
| State | TanStack Query |
| Auth | Supabase Auth + MFA |
| i18n | i18next (EN/VI) |
| Routing | React Router v6 |

### Phân quyền (6 roles)
| Role | Quyền chính |
|---|---|
| `super_admin` | Toàn quyền, gán role, xem audit log, feature flags |
| `ops_manager` | Moderation: user, venue, content, dispute |
| `finance` | Payment, refund, reconciliation, commission |
| `support` | Broadcast, banner, impersonate (read-only), customer support |
| `moderator` | Reports inbox, content moderation (groups, tournaments, posts) |
| `analyst` | Read-only mọi data + analytics dashboard |

## 3. Module Map

Admin Panel quản trị **toàn bộ** module sau:

### Identity & Social
- **Users** (`profiles`, `auth.users`, `user_suspensions`)
- **Verification** (KYC, badges)
- **Friends** (favorite partners, friend graph)

### Venue & Booking
- **Venues** (registry, photos, map, activity)
- **Court bookings** (V2 booking system)
- **Venue payment commission**

### Tournament Ecosystem
- **Tournaments** (create, live, manager, control)
- **Referee** (certifications, ratings, schedule, earnings, attendance)
- **Check-in / Courtside**

### Group & Community
- **Groups** (city map, detail, members)
- **Posts / Discussion**

### Marketplace & Store
- **Marketplace** (listings)
- **Store profile / products / bookings**
- **Service details**
- **Product affiliate**

### Event & Ticket
- **Events** (create, host dashboard, revenue)
- **Paid tickets** (V1)
- **Host promos**

### Health Hub
- **Health Hub** (canonical UX module)
- **Tools** (utilities, calculators)
- **Arena** (gamification)

### Money
- **Wallet** (balances)
- **Topup** (VietQR, PayOS)
- **Payments** (all sources)
- **Referee earnings**

### Engagement
- **Notifications** (push, in-app)
- **Points** (gamification)
- **Match history / My matches**

### Platform
- **Applications** (referee, host, venue applications)
- **Platform settings** (fees, commission default)
- **Legal** (TOS, privacy)
- **Investor BI**
- **Stats**

## 4. Module → PRD mapping

| Module | PRD file |
|---|---|
| Users, Verification, Friends, Venues docs | [01-moderation.md](./01-moderation.md) |
| Wallet, Topup, Payments, Refunds, Recon, Disputes, Commission | [02-finance.md](./02-finance.md) |
| Dashboard, KPIs, BI, Cohorts, Top lists | [03-analytics.md](./03-analytics.md) |
| Reports, Broadcasts, Banners, Flags, Impersonate, Audit | [04-content-support.md](./04-content-support.md) |
| Tournaments, Groups, Marketplace, Store, Events, Tickets, Referee, Health Hub, Points, Applications, Legal | [05-platform-modules.md](./05-platform-modules.md) |
| ASCII mockups mọi screen | [wireframes.md](./wireframes.md) |

## 5. Database

Migration foundation: [`supabase/migrations/20260525100000_admin_panel_foundation.sql`](../../supabase/migrations/20260525100000_admin_panel_foundation.sql)

Bảng mới được tạo:
- `admin_users`, `admin_audit_logs` (partition theo tháng)
- `user_suspensions`, `venue_documents`
- `reports`, `refunds`, `disputes`, `reconciliation_daily`
- `broadcasts`, `feature_flags`, `banners`
- `impersonation_sessions`

Helpers:
- `is_admin(required_role text)` — RLS guard
- `admin_log_action(action, target_type, target_id, before, after, reason)` — ghi audit

## 6. Security Checklist

- [ ] 2FA TOTP bắt buộc cho mọi admin
- [ ] IP allowlist qua Cloudflare WAF
- [ ] RLS strict trên mọi bảng admin (không dùng service_role ở client)
- [ ] Audit log immutable (chặn UPDATE/DELETE)
- [ ] Session timeout 1-2h, force re-login cho action nhạy cảm
- [ ] CSP headers chặt
- [ ] PII masking mặc định, reveal có log
- [ ] Rate limit search/export
- [ ] Soft delete + restore window 30 ngày
- [ ] Impersonate read-only + auto-end 30 phút

## 7. Roadmap

| Sprint | Tuần | Nội dung |
|---|---|---|
| Sprint 1 | 1-2 | Foundation: monorepo, auth+MFA, RBAC, audit log, shell layout, Users list demo |
| Sprint 2 | 3-4 | Moderation: User detail+suspend, Venue approval, Reports inbox |
| Sprint 3 | 5-6 | Finance: Transactions, Refund flow, Reconciliation, Disputes |
| Sprint 4 | 7-8 | Analytics dashboard + Content & Support (broadcast, flags, banners, impersonate) |
| Sprint 5 | 9-10 | Platform modules: Tournament, Group, Marketplace, Store, Event, Ticket moderation |
| Sprint 6 | 11-12 | Referee management, Health Hub admin, Points, Applications, Legal, Investor BI consolidate |

**Tổng ước tính:** 12 tuần cho admin full-feature parity.

## 8. Out of scope (V1)

- AI auto-moderation
- KYC OCR tự động
- Multi-currency
- Custom dashboard builder
- A/B testing framework đầy đủ
- Auto-refund qua gateway (VietQR refund vẫn manual)

---

**Maintainer:** Jun (jun.gedvn@gmail.com)
**Last updated:** 2026-05-25
