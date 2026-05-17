import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

const sb = supabase as unknown as { from: (t: string) => any; rpc: (fn: string, args?: any) => any };

export type TicketStatus = "valid" | "used" | "cancelled";

export interface EventTicket {
  id: string;
  event_id: string;
  user_id: string;
  qr_token: string;
  price: number;
  status: TicketStatus;
  checked_in_at: string | null;
  created_at: string;
  // hydrated:
  event_title?: string;
  event_date?: string;
  event_location?: string | null;
  group_name?: string;
  group_emoji?: string;
}

// ── My tickets (player view) ──────────────────────────────────────────────────

export const useMyTickets = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<EventTicket[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) { setTickets([]); setLoading(false); return; }
    setLoading(true);
    const { data: rows } = await sb.from("event_tickets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    const list = (rows as EventTicket[]) ?? [];
    if (list.length === 0) { setTickets([]); setLoading(false); return; }

    const eventIds = [...new Set(list.map(t => t.event_id))];
    const { data: events } = await sb.from("group_events")
      .select("id, title, event_date, location, group_id").in("id", eventIds);
    const evMap: Record<string, any> = {};
    (events ?? []).forEach((e: any) => { evMap[e.id] = e; });

    const groupIds = [...new Set((events ?? []).map((e: any) => e.group_id))];
    const { data: groups } = await sb.from("groups")
      .select("id, name, cover_emoji").in("id", groupIds);
    const gMap: Record<string, any> = {};
    (groups ?? []).forEach((g: any) => { gMap[g.id] = g; });

    const hydrated = list.map(t => {
      const ev = evMap[t.event_id];
      const grp = ev ? gMap[ev.group_id] : null;
      return {
        ...t,
        event_title: ev?.title,
        event_date: ev?.event_date,
        event_location: ev?.location,
        group_name: grp?.name,
        group_emoji: grp?.cover_emoji,
      };
    });
    setTickets(hydrated);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);
  return { tickets, loading, refetch: fetch };
};

// ── Atomic check-in via RPC (host scans player QR) ────────────────────────────

export interface CheckinResult {
  ok: boolean;
  error?: "invalid" | "forbidden" | "already_used" | "cancelled";
  display_name?: string;
  user_id?: string;
  event_id?: string;
  checked_in_at?: string;
}

export const checkinTicket = async (token: string): Promise<CheckinResult> => {
  const { data, error } = await sb.rpc("checkin_ticket", { p_token: token });
  if (error) return { ok: false, error: "invalid" };
  return data as CheckinResult;
};

// ── Host view: tickets for one event (with buyer profile) ──────────────────
export interface EventTicketWithBuyer extends EventTicket {
  paid_amount: number;
  paid_at: string | null;
  refunded_at: string | null;
  platform_fee: number;
  buyer_name?: string;
  buyer_avatar?: string | null;
}

export const useEventTickets = (eventId: string | undefined) => {
  const [tickets, setTickets] = useState<EventTicketWithBuyer[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!eventId) { setTickets([]); setLoading(false); return; }
    setLoading(true);
    const { data: rows } = await sb.from("event_tickets")
      .select("*").eq("event_id", eventId)
      .order("created_at", { ascending: false });
    const list = (rows as EventTicketWithBuyer[]) ?? [];
    if (list.length === 0) { setTickets([]); setLoading(false); return; }

    const userIds = [...new Set(list.map(t => t.user_id))];
    const { data: profiles } = await sb.from("profiles")
      .select("id, display_name, avatar_url").in("id", userIds);
    const pMap: Record<string, any> = {};
    (profiles ?? []).forEach((p: any) => { pMap[p.id] = p; });

    setTickets(list.map(t => ({
      ...t,
      buyer_name: pMap[t.user_id]?.display_name,
      buyer_avatar: pMap[t.user_id]?.avatar_url,
    })));
    setLoading(false);
  }, [eventId]);

  useEffect(() => { fetch(); }, [fetch]);
  return { tickets, loading, refetch: fetch };
};
