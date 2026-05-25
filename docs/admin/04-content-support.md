# PRD 04 — Content Moderation, Support & Platform Ops

**Scope:** Reports inbox, broadcasts, banners, feature flags, impersonation, audit log viewer, platform settings.
**Roles:** `moderator` (reports), `support` (broadcasts, banners, impersonate), `super_admin` (flags, settings).

---

## 1. Goals

- Xử lý nội dung user-generated (groups, posts, tournaments, marketplace listings)
- Công cụ vận hành: broadcast noti, banner, feature flag, impersonate (debug)
- Audit log viewer minh bạch cho mọi action
- Consolidate `AdminPlatformSettingsPage` vào module này

## 2. User stories

- *Là moderator*, tôi xử lý reports từ user nhanh chóng, theo SLA
- *Là support*, tôi gửi noti tới segment user (vd "tất cả player HCM")
- *Là support*, tôi impersonate user để debug bug (read-only)
- *Là super admin*, tôi bật/tắt feature theo % rollout
- *Là super admin*, tôi review audit log để truy vết

## 3. Functional Requirements

### 3.1 Reports inbox

| ID | Yêu cầu | Priority |
|---|---|---|
| CS-01 | List open reports: filter category/target_type/age, sort by created_at | P0 |
| CS-02 | Report detail: target link, evidence, communication, reporter info | P0 |
| CS-03 | Assign report to mod | P0 |
| CS-04 | Resolve: action (warn, hide content, suspend user, dismiss) + resolution note | P0 |
| CS-05 | SLA tracking: alert nếu open > 24h | P1 |
| CS-06 | Bulk dismiss spam reports (mod) | P2 |

### 3.2 Broadcasts

| ID | Yêu cầu | Priority |
|---|---|---|
| BR-01 | Compose: title/body EN+VI, channel (push/email/in_app/all) | P0 |
| BR-02 | Segment builder: role + region + venue + group + activity filter | P0 |
| BR-03 | Preview (render trên mock device) | P0 |
| BR-04 | Schedule (datetime picker) | P0 |
| BR-05 | Test mode: send to self before broadcast | P0 |
| BR-06 | Send all-users → 2-step confirm + super_admin approval | P0 |
| BR-07 | Async queue, track sent_count progress | P0 |
| BR-08 | History + re-send | P1 |
| BR-09 | Rate limit: max 1 all-users broadcast/day | P0 |
| BR-10 | Per-user mute respect (don't send if user muted notifications) | P0 |

### 3.3 Banners

| ID | Yêu cầu | Priority |
|---|---|---|
| BN-01 | CRUD banner: title/body EN+VI, image, link, placement | P0 |
| BN-02 | Placements: home_top / booking_page / tournament_list / marketplace / health_hub / wallet | P0 |
| BN-03 | Schedule (starts_at / ends_at), priority | P0 |
| BN-04 | Segment targeting (optional) | P1 |
| BN-05 | Preview trên mock device theo placement | P1 |
| BN-06 | A/B test 2 variants (cùng placement) | P2 |

### 3.4 Feature flags

| ID | Yêu cầu | Priority |
|---|---|---|
| FF-01 | List all flags, search, filter enabled/disabled | P0 |
| FF-02 | CRUD flag: key, enabled, rollout %, segment | P0 |
| FF-03 | Toggle on/off với 2-step confirm cho production flag | P0 |
| FF-04 | History per flag (who changed when, what value) | P0 |
| FF-05 | Test flag in admin UI (preview hiệu ứng) | P2 |

### 3.5 Impersonation

| ID | Yêu cầu | Priority |
|---|---|---|
| IM-01 | Start session: chọn user + reason mandatory | P0 |
| IM-02 | Read-only enforcement: block mọi mutation từ session | P0 |
| IM-03 | Banner đỏ luôn hiển thị "Impersonating [user]" | P0 |
| IM-04 | Auto-end sau 30 phút | P0 |
| IM-05 | Manual end | P0 |
| IM-06 | Mọi page view log vào `impersonation_sessions` + audit | P0 |
| IM-07 | Notify user của họ rằng admin đã impersonate (post-hoc email) | P1 |

### 3.6 Audit log viewer

| ID | Yêu cầu | Priority |
|---|---|---|
| AU-01 | List logs: filter actor/action/target_type/date range | P0 |
| AU-02 | Detail: expand JSON diff (before/after) | P0 |
| AU-03 | Search by target_id (vd "tất cả action lên booking X") | P0 |
| AU-04 | Export CSV | P1 |
| AU-05 | Retention: giữ 24 tháng, sau đó archive | P1 |

### 3.7 Platform settings (consolidate)

| ID | Yêu cầu | Priority |
|---|---|---|
| PS-01 | Default commission rate (super_admin) | P0 |
| PS-02 | Default platform fees per source | P0 |
| PS-03 | VietQR / PayOS gateway config | P0 |
| PS-04 | Email / SMS / push templates editor | P1 |
| PS-05 | Maintenance mode toggle (kill switch) | P0 |
| PS-06 | Legal docs (TOS, privacy) editor | P1 |

## 4. Security

- Impersonation: tuyệt đối block mutation (middleware enforce)
- Broadcast all-users: super_admin approval + 2-step confirm
- Feature flag change: audit log mandatory
- Maintenance mode toggle: yêu cầu 2 super_admin approve

## 5. Out of scope (V1)

- AI auto-moderation
- Sentiment analysis trên reports
- A/B test result engine
- Multi-language template editor

## 6. Success metrics

- Median time-to-resolve report < 24h
- 100% impersonation có reason hợp lệ
- Broadcast delivery rate > 95%
- 0 mutation action từ impersonation session
- Audit log 100% coverage (verify hàng quý)
