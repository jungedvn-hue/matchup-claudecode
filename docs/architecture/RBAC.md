# RBAC — Role-Based Access Control

Tài liệu thiết kế hệ thống phân quyền cho MatchUpVN. Phục vụ scale lên ~10k user, 50% MAU, với mô hình "Apply → Master approve" cho role nâng cao.

## 1. Mục tiêu

- Master user (admin) toàn quyền, vận hành approve role + ban user
- User mới mặc định là `player` — tham gia free
- Role nâng cao (`host`, `court_owner`, `store_owner`) phải apply, master review thủ công → tránh spam và đảm bảo chất lượng
- Tính năng tương ứng từng role bị **lock** đến khi role active
- Soft revoke: role bị thu hồi → chặn tạo mới, giữ dữ liệu cũ
- Audit trail: mọi thay đổi role có log (granted_by, granted_at, revoked_at)

## 2. Roles

| Role | Cách có | Quyền chính | Tính năng unlock |
|---|---|---|---|
| `player` | Auto khi signup | Tham gia giải, log match, profile, theo dõi player khác | Mặc định |
| `host` | Apply → master approve | Tạo + quản lý tournament, mời referee, xem stats giải của mình | Tournament Manager, Create Tournament |
| `court_owner` | Apply → master approve | List sân, quản lý booking, set giá, xem doanh thu | (Tương lai) Court listing, booking management |
| `store_owner` | Apply → master approve | Đăng sản phẩm, quản lý đơn hàng | (Tương lai) Store, products, orders |
| `master` | Hardcode seed, không apply được | Toàn quyền: review applications, đổi role bất kỳ user, ban, sửa mọi tournament | Admin Panel `/admin/*` |

**Multi-role:** 1 user có thể nhiều role cùng lúc (vd Player + Host). UI hiển thị tab/feature theo union các role active.

**Chỉ định master:** seed cho `jun.gedvn@gmail.com` trong migration. Không có flow public để gán master.

## 3. Application Workflow

```
User → Settings → Role Settings
  ├─ Tick "Player"           → save trực tiếp DB (auto-grant)
  └─ Tick role nâng cao      → mở dialog Apply Form
                                  ├─ Reason (text)
                                  ├─ Business info (jsonb: tax ID, address...)
                                  └─ Submit → INSERT role_applications (status='pending')

Master → /admin/applications
  ├─ Approve  → trigger INSERT vào user_roles (active)
  └─ Reject   → status='rejected' + reviewer_note

User được approve   → tính năng unlock ngay (dùng realtime hoặc fetch lại trên next nav)
User bị reject      → có thể tạo application mới sau X ngày (chưa có cooldown — sẽ thêm khi cần)
```

**Trạng thái pending:** UI hiển thị badge "Đang xét duyệt", nút role tương ứng vẫn bị lock.

**Re-apply:** UNIQUE constraint `(user_id, requested_role, status='pending')` ngăn submit trùng. Sau khi rejected, user submit application mới (status mới = pending → application cũ vẫn ở rejected).

## 4. Schema

### Enum + tables

```sql
CREATE TYPE app_role AS ENUM ('master', 'player', 'host', 'court_owner', 'store_owner');
CREATE TYPE application_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE user_roles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        app_role NOT NULL,
  granted_by  uuid REFERENCES auth.users(id),     -- master/system
  granted_at  timestamptz NOT NULL DEFAULT now(),
  revoked_at  timestamptz,                        -- NULL = active
  revoked_by  uuid REFERENCES auth.users(id),
  UNIQUE(user_id, role)
);
CREATE INDEX idx_user_roles_user_active ON user_roles(user_id) WHERE revoked_at IS NULL;

CREATE TABLE role_applications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_role  app_role NOT NULL,
  status          application_status NOT NULL DEFAULT 'pending',
  reason          text,
  business_info   jsonb,
  reviewed_by     uuid REFERENCES auth.users(id),
  reviewed_at     timestamptz,
  reviewer_note   text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
-- Mỗi user chỉ có 1 application 'pending' cho mỗi role
CREATE UNIQUE INDEX uniq_pending_application
  ON role_applications(user_id, requested_role)
  WHERE status = 'pending';
```

### Helper functions (SECURITY DEFINER)

```sql
-- Check user có role active không
CREATE FUNCTION has_role(_user_id uuid, _role app_role)
  RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
  AS $$
    SELECT EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = _user_id AND role = _role AND revoked_at IS NULL
    );
  $$;

-- Shortcut cho RLS
CREATE FUNCTION current_user_is_master() RETURNS boolean
  LANGUAGE sql STABLE AS $$ SELECT has_role(auth.uid(), 'master'); $$;
```

### Auto-grant player + seed master

```sql
-- Mở rộng handle_new_user trigger: auto-grant 'player'
-- (sửa file 20260506100000_handle_new_user.sql hoặc tạo migration mới)
INSERT INTO public.user_roles (user_id, role, granted_by) VALUES (NEW.id, 'player', NULL);

-- Seed master cho jun.gedvn@gmail.com
INSERT INTO user_roles (user_id, role, granted_by)
SELECT id, 'master', NULL FROM auth.users WHERE email = 'jun.gedvn@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;
```

### Approval trigger

```sql
-- Khi role_applications chuyển sang 'approved', auto INSERT vào user_roles
CREATE FUNCTION on_application_approved() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    INSERT INTO user_roles (user_id, role, granted_by)
    VALUES (NEW.user_id, NEW.requested_role, NEW.reviewed_by)
    ON CONFLICT (user_id, role)
    DO UPDATE SET revoked_at = NULL, revoked_by = NULL;  -- re-activate nếu bị revoke trước đó
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_application_approved
  AFTER UPDATE ON role_applications
  FOR EACH ROW EXECUTE FUNCTION on_application_approved();
```

## 5. RLS Policies

### user_roles

```sql
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- User đọc role của chính mình
CREATE POLICY "user_read_own_roles" ON user_roles
  FOR SELECT USING (user_id = auth.uid());

-- Master toàn quyền
CREATE POLICY "master_all_roles" ON user_roles
  FOR ALL USING (current_user_is_master())
  WITH CHECK (current_user_is_master());

-- User KHÔNG tự INSERT (kể cả role 'player') — chỉ trigger handle_new_user và master mới INSERT được
-- → không cần policy INSERT cho user
```

### role_applications

```sql
ALTER TABLE role_applications ENABLE ROW LEVEL SECURITY;

-- User đọc + tạo application của chính mình (nhưng không sửa status sau khi tạo)
CREATE POLICY "user_read_own_applications" ON role_applications
  FOR SELECT USING (user_id = auth.uid() OR current_user_is_master());

CREATE POLICY "user_create_own_application" ON role_applications
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND requested_role <> 'master'           -- không tự apply master
    AND requested_role <> 'player'           -- player auto-grant, không cần apply
    AND status = 'pending'                   -- không tự set approved
    AND reviewed_by IS NULL
  );

-- Chỉ master sửa application (approve/reject)
CREATE POLICY "master_review_application" ON role_applications
  FOR UPDATE USING (current_user_is_master())
  WITH CHECK (current_user_is_master());
```

### Bảng hiện có — cần update

**tournaments:** thêm exception cho master vào policy đọc/sửa
```sql
DROP POLICY IF EXISTS "..." ON tournaments;  -- existing policies
-- Thêm: OR current_user_is_master() vào WITH CHECK của host policy
```

**profiles:** master xem/sửa toàn bộ
```sql
CREATE POLICY "master_all_profiles" ON profiles
  FOR ALL USING (current_user_is_master())
  WITH CHECK (current_user_is_master());
```

## 6. Frontend

### AuthContext mở rộng

```ts
interface AuthContextType {
  session, user, loading, signOut, signInWithGoogle,
  // Mới:
  roles: AppRole[];        // role active (revoked_at IS NULL)
  isMaster: boolean;
  isLoading: boolean;
  refetchRoles: () => Promise<void>;
}
```

Fetch `user_roles WHERE user_id = auth.uid() AND revoked_at IS NULL` ngay sau khi session ready.

### Hook `useRoles` rewrite

```ts
// src/hooks/use-roles.ts
export const useRoles = () => {
  const { roles, isMaster, isLoading } = useAuth();
  return {
    roles,
    isMaster,
    isLoading,
    hasRole: (r: AppRole) => roles.includes(r) || isMaster,  // master coi như có mọi role
  };
};
```

**Migration localStorage cũ:** lần đầu user login sau update, AuthContext check nếu `localStorage.pickleplay_roles` còn → submit role_applications cho các role đó (trừ player auto-grant) rồi xóa localStorage. Tránh user mất "trạng thái cũ".

### Component `<FeatureGate>`

```tsx
<FeatureGate
  role="host"
  fallback={<ApplyHostCard />}
  pending={<PendingReviewCard />}
>
  <CreateTournamentButton />
</FeatureGate>
```

Logic:
- User có role active → render children
- User có application `pending` → render `pending`
- Còn lại → render `fallback` (CTA apply)

### Component `<RequireMaster>`

Wrap route admin. Nếu không phải master → redirect `/` + toast.

### Trang Settings/Onboarding update

- Tick `Player` → lưu DB ngay (đã có row sẵn nếu signup mới, chỉ ensure)
- Tick role khác → mở Dialog `<ApplyRoleDialog>` (lý do, business info) → submit `role_applications`
- Hiển thị badge trạng thái next to mỗi role: ✓ Active / ⏳ Pending / ✗ Rejected (note)

### Admin pages

```
/admin/applications     — inbox pending: user info, requested_role, reason, business_info → Approve/Reject
/admin/users            — list user + role, search, đổi role thủ công, ban
/admin/tournaments      — list mọi tournament, override host, force-delete
/admin/stats            — tổng user theo role, signup/ngày, MAU, ...
```

Routing: tất cả qua `<RequireMaster>`.

## 7. Soft Revoke

- Master "Remove Host role" → UPDATE user_roles SET revoked_at = now(), revoked_by = master_id
- Tournament cũ của user vẫn editable (RLS dùng host_id = auth.uid(), không kiểm role)
- Nút "Create Tournament" check `hasRole('host')` → ẩn/hiện
- Re-grant: master Approve application mới hoặc trigger trên application approval set revoked_at = NULL

**Khác với ban:** ban là cờ trên `profiles.is_banned` (sẽ thêm sau khi cần) → user không login được. Revoke role chỉ chặn tính năng cụ thể.

## 8. Sprint Plan

| ID | Việc | Effort | Critical? |
|---|---|---|---|
| B1 | Migration: enum, user_roles, role_applications, helpers, RLS, seed master, auto-grant player, approval trigger | 1h | ✓ |
| B2 | AuthContext load roles + useRoles rewrite + migrate localStorage cũ | 1h | ✓ |
| B3 | SettingsPage: Player save DB, role khác → ApplyRoleDialog | 2h | ✓ |
| B4 | OnboardingPage: same logic | 30 phút | |
| B5 | RequireMaster guard + Admin menu trong dropdown profile | 30 phút | ✓ |
| B6 | `/admin/applications` inbox approve/reject | 2h | ✓ |
| B7 | `/admin/users` list, đổi/revoke role, (ban sau) | 2h | |
| B8 | `/admin/tournaments` + analytics dashboard | 2-3h | |
| B9 | FeatureGate component + tích hợp vào tournament/court/store flows | 1-2h | ✓ |

**MVP launch:** B1 + B2 + B3 + B5 + B6 + B9 ≈ 8h. Đủ để mở public Apply form.

**Phase 2:** B4, B7, B8 (mở rộng admin).

## 9. Future considerations

- **Email notification** khi application approved/rejected (Supabase Edge Function + Resend)
- **Re-apply cooldown:** 7 ngày sau reject, hard-coded hoặc cấu hình per-role
- **Tier within role:** vd Host Bronze/Silver/Gold theo số tournament tổ chức → giảm phí, ưu tiên hiển thị
- **API key cho Court/Store Owner:** integration với hệ thống POS, lịch booking external
- **Audit log riêng:** bảng `role_audit` ghi mọi thay đổi role (grant, revoke, application status change) → compliance khi scale lớn
- **Verification badges:** sau khi approved, hiển thị tick xanh trên profile
