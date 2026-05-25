import { supabase } from "./supabase";

export type VerificationStatus = "pending" | "verified" | "rejected" | "suspended";

export interface VenueListRow {
  id: string;
  name: string;
  location: string | null;
  address: string | null;
  contact_phone: string | null;
  status: string;
  verification_status: VerificationStatus;
  court_count: number;
  commission_rate: number | null;
  owner_user_id: string;
  owner_display_name: string | null;
  owner_email: string | null;
  created_at: string;
}

export interface VenueDetailRow extends VenueListRow {
  latitude: number | null;
  longitude: number | null;
  verified_at: string | null;
  verified_by: string | null;
  suspended_reason: string | null;
  amenities: string[] | null;
  operating_hours: any;
  pricing: any;
  owner_phone: string | null;
  updated_at: string;
}

export async function listVenues(params: {
  status?: VerificationStatus | "";
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ rows: VenueListRow[]; total: number }> {
  const status = params.status ?? "";
  const search = params.search ?? "";
  const [{ data: rows, error: e1 }, { data: total, error: e2 }] = await Promise.all([
    supabase.rpc("admin_list_venues", {
      p_verification_status: status,
      p_search: search,
      p_limit: params.limit ?? 25,
      p_offset: params.offset ?? 0,
    }),
    supabase.rpc("admin_count_venues", {
      p_verification_status: status,
      p_search: search,
    }),
  ]);
  if (e1) throw new Error(`admin_list_venues: ${e1.message}`);
  if (e2) throw new Error(`admin_count_venues: ${e2.message}`);
  return { rows: (rows ?? []) as VenueListRow[], total: (total as number) ?? 0 };
}

export async function getVenue(id: string): Promise<VenueDetailRow | null> {
  const { data, error } = await supabase.rpc("admin_get_venue", { p_id: id });
  if (error) throw new Error(`admin_get_venue: ${error.message}`);
  const row = Array.isArray(data) ? data[0] : data;
  return (row as VenueDetailRow) ?? null;
}

export async function approveVenue(id: string, commissionRate: number, note: string | null) {
  const { error } = await supabase.rpc("admin_approve_venue", {
    p_id: id, p_commission_rate: commissionRate, p_note: note ?? null,
  });
  if (error) throw error;
}

export async function rejectVenue(id: string, reason: string) {
  const { error } = await supabase.rpc("admin_reject_venue", {
    p_id: id, p_reason: reason,
  });
  if (error) throw error;
}

export async function suspendVenue(id: string, reason: string) {
  const { error } = await supabase.rpc("admin_suspend_venue", {
    p_id: id, p_reason: reason,
  });
  if (error) throw error;
}
