# PRD 01 — User & Venue Moderation

**Scope:** Users, Verification, Friends graph, Venue approval & lifecycle, Venue documents.
**Roles:** `ops_manager`, `super_admin` (write); `analyst`, `support` (read).

---

## 1. Goals

- Ops team xử lý user vi phạm và duyệt venue mới đúng quy trình
- Toàn bộ action có audit log + 2-step confirm cho destructive action
- PII bảo mật, chỉ reveal khi cần và bị log

## 2. User stories

- *Là ops manager*, tôi xem users list filter đa chiều để tìm user vi phạm
- *Là ops manager*, tôi suspend user với reason code + expiry, user nhận noti
- *Là ops manager*, tôi duyệt venue mới (xem giấy tờ, map, gọi owner)
- *Là support*, tôi reveal phone/email user để gọi support (có lý do)
- *Là super admin*, tôi xem ai đã làm gì để truy vết

## 3. Functional Requirements

### 3.1 Users management

| ID | Yêu cầu | Priority |
|---|---|---|
| UM-01 | Users list: search name/phone/email, filter role/status/region/joined date, sort | P0 |
| UM-02 | User detail tabs: Overview / Bookings / Payments / Reports / Devices / Activity log | P0 |
| UM-03 | Suspend user: reason_code + note + expiry optional, gửi noti | P0 |
| UM-04 | Unsuspend: yêu cầu lý do, ghi audit | P0 |
| UM-05 | PII masking mặc định; reveal có log + reason | P0 |
| UM-06 | Bulk suspend (≤50 user) — yêu cầu type "CONFIRM" | P1 |
| UM-07 | Export user list CSV (filter applied) | P1 |
| UM-08 | Verification badge management (manual grant/revoke) | P1 |
| UM-09 | View user's friend graph + favorite partners | P2 |
| UM-10 | Merge duplicate accounts (rare, super_admin only) | P2 |

### 3.2 Venue management

| ID | Yêu cầu | Priority |
|---|---|---|
| VM-01 | Venue approval queue: list pending, sort theo submitted_at | P0 |
| VM-02 | Venue detail review: docs preview (image+PDF inline), map, owner contact | P0 |
| VM-03 | Approve venue: set commission rate (default 5%), notes optional | P0 |
| VM-04 | Reject venue: reason code + note, gửi email cho owner | P0 |
| VM-05 | All venues list: filter status/region/owner | P0 |
| VM-06 | Suspend venue: reason, hủy mọi pending booking, refund auto-trigger | P0 |
| VM-07 | Change commission rate cho venue cụ thể (audit) | P1 |
| VM-08 | Re-verify venue (re-submit docs) | P1 |
| VM-09 | Venue activity log: bookings, revenue, complaints | P1 |
| VM-10 | Transfer venue ownership (rare, super_admin only) | P2 |

## 4. Non-functional

- Pagination server-side (25/50/100 per page)
- Search debounce 300ms, full-text index trên `name`/`phone`/`email`
- Mọi mutation → audit log + toast confirm
- Destructive action (suspend, reject, delete) → modal 2-step xác nhận

## 5. Edge cases

- Suspend user có booking đang active → tự động cancel + refund flow
- Reject venue có booking đã xác nhận → KHÔNG cho phép, yêu cầu cancel bookings trước
- PII reveal mass (>10 user/giờ) → cảnh báo super_admin
- User self-delete request → soft delete + retention 30 ngày

## 6. Database

- `user_suspensions` (đã định nghĩa migration)
- `venue_documents` (đã định nghĩa migration)
- Mở rộng `venues`: `verification_status`, `verified_at`, `verified_by`, `suspended_reason`
- Audit: mọi action gọi `admin_log_action()`

## 7. Out of scope (V1)

- ML auto-detect spam/fraud
- OCR CCCD/giấy phép kinh doanh
- Auto-suspend dựa trên rule engine

## 8. Success metrics

- Median venue approval time < 24h
- 100% suspend action có audit log
- 0 case PII reveal không có reason hợp lệ (audit hàng tháng)
- Time-to-resolve user report < 24h
