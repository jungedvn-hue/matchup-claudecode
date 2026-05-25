import { supabase } from "./supabase";

export type AdminRole =
  | "super_admin" | "ops_manager" | "finance"
  | "support" | "moderator" | "analyst";

export interface AdminUserRow {
  user_id: string;
  role: AdminRole;
  status: "active" | "suspended";
  mfa_enrolled: boolean;
}

export async function isAdmin(requiredRole?: AdminRole): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_admin", {
    required_role: requiredRole ?? null,
  });
  if (error) return false;
  return !!data;
}

export async function getCurrentAdminRow(): Promise<AdminUserRow | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("admin_users")
    .select("user_id, role, status, mfa_enrolled")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error || !data) return null;
  return data as AdminUserRow;
}

export async function logAdminAction(params: {
  action: string;
  target_type: string;
  target_id: string;
  before?: object | null;
  after?: object | null;
  reason?: string | null;
}) {
  const { error } = await supabase.rpc("admin_log_action", {
    p_action: params.action,
    p_target_type: params.target_type,
    p_target_id: params.target_id,
    p_before: params.before ?? null,
    p_after: params.after ?? null,
    p_reason: params.reason ?? null,
  });
  if (error) throw error;
}
