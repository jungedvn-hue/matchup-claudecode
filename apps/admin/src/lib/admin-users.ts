import { supabase } from "./supabase";
import { logAdminAction } from "./admin-api";

export interface ProfileRow {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  created_at: string | null;
  avatar_url?: string | null;
  [k: string]: any;
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

export async function getProfile(id: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return data as ProfileRow;
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
  } catch {
    // best-effort, không block UI
  }
}
