import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

const sb = supabase as unknown as { from: (t: string) => any };

export type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed" | "no_show";
export type PaymentStatus = "unpaid" | "paid" | "refunded";

export interface CourtBooking {
  id: string;
  venue_id: string;
  court_index: number;
  user_id: string;
  start_at: string;       // ISO timestamptz
  end_at: string;
  status: BookingStatus;
  price_vnd: number;
  commission_pct: number;
  commission_vnd: number;
  payment_status: PaymentStatus;
  qr_token: string;
  note: string | null;
  created_at: string;
  updated_at: string;
}

/** Bookings at a venue from a given date forward (default today). */
export const useVenueBookings = (venueId?: string, fromISO?: string) => {
  const [items, setItems] = useState<CourtBooking[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!venueId) { setItems([]); setLoading(false); return; }
    setLoading(true);
    const from = fromISO ?? new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
    const { data } = await sb.from("court_bookings")
      .select("*")
      .eq("venue_id", venueId)
      .gte("start_at", from)
      .order("start_at", { ascending: true })
      .limit(500);
    setItems((data as CourtBooking[]) ?? []);
    setLoading(false);
  }, [venueId, fromISO]);

  useEffect(() => { fetch(); }, [fetch]);

  return { items, loading, refetch: fetch };
};

/** Current user's bookings (upcoming + past). */
export const useMyBookings = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<CourtBooking[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) { setItems([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await sb.from("court_bookings")
      .select("*")
      .eq("user_id", user.id)
      .order("start_at", { ascending: false })
      .limit(100);
    setItems((data as CourtBooking[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  return { items, loading, refetch: fetch };
};

export interface CreateBookingInput {
  venue_id: string;
  court_index: number;
  start_at: string; // ISO
  end_at: string;   // ISO
  price_vnd: number;
  note?: string | null;
}

export const createBooking = async (input: CreateBookingInput, userId: string) => {
  const { data, error } = await sb.from("court_bookings")
    .insert({ ...input, user_id: userId })
    .select("*").maybeSingle();
  return { booking: data as CourtBooking | null, error };
};

export const cancelBooking = async (id: string) => {
  const { error } = await sb.from("court_bookings")
    .update({ status: "cancelled" as BookingStatus }).eq("id", id);
  return { error };
};

export const confirmBooking = async (id: string) => {
  const { error } = await sb.from("court_bookings")
    .update({ status: "confirmed" as BookingStatus }).eq("id", id);
  return { error };
};

export const markBookingPaid = async (id: string, paid: boolean) => {
  const { error } = await sb.from("court_bookings")
    .update({ payment_status: (paid ? "paid" : "unpaid") as PaymentStatus }).eq("id", id);
  return { error };
};

export const checkInBooking = async (id: string) => {
  const { error } = await sb.from("court_bookings")
    .update({ status: "completed" as BookingStatus }).eq("id", id);
  return { error };
};

/** Compute slot status for a venue on a given date. */
export const computeSlotConflicts = (
  bookings: CourtBooking[],
  dateISO: string, // YYYY-MM-DD
  courtIndex: number,
): Set<string> => {
  // returns set of "HH:MM" keys that are blocked
  const blocked = new Set<string>();
  const dayStart = new Date(`${dateISO}T00:00:00`);
  const dayEnd   = new Date(`${dateISO}T23:59:59`);
  for (const b of bookings) {
    if (b.status === "cancelled" || b.status === "no_show") continue;
    if (b.court_index !== courtIndex) continue;
    const s = new Date(b.start_at);
    const e = new Date(b.end_at);
    if (e < dayStart || s > dayEnd) continue;
    // mark each hour the booking covers
    for (let h = Math.max(0, s.getHours()); h < Math.min(24, e.getHours() + (e.getMinutes() > 0 ? 1 : 0)); h++) {
      blocked.add(`${String(h).padStart(2, "0")}:00`);
    }
  }
  return blocked;
};
