# PRD 05 — Platform Modules Administration

**Scope:** Quản trị các module nghiệp vụ của platform — Tournament, Group, Marketplace/Store, Event/Ticket, Referee, Health Hub, Points, Applications, Legal, Investor BI.
**Roles:** `moderator`, `ops_manager`, `super_admin` tùy module.

> Module này gộp các trang admin cũ rải rác: `AdminTournamentsPage`, `AdminPointsPage`, `AdminApplicationsPage`, `AdminHostPromosPage`, `AdminRefereeCertificationsPage`.

---

## 1. Tournament Administration

**Owner role:** `moderator`, `ops_manager`

| ID | Yêu cầu | Priority |
|---|---|---|
| TN-01 | Tournaments list: filter status/organizer/date/format/sport | P0 |
| TN-02 | Tournament detail: bracket, participants, referees, payments | P0 |
| TN-03 | Force-cancel tournament (mass refund, gửi noti) | P0 |
| TN-04 | Feature tournament (pin top of list) | P1 |
| TN-05 | Edit metadata (title, rules) sau create — log | P1 |
| TN-06 | Reassign organizer (rare) | P2 |
| TN-07 | Tournament fee oversight (linked to finance) | P0 |
| TN-08 | Live monitoring: tournaments đang diễn ra, courtside referee status | P1 |

## 2. Group Administration

**Owner role:** `moderator`

| ID | Yêu cầu | Priority |
|---|---|---|
| GR-01 | Groups list: search, filter region/sport/member_count/activity | P0 |
| GR-02 | Group detail: members, posts, events, reports | P0 |
| GR-03 | Hide group (soft, không xóa) | P0 |
| GR-04 | Delete group (super_admin only, 30d retention) | P1 |
| GR-05 | Transfer owner | P1 |
| GR-06 | Feature group (city map highlight) | P1 |
| GR-07 | Bulk action: hide spam groups | P2 |
| GR-08 | Posts moderation: hide/delete post in group | P0 |

## 3. Marketplace & Store Administration

**Owner role:** `moderator`, `ops_manager`

| ID | Yêu cầu | Priority |
|---|---|---|
| MK-01 | Stores list: filter status/category/owner | P0 |
| MK-02 | Store detail: products, orders, revenue, reports | P0 |
| MK-03 | Approve new store (similar venue flow) | P0 |
| MK-04 | Suspend store (auto-cancel pending orders + refund) | P0 |
| MK-05 | Products list: search, filter, hide individual product | P0 |
| MK-06 | Hide/remove listing (spam, prohibited) | P0 |
| MK-07 | Product affiliate tracking | P1 |
| MK-08 | Store orders oversight (linked to finance) | P0 |
| MK-09 | Service detail moderation (paid services) | P1 |
| MK-10 | Commission rate per store override | P1 |

## 4. Event & Ticket Administration

**Owner role:** `moderator`, `ops_manager`, `finance`

| ID | Yêu cầu | Priority |
|---|---|---|
| EV-01 | Events list: filter status/host/date/region | P0 |
| EV-02 | Event detail: tickets sold, revenue, attendees | P0 |
| EV-03 | Force-cancel event (mass refund) | P0 |
| EV-04 | Host applications approval (consolidate `AdminApplicationsPage`) | P0 |
| EV-05 | Host promos management (consolidate `AdminHostPromosPage`) | P0 |
| EV-06 | Ticket refund individual (linked to finance) | P0 |
| EV-07 | Event check-in oversight | P1 |
| EV-08 | Feature event (banner / hub) | P1 |
| EV-09 | Host revenue payout reports | P1 |

## 5. Referee Administration

**Owner role:** `ops_manager`, `super_admin`

> Consolidate `AdminRefereeCertificationsPage`

| ID | Yêu cầu | Priority |
|---|---|---|
| RF-01 | Referees list: filter cert level/specialization/active | P0 |
| RF-02 | Referee detail: certifications, ratings, gigs, earnings | P0 |
| RF-03 | Set certification level (RFC-01..RFC-04) | P0 |
| RF-04 | Set specialization (sport, format) | P0 |
| RF-05 | Approve referee application | P0 |
| RF-06 | Suspend referee (after bad ratings / no-show) | P0 |
| RF-07 | View attendance log + no-show stats | P0 |
| RF-08 | Earnings payout report per referee | P1 |
| RF-09 | Manage blocked dates override | P2 |
| RF-10 | Referee ratings moderation (remove fake ratings) | P1 |

## 6. Health Hub Administration

**Owner role:** `moderator`, `super_admin`

> Health Hub là canonical UX module — admin cần curate kỹ

| ID | Yêu cầu | Priority |
|---|---|---|
| HH-01 | Manage hub content (articles, programs, tools) | P0 |
| HH-02 | Publish/unpublish | P0 |
| HH-03 | Wearable integration settings | P1 |
| HH-04 | Featured content scheduler | P1 |
| HH-05 | Tools (utilities) management | P1 |

## 7. Points & Gamification

**Owner role:** `super_admin`

> Consolidate `AdminPointsPage`

| ID | Yêu cầu | Priority |
|---|---|---|
| PT-01 | Points rules CRUD (action → points) | P0 |
| PT-02 | Manual grant/revoke points cho user (audit) | P0 |
| PT-03 | Leaderboard view | P1 |
| PT-04 | Badges / achievements management | P1 |
| PT-05 | Points → wallet conversion rate config | P2 |
| PT-06 | Suspicious activity detection (auto-farm) | P2 |

## 8. Discover / Tools / Arena

**Owner role:** `ops_manager`, `moderator`

| ID | Yêu cầu | Priority |
|---|---|---|
| DC-01 | Discover feed curation (pin items, hide) | P1 |
| DC-02 | Tools registry (add/remove utilities) | P1 |
| DC-03 | Arena gamification settings | P2 |

## 9. Legal & Compliance

**Owner role:** `super_admin`

| ID | Yêu cầu | Priority |
|---|---|---|
| LG-01 | TOS / Privacy / Cookie policy editor (EN+VI, versioned) | P0 |
| LG-02 | User consent log (who accepted what version when) | P0 |
| LG-03 | DSAR handling (data export per user request) | P1 |
| LG-04 | Right to be forgotten (account deletion flow) | P1 |
| LG-05 | DMCA / copyright takedown workflow | P2 |

## 10. Investor BI (consolidate)

**Owner role:** `super_admin`

> Move `InvestorBIPage` content into admin

| ID | Yêu cầu | Priority |
|---|---|---|
| BI-01 | Pitch-ready dashboard (clean view, exportable) | P1 |
| BI-02 | Monthly investor report generator | P2 |
| BI-03 | Shareable token link for investor (read-only, 7d expire) | P2 |
| BI-04 | Cap table snapshot (manual) | P2 |

## 11. Database considerations

- Hầu hết module **không cần bảng mới** — đã có sẵn từ migrations gốc
- Cần thêm:
  - `consent_log` (LG-02)
  - `points_rules`, `points_grants` (PT-01, PT-02)
  - `referee_specializations` view (đã có)
- Mọi action mutate → `admin_log_action(...)` mandatory

## 12. Success metrics

- 100% tournament/event cancel có mass refund triggered
- Referee certification action có audit log đầy đủ
- Store/marketplace listing time-to-moderate < 24h
- Legal docs version tracking 100%
- Points manual grant < 100/tháng (giảm dần khi rules tự động hóa)

## 13. Out of scope (V1)

- AI content curation cho Discover
- Auto-moderation Health Hub
- Predictive referee assignment
- Investor portal tách riêng
