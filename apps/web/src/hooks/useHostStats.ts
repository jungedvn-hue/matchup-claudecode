import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as unknown as { from: (t: string) => any };

export interface HostStats {
  totalRevenue: number;
  avgAttendance: number;
  totalEvents: number;
  loading: boolean;
}

const EMPTY = { totalRevenue: 0, avgAttendance: 0, totalEvents: 0 };

export function useHostStats(groupIds: string[]): HostStats {
  const [stats, setStats] = useState<Omit<HostStats, "loading">>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    if (groupIds.length === 0) {
      setStats(EMPTY);
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);
      const now = new Date().toISOString();

      const { data: pastEvents } = await sb
        .from("group_events")
        .select("id")
        .in("group_id", groupIds)
        .lt("event_date", now);

      if (cancelled) return;

      const pastEventIds: string[] = (pastEvents ?? []).map((e: any) => e.id);
      const totalEvents = pastEventIds.length;

      let totalRevenue = 0;
      let avgAttendance = 0;

      if (pastEventIds.length > 0) {
        const [ticketsRes, attendeesRes] = await Promise.all([
          sb.from("event_tickets")
            .select("price")
            .in("event_id", pastEventIds)
            .in("status", ["valid", "used"]),
          sb.from("group_event_attendees")
            .select("event_id")
            .in("event_id", pastEventIds)
            .eq("status", "going"),
        ]);

        if (cancelled) return;

        totalRevenue = (ticketsRes.data ?? []).reduce(
          (sum: number, t: any) => sum + Number(t.price ?? 0),
          0
        );

        const attendees = attendeesRes.data ?? [];
        if (attendees.length > 0) {
          const counts: Record<string, number> = {};
          (attendees as any[]).forEach((a) => {
            counts[a.event_id] = (counts[a.event_id] ?? 0) + 1;
          });
          const total = pastEventIds.reduce((s, eid) => s + (counts[eid] ?? 0), 0);
          avgAttendance = total / pastEventIds.length;
        }
      }

      if (cancelled) return;
      setStats({ totalRevenue, avgAttendance: Math.round(avgAttendance), totalEvents });
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [groupIds.join(",")]);

  return { ...stats, loading };
}
