import { supabase } from "./supabase";
import { logAdminAction } from "./admin-api";

export interface UserListRow {
  user_id: string;
  profile_id: string | null;
  display_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  email: string | null;
  location: string | null;
  created_at: string | null;
}

export interface UserDetailRow extends UserListRow {
  bio: string | null;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
}

export interface SuspensionRow {
  id: string;
  user_id: string;
  reason: string;
  reason_code: string;
  suspended_by: string;
  suspended_at: string;
  expires_at: string | null;
  lifted_at: string | null;
  lifted_by: string | null;
  lift_reason: string | null;
}

export type SuspendReasonCode =
  | "spam" | "fraud" | "abuse" | "tos_violation" | "impersonation" | "other";

export async function searchUsers(params: {
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ rows: UserListRow[]; total: number }> {
  const search = params.search ?? null;
  const [{ data: rows, error: e1 }, { data: total, error: e2 }] = await Promise.all([
    supabase.rpc("admin_search_users", {
      p_search: search,
      p_limit:  params.limit  ?? 25,
      p_offset: params.offset ?? 0,
    }),
    supabase.rpc("admin_count_users", { p_search: search }),
  ]);
  if (e1) throw new Error(`admin_search_users: ${e1.message}`);
  if (e2) throw new Error(`admin_count_users: ${e2.message}`);
  return { rows: (rows ?? []) as UserListRow[], total: (total as number) ?? 0 };
}

export async function getUser(userId: string): Promise<UserDetailRow | null> {
  const { data, error } = await supabase.rpc("admin_get_user", { p_user_id: userId });
  if (error) throw new Error(`admin_get_user: ${error.message}`);
  const row = Array.isArray(data) ? data[0] : data;
  return (row as UserDetailRow) ?? null;
}

export async function getActiveSuspension(userId: string): Promise<SuspensionRow | null> {
  const { data } = await supabase
    .from("user_suspensions")
    .select("*")
    .eq("user_id", userId)
    .is("lifted_at", null)
    .order("suspended_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as SuspensionRow | null) ?? null;
}

export async function getSuspensionsHistory(userId: string): Promise<SuspensionRow[]> {
  const { data, error } = await supabase
    .from("user_suspensions")
    .select("*")
    .eq("user_id", userId)
    .order("suspended_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as SuspensionRow[];
}

export async function suspendUser(params: {
  userId: string;
  reasonCode: SuspendReasonCode;
  reasonNote: string;
  expiresAt: string | null;
}): Promise<SuspensionRow> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const insert = {
    user_id: params.userId,
    reason: params.reasonNote,
    reason_code: params.reasonCode,
    suspended_by: user.id,
    expires_at: params.expiresAt,
  };

  const { data, error } = await supabase
    .from("user_suspensions")
    .insert(insert)
    .select()
    .single();
  if (error) throw error;

  await logAdminAction({
    action: "user.suspend",
    target_type: "user",
    target_id: params.userId,
    after: insert,
    reason: `${params.reasonCode}: ${params.reasonNote}`,
  });

  return data as SuspensionRow;
}

export async function unsuspendUser(params: {
  suspensionId: string;
  userId: string;
  liftReason: string;
}): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const patch = {
    lifted_at: new Date().toISOString(),
    lifted_by: user.id,
    lift_reason: params.liftReason,
  };

  const { error } = await supabase
    .from("user_suspensions")
    .update(patch)
    .eq("id", params.suspensionId);
  if (error) throw error;

  await logAdminAction({
    action: "user.unsuspend",
    target_type: "user",
    target_id: params.userId,
    after: patch,
    reason: params.liftReason,
  });
}

export async function logPiiReveal(userId: string, field: "phone" | "email") {
  try {
    await logAdminAction({
      action: "user.pii_reveal",
      target_type: "user",
      target_id: userId,
      reason: `field=${field}`,
    });
  } catch {/* best-effort */}
}
