# MatchUp Admin — Wireframes (ASCII)

> Low-fi wireframes cho mọi screen chính. Sẽ chuyển sang Figma sau khi spec approved.

---

## 1. Global Layout (mọi screen)

```
┌───────────────────────────────────────────────────────────────────────────┐
│ [MatchUp Admin]   🔍 Search anywhere (⌘K)      🌐 EN│VI   🔔 (3)  👤 Jun ▾│
├──────────────┬────────────────────────────────────────────────────────────┤
│              │  Home › Section › Page                                     │
│ 📊 Dashboard │ ┌────────────────────────────────────────────────────────┐│
│ ──────────── │ │                                                        ││
│ 👥 Users     │ │                                                        ││
│ 🏟 Venues    │ │             MAIN CONTENT AREA                          ││
│ 📅 Bookings  │ │                                                        ││
│ 🏆 Tourn.    │ │                                                        ││
│ 👥 Groups    │ │                                                        ││
│ 🛒 Market.   │ │                                                        ││
│ 🎫 Events    │ │                                                        ││
│ 🦓 Referees  │ │                                                        ││
│ ❤  Health    │ │                                                        ││
│ ──────────── │ │                                                        ││
│ 💰 Payments  │ │                                                        ││
│ 🔁 Refunds   │ │                                                        ││
│ ⚖  Disputes  │ │                                                        ││
│ 📒 Recon.    │ │                                                        ││
│ ──────────── │ │                                                        ││
│ 🚩 Reports   │ │                                                        ││
│ 📣 Broadcast │ │                                                        ││
│ 🎨 Banners   │ │                                                        ││
│ 🚩 Flags     │ │                                                        ││
│ 👁 Imperson. │ │                                                        ││
│ 📜 Audit log │ │                                                        ││
│ ⚙ Settings   │ │                                                        ││
│              │ └────────────────────────────────────────────────────────┘│
└──────────────┴────────────────────────────────────────────────────────────┘
```

- Sidebar có 4 nhóm: **Operate / Business / Money / Platform**
- Topbar: cmd+K global search, language toggle, alert center, user menu (logout, 2FA)
- Mọi page có breadcrumb + action bar phải

---

## 2. Dashboard (Home)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Dashboard                              [Last 30d ▾] [Region: All ▾] [⬇]│
├─────────────────────────────────────────────────────────────────────────┤
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐      │
│ │ DAU    │ │ GMV    │ │Bookings│ │NewUsers│ │ Active │ │Commiss.│      │
│ │ 1,247  │ │ ₫45.2M │ │  312   │ │   28   │ │ Venues │ │ ₫2.3M  │      │
│ │ ▲ 12%  │ │ ▲ 8%   │ │ ▼ 3%   │ │ ▲ 22%  │ │  87    │ │ ▲ 8%   │      │
│ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘      │
│                                                                         │
│ ┌─────────────────────────────────┐ ┌─────────────────────────────────┐│
│ │ GMV 30 ngày qua          [line] │ │ Booking funnel                  ││
│ │      ╱╲    ╱╲╱╲                 │ │ View    ████████████ 12,400     ││
│ │   ╱╲╱  ╲╱╲╱    ╲                │ │ Cart    ██████ 3,200    (26%)   ││
│ │  ╱                              │ │ Paid    ████ 1,800      (56%)   ││
│ │ ────────────────────────────    │ │ Confirm ███ 1,650       (92%)   ││
│ └─────────────────────────────────┘ └─────────────────────────────────┘│
│                                                                         │
│ ┌─────────────────────────────────┐ ┌─────────────────────────────────┐│
│ │ ⚠ Cần xử lý                     │ │ Top venues (GMV tháng)          ││
│ │ • 7 venues pending duyệt        │ │ 1. Sân Tao Đàn          ₫8.2M  ││
│ │ • 3 disputes mở (1 quá SLA)     │ │ 2. CLB Phú Thọ          ₫6.1M  ││
│ │ • 12 reports chưa assign        │ │ 3. Sân Hoa Lư           ₫5.4M  ││
│ │ • 2 refund pending CK           │ │ 4. Bambu Center         ₫4.8M  ││
│ │ • 1 recon discrepancy hôm qua   │ │ → Xem tất cả                    ││
│ └─────────────────────────────────┘ └─────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Users List

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Users                                            [+ Invite admin user]  │
├─────────────────────────────────────────────────────────────────────────┤
│ 🔍 Search name/phone/email…  [Role▾] [Status▾] [Region▾] [Joined▾]     │
├─────────────────────────────────────────────────────────────────────────┤
│ ☐  Avatar  Name              Phone        Role     Status   Joined   ⋮ │
│ ☐  🧑     Nguyễn Văn A      090*****12   Player   Active   05/12   ⋮ │
│ ☐  🧑     Trần Thị B        093*****45   Owner    ⚠Susp.   04/28   ⋮ │
│ ☐  🧑     Lê Văn C          097*****88   Player   Active   04/15   ⋮ │
│ ☐  🧑     Phạm D            035*****11   Referee  Active   03/22   ⋮ │
│ …                                                                       │
├─────────────────────────────────────────────────────────────────────────┤
│ Bulk: [Suspend] [Unsuspend] [Export CSV]  ◀ 1 2 3 … 47 ▶   (1,247)    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 4. User Detail

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ← Users / Nguyễn Văn A                          [Suspend] [Impersonate] │
├─────────────────────────────────────────────────────────────────────────┤
│ ┌──────┐  Nguyễn Văn A                                                  │
│ │ 🧑   │  📱 090***12 [reveal]  ✉ a@email.com [reveal]                  │
│ │      │  Joined 2025-12-05 · HCM · Role: Player · Wallet: ₫120k        │
│ └──────┘  Tags: [Verified] [VIP]   Reports against: 0   Disputes: 0     │
├─────────────────────────────────────────────────────────────────────────┤
│ [Overview] [Bookings] [Payments] [Tickets] [Groups] [Reports] [Devices] │
│ [Activity log]                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│  Last 30d: 12 bookings · ₫2.4M spent · 0 disputes · 1 report given      │
│                                                                         │
│  ── Recent activity ──                                                  │
│  • 2026-05-24 14:22  Booking #B-4521 confirmed (Sân Tao Đàn)            │
│  • 2026-05-23 09:10  Payment ₫180k success                              │
│  • 2026-05-20 18:00  Joined group "Cầu lông Q1"                         │
│  …                                                                      │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Venue Approval Queue

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Venues / Pending approval (7)             [Approved] [Rejected] [All]   │
├─────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ 🏟 Sân Cầu Lông ABC                          Submitted 2 days ago   │ │
│ │ Owner: Trần Văn X (097***45)   HCM, Q.Tân Bình                      │ │
│ │ 📄 3 documents: [Business license] [Owner ID] [Contract]            │ │
│ │ 📍 [View map]  📞 [Call]  ✉ [Email]                                 │ │
│ │ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                  │ │
│ │ │ [doc1.jpg]   │ │ [doc2.jpg]   │ │ [doc3.pdf]   │                  │ │
│ │ └──────────────┘ └──────────────┘ └──────────────┘                  │ │
│ │ Internal notes: ____________________________                        │ │
│ │ Commission: [5.0]%       [Reject ▾]   [Approve with above setting]  │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Transactions List

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Payments                                                  [Export CSV]  │
├─────────────────────────────────────────────────────────────────────────┤
│ 🔍 Search ref/phone/booking…  [Source▾] [Status▾] [Date] [Amount▾]      │
├─────────────────────────────────────────────────────────────────────────┤
│ Time         Ref         Source       User      Amount     Status    ⋮  │
│ 05-25 14:22 VQR-A8X12   court_book.  A (090*12) ₫180,000  ✓Paid    ⋮ │
│ 05-25 14:10 VQR-B7Y91   paid_ticket  B (093*45) ₫350,000  ✓Paid    ⋮ │
│ 05-25 13:55 VQR-C2Z34   store_order  C (097*88) ₫2,400,000⏳Pending ⋮ │
│ 05-25 13:30 VQR-D5W67   wallet_topup A (090*12) ₫500,000  ⚠Failed  ⋮ │
│ …                                                                       │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Refund Flow (modal)

```
                  ┌─────────────────────────────────────────┐
                  │ Create refund — Booking #B-4521      ✕  │
                  ├─────────────────────────────────────────┤
                  │ Payment: ₫180,000 (VietQR · 2026-05-23) │
                  │ Player:  Nguyễn Văn A (090***12)        │
                  │ Venue:   Sân Tao Đàn                    │
                  │                                         │
                  │ Refund type: ⦿ Bank transfer  ○ Wallet  │
                  │ Amount:     [180,000        ] VND       │
                  │             ⦿ Full  ○ Partial           │
                  │                                         │
                  │ Reason: [Cancel by owner          ▾]    │
                  │ Note:   [________________________]      │
                  │                                         │
                  │ Bank transfer ref: [____________]       │
                  │ (điền sau khi CK tay xong)              │
                  │                                         │
                  │ ⚠ Action sẽ được audit log              │
                  │ ⚠ Amount > 5M → cần 2 approver          │
                  │                                         │
                  │             [Cancel]  [Create refund]   │
                  └─────────────────────────────────────────┘
```

---

## 8. Reports Inbox

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Reports                                          [Open ▾] (12 open)     │
├─────────────────────────────────────────────────────────────────────────┤
│ 🔍 Search…  [Category▾] [Target type▾] [Assigned to▾] [Age▾]            │
├─────────────────────────────────────────────────────────────────────────┤
│ ! Age   Category    Target            Reporter     Assigned       ⋮     │
│ 🔴 3d  fraud       user/Lê Văn C     A (090*12)   Unassigned    ⋮     │
│ 🟡 1d  inapprop.   group/Cầu lông HN B (093*45)   Mod1          ⋮     │
│ 🟢 4h  spam        product/Vợt fake  C (097*88)   Mod2          ⋮     │
│ …                                                                       │
├─────────────────────────────────────────────────────────────────────────┤
│ Bulk: [Assign to ▾] [Dismiss as spam]                                   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Broadcast Composer

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Broadcasts › New                                       [Save draft]     │
├─────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────┐  ┌──────────────────────────────────┐  │
│ │ Channel: ⦿Push ○Email ○In-app│  │  📱 Preview                      │  │
│ │                              │  │  ┌────────────────────────────┐  │  │
│ │ Title (VI):   [_____________]│  │  │ MatchUp                    │  │  │
│ │ Title (EN):   [_____________]│  │  │ Khuyến mãi cuối tuần! 🎉   │  │  │
│ │                              │  │  │ Giảm 20% mọi sân Q1...     │  │  │
│ │ Body (VI):   [______________]│  │  └────────────────────────────┘  │  │
│ │              [______________]│  └──────────────────────────────────┘  │
│ │ Body (EN):   [______________]│                                       │
│ │              [______________]│  ── Segment ──                        │
│ │                              │  Role:    [Player ▾]                  │
│ │ Schedule: ⦿Now ○Later        │  Region:  [HCM ▾]                     │
│ │ [Send test to me] [Send all] │  Venue:   [Any ▾]                     │
│ └─────────────────────────────┘  Active:   [Last 30d ▾]                │
│                                   Estimated reach: ~3,420 users        │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 10. Feature Flags

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Feature flags                                              [+ New flag] │
├─────────────────────────────────────────────────────────────────────────┤
│ Key                       Enabled   Rollout   Segment       Updated  ⋮ │
│ booking_v2_new_flow       ON  ●     100%      all           05-20    ⋮│
│ wallet_topup_payos        ON  ●      50%      role=player   05-18    ⋮│
│ tournament_live_v2        OFF ○       0%      —             05-15    ⋮│
│ health_hub_wearable       ON  ●     100%      region=hcm    05-10    ⋮│
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 11. Audit Log Viewer

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Audit log                                              [Export CSV]     │
├─────────────────────────────────────────────────────────────────────────┤
│ 🔍 [Actor▾] [Action▾] [Target type▾] [Target ID] [Date range]           │
├─────────────────────────────────────────────────────────────────────────┤
│ Time            Actor           Action            Target         IP   ▸ │
│ 05-25 14:22  Jun (super)   venue.approve    venue/abc-123   1.2.3.4 ▸ │
│ 05-25 13:10  Ops1 (ops)    user.suspend     user/c-001      5.6.7.8 ▸ │
│ 05-25 12:55  Fin1 (fin)    refund.create    refund/r-789    1.2.3.4 ▸ │
│ 05-25 11:00  Jun (super)   feature_flag.    flag/payos      1.2.3.4 ▸ │
│              update                                                     │
│ …                                                                       │
│                                                                         │
│ Click row → expand JSON diff (before/after) + reason + UA               │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 12. Tournament Admin

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Tournaments                                          [+ New (admin)]    │
├─────────────────────────────────────────────────────────────────────────┤
│ 🔍 Search…  [Status▾] [Organizer▾] [Sport▾] [Date▾]                     │
├─────────────────────────────────────────────────────────────────────────┤
│ Title              Sport    Status     Organizer    Participants  GMV  ⋮│
│ MatchUp Open 2026  Tennis   Live       Host1        128           ₫45M⋮│
│ Pickleball Cup     Pick.    Scheduled  Host2        64            ₫12M⋮│
│ Badminton Q1       Bad.     Completed  Host3        32            ₫8M ⋮│
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 13. Referee Admin

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Referees                                            [+ Approve pending] │
├─────────────────────────────────────────────────────────────────────────┤
│ 🔍 Search…  [Cert▾] [Sport▾] [Active▾]                                  │
├─────────────────────────────────────────────────────────────────────────┤
│ Name        Cert   Sport      Rating  Gigs  No-show  Earnings   ⋮      │
│ Phạm D      RFC-03 Tennis     4.8⭐  124   2        ₫18.5M     ⋮     │
│ Trần E      RFC-02 Pickleball 4.5⭐  45    0        ₫6.2M      ⋮     │
│ Lê F        RFC-01 Badminton  4.2⭐  12    1        ₫1.8M      ⋮     │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 14. Reconciliation Daily

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Reconciliation                                  [Last 30d ▾] [Export]   │
├─────────────────────────────────────────────────────────────────────────┤
│ Date       Bookings  GMV       Received   Refunds   Commission  Diff   │
│ 05-25      312       ₫45.2M    ₫45.0M     ₫0.2M     ₫2.25M      ✓ 0   │
│ 05-24      289       ₫41.1M    ₫41.1M     ₫0       ₫2.05M      ✓ 0   │
│ 05-23      305       ₫43.5M    ₫43.3M     ₫0.1M    ₫2.17M      ⚠₁₀₀k│
│ 05-22      278       ₫39.8M    ₫39.8M     ₫0       ₫1.99M      ✓ 0   │
│ …                                                                       │
│ Click row with ⚠ → drill-down các giao dịch sai lệch                    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 15. Impersonation Banner (overlay)

```
╔═════════════════════════════════════════════════════════════════════════╗
║ 👁 IMPERSONATING: Nguyễn Văn A (090***12)  · Auto-end in 28:42  [End]  ║
║ Read-only · Reason: "Debug booking issue #4521" · Session #IMP-9921    ║
╚═════════════════════════════════════════════════════════════════════════╝
[ App content render bên dưới — mọi nút mutate disabled ]
```

---

## Notes

- Tất cả tables dùng TanStack Table v8, server-side pagination
- Mọi destructive button (Suspend, Reject, Force-cancel) → modal 2-step confirm
- Mọi list export CSV
- Toast notifications cho mọi action success/error
- Loading skeletons thay vì spinner

---

**Next:** Sau khi approve, convert sang Figma + design system tokens.
