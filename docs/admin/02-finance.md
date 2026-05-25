# PRD 02 — Finance: Payment, Booking, Wallet Oversight

**Scope:** Tất cả dòng tiền platform — court bookings, paid tickets, store orders, wallet topup, referee earnings, tournament fees, commission, refunds, disputes, reconciliation.
**Roles:** `finance`, `super_admin` (write); `ops_manager`, `analyst` (read).

---

## 1. Goals

- Finance team kiểm soát mọi giao dịch (VietQR + PayOS + Wallet) tập trung
- Refund workflow chuẩn (manual VietQR + 2-step approval cho > 5M)
- Reconciliation hàng ngày tự động phát hiện sai lệch
- Dispute lifecycle rõ ràng giữa player ↔ owner/host/referee

## 2. User stories

- *Là finance*, tôi xem mọi giao dịch với filter status/date/source để theo dõi
- *Là finance*, tôi tạo refund cho user khi owner hủy sân, gán bank_ref sau khi CK
- *Là finance*, tôi đối soát tổng tiền thực nhận vs revenue confirmed mỗi ngày
- *Là finance*, tôi xem commission tổng/theo venue/theo tháng để forecast
- *Là ops*, tôi xử lý dispute và gắn refund nếu cần

## 3. Functional Requirements

### 3.1 Transactions oversight

| ID | Yêu cầu | Priority |
|---|---|---|
| FN-01 | Unified transactions list (bookings + tickets + orders + topups + tournament_fees) | P0 |
| FN-02 | Filter: source_type, status, date range, venue/store/host, amount range | P0 |
| FN-03 | Transaction detail: gateway ref, timeline, linked entity, actor | P0 |
| FN-04 | Search by VietQR ref / PayOS ref / phone / booking code | P0 |
| FN-05 | Export CSV (filter applied) | P0 |

### 3.2 Refund workflow

| ID | Yêu cầu | Priority |
|---|---|---|
| RF-01 | Create refund: full/partial, reason_code, idempotency_key auto | P0 |
| RF-02 | 2-step: (1) finance create pending, (2) sau CK tay điền `bank_transfer_ref` → mark `transferred` | P0 |
| RF-03 | Approval cần 2 người nếu amount > 5,000,000 VND | P0 |
| RF-04 | Auto-trigger refund khi venue suspend / dispute resolved_player | P1 |
| RF-05 | Refund > original payment → block UI + DB constraint | P0 |
| RF-06 | Gửi noti cho player + owner khi refund transferred | P0 |
| RF-07 | Wallet refund (instant): credit lại wallet thay vì CK bank | P1 |
| RF-08 | Refund cancellation (trước khi transferred) | P1 |

### 3.3 Disputes

| ID | Yêu cầu | Priority |
|---|---|---|
| DP-01 | Disputes inbox: filter status/category/against_party | P0 |
| DP-02 | Dispute detail: source link, evidence, communication history | P0 |
| DP-03 | Resolve: chọn winner (player/owner/split/dismiss), gắn refund nếu cần | P0 |
| DP-04 | Assign dispute cho ops member | P0 |
| DP-05 | SLA tracking: cảnh báo nếu open > 48h | P1 |
| DP-06 | Player/owner thấy update real-time qua notification | P1 |

### 3.4 Reconciliation

| ID | Yêu cầu | Priority |
|---|---|---|
| RC-01 | Daily auto-job 02:00 sinh `reconciliation_daily` record | P0 |
| RC-02 | Compare: payments_received vs (bookings_confirmed + tickets_sold + orders_paid) | P0 |
| RC-03 | Alert nếu `discrepancy != 0` (Slack + email) | P0 |
| RC-04 | Manual trigger reconciliation | P1 |
| RC-05 | Per-venue/per-host reconciliation report | P1 |
| RC-06 | Monthly P&L statement (commission, refund, gross/net GMV) | P1 |

### 3.5 Commission & payout

| ID | Yêu cầu | Priority |
|---|---|---|
| CO-01 | View commission collected per venue/per period | P0 |
| CO-02 | Change platform default commission (super_admin) | P0 |
| CO-03 | Override commission per venue (audit) | P0 |
| CO-04 | Payout to owner: scheduled monthly transfer report | P1 |
| CO-05 | Referee earnings payout report | P1 |

### 3.6 Wallet & Topup

| ID | Yêu cầu | Priority |
|---|---|---|
| WL-01 | View user wallet balance + transaction history | P0 |
| WL-02 | Manual credit/debit wallet (super_admin, audit, reason mandatory) | P1 |
| WL-03 | Topup oversight: failed topups, stuck pending | P0 |
| WL-04 | Wallet refund vs bank refund toggle in refund flow | P1 |

## 4. Edge cases

- VietQR webhook đến trễ (T+1) → reconciliation tolerate, không alarm sai
- Double payment (user CK 2 lần) → auto-detect, tạo refund pending
- Refund đã transferred nhưng user khiếu nại không nhận → dispute mới riêng
- Topup pending > 24h → auto-cancel + email user
- Wallet balance âm → block, gửi alert
- Commission rate change giữa kỳ → áp dụng từ booking sau effective_at

## 5. Database

- `refunds`, `disputes`, `reconciliation_daily` (đã định nghĩa migration)
- Reuse `payments`, `court_bookings`, `paid_tickets`, `wallet_*` (đã tồn tại)
- Mở rộng future: `commission_overrides` (per-venue rates with history)

## 6. Security

- Mọi action mutate dòng tiền → audit log mandatory
- Refund > 5M → require second approver, ghi cả 2 actor
- Bank ref unique → tránh double-entry
- Idempotency key UUID v4

## 7. Out of scope (V1)

- Auto-refund qua gateway VietQR API
- Multi-currency
- Tự động payout cho owner qua bank API
- Tax invoice generation

## 8. Success metrics

- 100% refund có idempotency_key + audit log
- Daily reconciliation discrepancy = 0 trong 95% ngày
- Median time-to-resolve dispute < 48h
- 0 case double refund
- Refund > 5M luôn có 2 approver (audit verify)
