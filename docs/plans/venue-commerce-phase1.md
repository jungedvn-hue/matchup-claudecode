# Venue Commercial Sessions + Host Credits — Phase 1 Plan

> Saved 2026-05-27. To be continued next session.

## Locked decisions (từ phiên 2026-05-27)

1. **Role boundary**: `court_owner` tách hẳn với `store_owner`. Catalog dùng bảng riêng `venue_services`, KHÔNG tái dùng `store_products`.
2. **Entity**: Venue-hosted sessions là **session thương mại** tách riêng (`venue_sessions`), KHÔNG phải biến thể của `groups`. Không hiển thị ở Groups tab.
3. **Multi-staff**: Cần ngay Phase 1 (`venue_staff` table với role manager/server).
4. **Cân bằng Court Owner ↔ Social Host**: Cơ chế credit-back + co-host attribution.
   - Credit-back rate: **venue tự set** per session
   - Credits redeem: **chỉ tại venue phát hành** (không cross-venue ở phase 1)
   - Attribution window: **15 hoặc 30 ngày**, venue chọn per session
   - Co-host **không bắt buộc** — venue có thể tạo session không co-host (giữ 100% revenue)
   - **Credits có ngay từ Phase 1** (không defer)

## Scope Phase 1

### ✅ In scope
- `venue_services` catalog độc lập
- `venue_sessions` entity mới
- `venue_staff` multi-staff (manager / server)
- Co-Host invite + attribution window
- Orders + cart + manual status update (no realtime)
- Host credits ledger (accrue on payment + redeem in same venue)
- Payment: Cash + VietQR static (gen QR napas247, player tick "đã chuyển", staff confirm)

### ❌ Defer Phase 2+
- Realtime push + sound alert cho staff
- Cross-venue credit redemption
- Inventory tracking
- Auto-reconcile thanh toán (Casso/MoMo webhook)
- Analytics dashboard cho host
- Refund flow (chỉ cancel khi chưa delivered)
- Push notification

## Schema migration draft

File: `supabase/migrations/20260528000000_venue_commerce.sql`

```sql
-- A. Catalog dịch vụ (độc lập store_products)
create table venue_services (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references venues(id) on delete cascade,
  name text not null,
  description text,
  category text not null, -- 'drink' | 'food' | 'rental' | 'utility' | 'other'
  price numeric(10,0) not null,
  image_url text,
  deliverable boolean not null default true,
  is_published boolean not null default true,
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- B. Multi-staff
create table venue_staff (
  venue_id uuid not null references venues(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('manager','server')),
  added_at timestamptz default now(),
  primary key (venue_id, user_id)
);

-- C. Commercial sessions
create table venue_sessions (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references venues(id) on delete cascade,
  title text not null,
  court_ref text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  cohost_user_id uuid references auth.users(id),
  credit_back_rate numeric(4,3) not null default 0,
  attribution_days int not null default 15 check (attribution_days in (15,30)),
  status text not null default 'open',
  created_by uuid not null references auth.users(id),
  created_at timestamptz default now()
);

-- D. Member + attribution
create table venue_session_members (
  session_id uuid not null references venue_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz default now(),
  attribution_until timestamptz not null,
  primary key (session_id, user_id)
);

-- E. Orders
create table venue_orders (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references venues(id),
  session_id uuid references venue_sessions(id),
  player_id uuid not null references auth.users(id),
  court_ref text,
  attributed_host_id uuid references auth.users(id),
  status text not null default 'pending', -- pending|confirmed|preparing|delivered|cancelled
  payment_method text not null check (payment_method in ('cash','qr')),
  payment_status text not null default 'unpaid', -- unpaid|paid
  subtotal numeric(10,0) not null,
  total numeric(10,0) not null,
  note text,
  created_at timestamptz default now(),
  delivered_at timestamptz
);

create table venue_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references venue_orders(id) on delete cascade,
  service_id uuid not null references venue_services(id),
  qty int not null check (qty > 0),
  unit_price numeric(10,0) not null,
  subtotal numeric(10,0) not null
);

-- F. Credits ledger (append-only)
create table host_credits_ledger (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references auth.users(id),
  venue_id uuid not null references venues(id),
  order_id uuid references venue_orders(id),
  type text not null check (type in ('earn','redeem','adjust')),
  amount numeric(10,0) not null,
  balance_after numeric(10,0) not null,
  note text,
  created_at timestamptz default now()
);

create view host_credits_balance as
select host_id, venue_id, sum(amount) as balance
from host_credits_ledger
group by host_id, venue_id;
```

### Trigger: auto-accrue credits
Khi `venue_orders.payment_status` flip → `paid` AND `attributed_host_id IS NOT NULL`:
- Insert row vào `host_credits_ledger` (type=`earn`, amount = `total * session.credit_back_rate`)

### Attribution snapshot
Khi tạo order: nếu player có row trong `venue_session_members` với `attribution_until > now()` và session có co-host → set `attributed_host_id = session.cohost_user_id`.

## Anti-conflict rules

1. **Attribution window khóa**: orders trong window vẫn credit cho host gốc, dù player join session khác cùng venue.
2. **Transparency**: host xem ledger live; venue thấy outstanding credits.
3. **Public rate**: rate hiện công khai trước khi co-host accept, không sửa được sau accept.
4. **Dispute**: master review nếu venue bypass attribution.

## Service layer

### Hooks (apps/web/src/hooks/)
- `useVenueServices(venueId)` — CRUD catalog
- `useVenueStaff(venueId)` — list/add/remove
- `useVenueSessions(venueId)` — CRUD sessions
- `useSessionJoin(sessionId)` — player join → tạo member row
- `useVenueOrders(filter)` — list orders (player own / venue staff all)
- `useCart(venueId)` — local state + checkout
- `useHostCredits(hostId, venueId?)` — balance + ledger

### Edge function
- `payment-confirm` — venue staff bấm "Đã nhận" → flip + trigger credits

## UI breakdown

### Player side
| Screen | Path | Notes |
|---|---|---|
| Venue session detail | `/v/:venueId/s/:sessionId` | Banner co-host, list members, Join, tab Gọi món |
| Service menu | tab in session | Filter category, qty stepper, add to cart |
| Cart drawer | overlay | Subtotal, court_ref input, note, checkout |
| Checkout | sheet | Cash / QR (gen VietQR napas247) |
| My orders | `/my-orders` | History + status |

### Venue staff side
| Screen | Path | Notes |
|---|---|---|
| Venue dashboard | `/my-venue` | Tiles: Services, Sessions, Orders, Staff, Credits Payable |
| Services CRUD | `/my-venue/services` | Mirror StoreProductsPage |
| Staff manage | `/my-venue/staff` | Invite by email, set role |
| Session manage | `/my-venue/sessions` | CRUD, invite co-host search |
| Orders live | `/my-venue/orders` | Filter session/court/status, action |
| Credits payable | `/my-venue/credits` | Outstanding credits per host |

### Social Host side
| Screen | Path | Notes |
|---|---|---|
| Co-host invitations | `/host/invites` | Pending invites, accept/decline |
| Host credits | `/host/credits` | Balance per venue, ledger, redeem |

## Open questions (cần confirm phiên sau)

1. **`venues` table đã tồn tại chưa?** Hay dùng `courts`? → grep schema trước.
2. **Court owner dashboard `/my-venue`**: đã có chưa hay build mới?
3. **VietQR static**: cần thêm `venues.bank_account` (account_no, bank_code, account_name)?
4. **Ship strategy**:
   - (a) Full Phase 1 trong 1 PR lớn (2-3 buổi build), hay
   - (b) Chia 3 PR nhỏ: (1) schema + services CRUD, (2) sessions + orders, (3) co-host + credits
5. **Cohost selection UX**: venue search host theo tên/email? Hay invite-by-link?

## Estimate
- ~10 hooks mới, ~12 màn hình mới, 1 migration lớn, 1 edge function, ~60 i18n keys × 2 locales
- **2-3 buổi build** (4-6h/buổi)
