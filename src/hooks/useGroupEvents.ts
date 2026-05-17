import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

const sb = supabase as unknown as { from: (t: string) => any };

export type RSVPStatus = "going" | "maybe" | "not_going";

export interface GroupEvent {
  id: string;
  group_id: string;
  created_by: string;
  title: string;
  description: string | null;
  location: string | null;
  event_date: string;
  duration_minutes: number;
  max_attendees: number | null;
  attendee_count: number;
  price_coins: number;
  refund_deadline_hours: number;
  created_at: string;
  group_name?: string;
  group_emoji?: string;
  my_rsvp?: RSVPStatus | null;
  my_ticket_status?: "valid" | "used" | "cancelled" | null;
}

// Events for one group
export const useGroupEvents = (groupId: string | undefined) => {
  const { user } = useAuth();
  const [events, setEvents] = useState<GroupEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);
    const { data } = await sb.from("group_events")
      .select("*").eq("group_id", groupId)
      .gte("event_date", new Date(Date.now() - 86400000).toISOString())
      .order("event_date", { ascending: true });
    let list = (data as GroupEvent[]) ?? [];
    if (user && list.length > 0) {
      const ids = list.map(e => e.id);
      const [rsvpsRes, ticketsRes] = await Promise.all([
        sb.from("group_event_attendees").select("event_id,status").eq("user_id", user.id).in("event_id", ids),
        sb.from("event_tickets").select("event_id,status").eq("user_id", user.id).in("event_id", ids),
      ]);
      const rMap = new Map(((rsvpsRes.data ?? []) as any[]).map((r: any) => [r.event_id, r.status]));
      const tMap = new Map(((ticketsRes.data ?? []) as any[]).map((t: any) => [t.event_id, t.status]));
      list = list.map(e => ({
        ...e,
        my_rsvp: rMap.get(e.id) ?? null,
        my_ticket_status: tMap.get(e.id) ?? null,
      }));
    }
    setEvents(list);
    setLoading(false);
  }, [groupId, user]);

  useEffect(() => { fetch(); }, [fetch]);
  return { events, loading, refetch: fetch };
};

// Upcoming events across all groups the user belongs to
export const useUpcomingEvents = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<GroupEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) { setEvents([]); setLoading(false); return; }
    setLoading(true);
    const { data: memberships } = await sb.from("group_members")
      .select("group_id").eq("user_id", user.id).eq("status", "active");
    if (!memberships?.length) { setEvents([]); setLoading(false); return; }
    const groupIds = memberships.map((m: any) => m.group_id);

    const { data: rawEvents } = await sb.from("group_events")
      .select("*").in("group_id", groupIds)
      .gte("event_date", new Date().toISOString())
      .order("event_date", { ascending: true })
      .limit(10);
    let list = (rawEvents as GroupEvent[]) ?? [];

    // Hydrate group names + my RSVP
    if (list.length > 0) {
      const [groupsRes, rsvpsRes] = await Promise.all([
        sb.from("groups").select("id,name,cover_emoji").in("id", list.map(e => e.group_id)),
        sb.from("group_event_attendees").select("event_id,status").eq("user_id", user.id).in("event_id", list.map(e => e.id)),
      ]);
      const gMap = new Map((groupsRes.data ?? []).map((g: any) => [g.id, g]));
      const rMap = new Map((rsvpsRes.data ?? []).map((r: any) => [r.event_id, r.status]));
      list = list.map(e => ({
        ...e,
        group_name: (gMap.get(e.group_id) as any)?.name,
        group_emoji: (gMap.get(e.group_id) as any)?.cover_emoji,
        my_rsvp: rMap.get(e.id) ?? null,
      }));
    }
    setEvents(list);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);
  return { events, loading, refetch: fetch };
};

// Create event (host/admin only — RLS enforces)
export const useCreateEvent = () => {
  const { user } = useAuth();
  const create = async (input: {
    group_id: string; title: string; event_date: string;
    description?: string; location?: string; duration_minutes?: number; max_attendees?: number;
    price_coins?: number; refund_deadline_hours?: number;
  }): Promise<{ data: GroupEvent | null; error: string | null }> => {
    if (!user) return { data: null, error: "Not authenticated" };
    const { data, error } = await sb.from("group_events").insert({
      group_id: input.group_id,
      created_by: user.id,
      title: input.title,
      description: input.description || null,
      location: input.location || null,
      event_date: input.event_date,
      duration_minutes: input.duration_minutes || 90,
      max_attendees: input.max_attendees || null,
      price_coins: input.price_coins ?? 0,
      refund_deadline_hours: input.refund_deadline_hours ?? 8,
    }).select().single();
    if (error) return { data: null, error: error.message };
    return { data: data as GroupEvent, error: null };
  };
  return { create };
};

// RSVP helpers
export const useRSVP = () => {
  const { user } = useAuth();

  const rsvp = async (eventId: string, status: RSVPStatus): Promise<{ error?: string }> => {
    if (!user) return { error: "Not authenticated" };
    const { error } = await sb.from("group_event_attendees").upsert({
      event_id: eventId, user_id: user.id, status,
    }, { onConflict: "event_id,user_id" });
    return error ? { error: error.message } : {};
  };

  const cancelRSVP = async (eventId: string): Promise<{ error?: string }> => {
    if (!user) return { error: "Not authenticated" };
    const { error } = await sb.from("group_event_attendees")
      .delete().eq("event_id", eventId).eq("user_id", user.id);
    return error ? { error: error.message } : {};
  };

  return { rsvp, cancelRSVP };
};
