# PRD 03 — Analytics Dashboard

**Scope:** KPIs, charts, funnel, cohort, top lists, BI consolidation (gộp `InvestorBIPage`, `AdminStatsPage`).
**Roles:** All admins read; `analyst` + `super_admin` configure.

---

## 1. Goals

- Founder/ops xem sức khỏe platform real-time (trễ tối đa 1h)
- Hỗ trợ quyết định kinh doanh: GMV, growth, retention, top venues
- Consolidate `InvestorBIPage` + `AdminStatsPage` vào 1 dashboard duy nhất

## 2. User stories

- *Là founder*, tôi xem GMV/DAU/booking/new users hàng ngày để theo dõi tăng trưởng
- *Là ops*, tôi xem top venues/groups/tournaments để tập trung chăm sóc
- *Là finance*, tôi xem commission collected forecast doanh thu
- *Là analyst*, tôi xem cohort retention để đánh giá product-market fit
- *Là investor* (qua founder), tôi xem dashboard pitch-ready

## 3. Functional Requirements

### 3.1 Overview KPIs

| ID | Yêu cầu | Priority |
|---|---|---|
| AN-01 | KPI cards: DAU, WAU, MAU, GMV, Bookings, New users, Active venues, Commission | P0 |
| AN-02 | So sánh kỳ trước (% delta + arrow up/down) | P0 |
| AN-03 | Date range: Today / 7d / 30d / 90d / YTD / custom | P0 |
| AN-04 | Region filter: HCM / HN / DN / All | P1 |

### 3.2 Charts

| ID | Yêu cầu | Priority |
|---|---|---|
| AN-05 | GMV line chart (daily/weekly toggle) | P0 |
| AN-06 | Bookings bar chart (daily) | P0 |
| AN-07 | Booking funnel: view → cart → pay → confirm (with conversion %) | P0 |
| AN-08 | Signup chart + funnel: signup → onboarded → first booking | P0 |
| AN-09 | Revenue breakdown by source (court bookings / tickets / store / fees) | P1 |
| AN-10 | Geographic heatmap (booking density theo quận/tỉnh) | P2 |

### 3.3 Cohort & Retention

| ID | Yêu cầu | Priority |
|---|---|---|
| AN-11 | Signup cohort matrix: M1, M2, M3, M6 retention | P1 |
| AN-12 | Booker cohort: tỷ lệ user quay lại đặt sân lần 2, 3, 4+ | P1 |
| AN-13 | Churn analysis: user inactive > 30/60/90 ngày | P2 |

### 3.4 Top lists

| ID | Yêu cầu | Priority |
|---|---|---|
| AN-14 | Top 20 venues by GMV (filter period) | P0 |
| AN-15 | Top 20 groups by activity (posts + members + events) | P0 |
| AN-16 | Top 20 tournaments by participants + GMV | P0 |
| AN-17 | Top 20 hosts by ticket revenue | P1 |
| AN-18 | Top 20 referees by gigs + rating | P1 |
| AN-19 | Top stores by GMV | P1 |

### 3.5 Health metrics

| ID | Yêu cầu | Priority |
|---|---|---|
| AN-20 | Payment success rate (24h, 7d, 30d) | P0 |
| AN-21 | Refund rate (% of GMV) | P0 |
| AN-22 | Dispute rate per 1000 bookings | P0 |
| AN-23 | Avg time-to-confirm booking | P1 |
| AN-24 | NPS / app rating (manual input or 3rd party) | P2 |

### 3.6 Operational alerts

| ID | Yêu cầu | Priority |
|---|---|---|
| AN-25 | Alert banner: reconciliation discrepancy, dispute spike, payment fail spike | P0 |
| AN-26 | Pending action counters: venues pending, reports open, refunds pending, disputes open | P0 |
| AN-27 | Configurable alert thresholds (super_admin) | P2 |

### 3.7 Export & share

| ID | Yêu cầu | Priority |
|---|---|---|
| AN-28 | Export CSV cho mọi widget | P0 |
| AN-29 | Export PNG dashboard cho slide deck | P1 |
| AN-30 | Shareable read-only link cho investor (token-based, expire 7d) | P2 |

## 4. Tech Implementation

- **Supabase materialized views** cho metrics nặng, refresh mỗi 1h qua `pg_cron`
- Daily aggregation tables: `daily_gmv`, `daily_bookings`, `daily_users`
- KPI cards query view, không query raw table
- Charts dùng `recharts`
- Cache phía client với TanStack Query (staleTime 5 phút)
- Không real-time (chấp nhận trễ 1h) để giảm DB load

## 5. Out of scope (V1)

- Custom dashboard builder
- Drill-down vô hạn
- Predictive analytics (forecast GMV ML)
- Real-time streaming dashboard
- A/B test result viewer

## 6. Success metrics

- Dashboard load < 2s P95
- Materialized view refresh < 5 phút
- 0 query trực tiếp raw table từ frontend
- Founder check dashboard ≥ 1 lần/ngày (usage tracking)
