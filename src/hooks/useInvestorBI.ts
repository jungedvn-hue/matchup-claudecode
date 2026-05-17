import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface BIWeeklySignup { week: string; count: number; }
export interface BICityCount { city: string; count: number; }
export interface BIDayPoint { date: string; count: number; }
export interface BIHeatCell { day: number; hour: number; count: number; }
export interface BICoinDay { date: string; volume: number; }

export interface InvestorBIData {
  // Overview
  totalUsers: number;
  totalGroups: number;
  totalSessions: number;       // group_events count
  totalTournaments: number;
  totalReferees: number;
  totalHosts: number;
  coinVolume30d: number;
  affiliateClicks30d: number;

  // Growth
  signups7d: number;
  signups30d: number;
  signups90d: number;
  weeklySignups: BIWeeklySignup[];   // last 12 weeks
  topCities: BICityCount[];

  // Engagement
  dauSeries: BIDayPoint[];           // last 30 days, distinct attendees per day
  wau: number;
  mau: number;
  sessionsPerActiveUser: number;
  avgDailyMinutes: number;
  density: BIHeatCell[];             // 7 × 24
  retentionD1: number;
  retentionD7: number;
  retentionD30: number;

  // Revenue
  coinVolume7d: number;
  giftingVolume30d: number;
  affiliateClicks7d: number;
  estimatedGMV: number;
  coinTrend: BICoinDay[];            // last 30 days
  ticketsSold30d: number;            // count of paid valid/used tickets in last 30d
  ticketRevenue30d: number;          // gross coin volume from ticket sales
  platformFeeRevenue30d: number;     // 5% fee captured (host credit consumed)
  activePayingHosts30d: number;      // distinct hosts who sold ≥1 ticket

  generatedAt: number;
}

const DAY = 86_400_000;

const isoDay = (d: Date) => d.toISOString().slice(0, 10);
const startOfDay = (ts: number) => { const d = new Date(ts); d.setUTCHours(0,0,0,0); return d.getTime(); };

export const useInvestorBI = () => {
  const [data, setData] = useState<InvestorBIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const now = Date.now();
      const since30 = new Date(now - 30 * DAY).toISOString();
      const since7  = new Date(now - 7  * DAY).toISOString();
      const since90 = new Date(now - 90 * DAY).toISOString();
      const since12w = new Date(now - 84 * DAY).toISOString();

      const [
        profilesRes, groupsRes, tournRes, rolesRes,
        eventsRes, attendeesRes,
        coin30Res, coin7Res, coinGiftRes,
        clicks30Res, clicks7Res,
        ticketsRes, hostFeesRes,
      ] = await Promise.all([
        supabase.from("profiles").select("user_id, created_at, city"),
        supabase.from("groups").select("id"),
        supabase.from("tournaments").select("id"),
        supabase.from("user_roles").select("user_id, role").is("revoked_at", null),
        supabase.from("group_events").select("id, event_date, group_id, created_by").gte("event_date", since30),
        supabase.from("group_event_attendees").select("event_id, user_id, status, created_at").gte("created_at", since30),
        supabase.from("coin_transactions").select("amount, created_at, type").gte("created_at", since30),
        supabase.from("coin_transactions").select("amount").gte("created_at", since7),
        supabase.from("coin_transactions").select("amount, type").gte("created_at", since30),
        supabase.from("affiliate_clicks").select("id, clicked_at").gte("clicked_at", since30),
        supabase.from("affiliate_clicks").select("id").gte("clicked_at", since7),
        supabase.from("event_tickets").select("id, paid_amount, status, paid_at, event_id").gte("paid_at", since30),
        supabase.from("host_credit_transactions").select("amount, kind, created_at").eq("kind", "fee").gte("created_at", since30),
      ]);

      const profiles = profilesRes.data ?? [];
      const groups = groupsRes.data ?? [];
      const tournaments = tournRes.data ?? [];
      const roles = rolesRes.data ?? [];
      const events = eventsRes.data ?? [];
      const attendees = attendeesRes.data ?? [];
      const coin30 = coin30Res.data ?? [];
      const coin7 = coin7Res.data ?? [];
      const coinGift = coinGiftRes.data ?? [];
      const clicks30 = clicks30Res.data ?? [];
      const clicks7 = clicks7Res.data ?? [];

      // ── Growth
      const ts = (s: string) => new Date(s).getTime();
      const signups7d  = profiles.filter(p => now - ts(p.created_at) <= 7 * DAY).length;
      const signups30d = profiles.filter(p => now - ts(p.created_at) <= 30 * DAY).length;
      const signups90d = profiles.filter(p => now - ts(p.created_at) <= 90 * DAY).length;

      // weekly signups for last 12 weeks
      const weekBuckets = new Map<string, number>();
      for (let w = 11; w >= 0; w--) {
        const wkStart = startOfDay(now - w * 7 * DAY);
        weekBuckets.set(isoDay(new Date(wkStart)), 0);
      }
      const since12wTs = ts(since12w);
      profiles.filter(p => ts(p.created_at) >= since12wTs).forEach(p => {
        const t = ts(p.created_at);
        const weeksAgo = Math.floor((now - t) / (7 * DAY));
        if (weeksAgo > 11) return;
        const wkStart = startOfDay(now - weeksAgo * 7 * DAY);
        const key = isoDay(new Date(wkStart));
        weekBuckets.set(key, (weekBuckets.get(key) ?? 0) + 1);
      });
      const weeklySignups: BIWeeklySignup[] = Array.from(weekBuckets.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([week, count]) => ({ week, count }));

      const cityMap = new Map<string, number>();
      profiles.forEach(p => {
        const c = (p.city ?? "").trim() || "—";
        cityMap.set(c, (cityMap.get(c) ?? 0) + 1);
      });
      const topCities: BICityCount[] = Array.from(cityMap.entries())
        .map(([city, count]) => ({ city, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);

      // ── Roles
      const totalReferees = roles.filter(r => r.role === "referee").length;
      const totalHosts = new Set(roles.filter(r => r.role === "host").map(r => r.user_id)).size;

      // ── Engagement
      // Map event → date
      const eventDate = new Map<string, number>();
      events.forEach(e => eventDate.set(e.id, ts(e.event_date)));

      // Use attendees as activity proxy: each attendee is a "session participation"
      const dayMap = new Map<string, Set<string>>();
      const dauUsers7 = new Set<string>();
      const dauUsers30 = new Set<string>();
      const userSessions = new Map<string, number>();
      const heat = new Map<string, number>();   // key: day-hour

      attendees.forEach(a => {
        const evtTs = eventDate.get(a.event_id) ?? ts(a.created_at);
        if (now - evtTs > 30 * DAY) return;
        const date = isoDay(new Date(evtTs));
        if (!dayMap.has(date)) dayMap.set(date, new Set());
        dayMap.get(date)!.add(a.user_id);
        dauUsers30.add(a.user_id);
        if (now - evtTs <= 7 * DAY) dauUsers7.add(a.user_id);
        userSessions.set(a.user_id, (userSessions.get(a.user_id) ?? 0) + 1);
        const d = new Date(evtTs);
        const dow = (d.getUTCDay() + 6) % 7; // Mon=0..Sun=6
        const hour = d.getUTCHours();
        const k = `${dow}-${hour}`;
        heat.set(k, (heat.get(k) ?? 0) + 1);
      });

      const dauSeries: BIDayPoint[] = [];
      for (let i = 29; i >= 0; i--) {
        const date = isoDay(new Date(now - i * DAY));
        dauSeries.push({ date, count: dayMap.get(date)?.size ?? 0 });
      }

      const wau = dauUsers7.size;
      const mau = dauUsers30.size;
      const sessionsPerActiveUser = mau > 0
        ? Number((Array.from(userSessions.values()).reduce((a, b) => a + b, 0) / mau).toFixed(2))
        : 0;

      // Estimated daily minutes per user — assume 90 min per session participation
      const totalSessions30 = attendees.length;
      const estTotalMinutes = totalSessions30 * 90;
      const avgDailyMinutes = mau > 0 ? Math.round(estTotalMinutes / 30 / mau) : 0;

      const density: BIHeatCell[] = [];
      for (let d = 0; d < 7; d++) {
        for (let h = 0; h < 24; h++) {
          density.push({ day: d, hour: h, count: heat.get(`${d}-${h}`) ?? 0 });
        }
      }

      // Retention — for users created 30d ago, did they have an attendee record after Day 1/7/30?
      // Simplified: cohort = signups in [60d ago, 30d ago]; check follow-up activity.
      const cohortStart = now - 60 * DAY;
      const cohortEnd = now - 30 * DAY;
      const cohort = profiles.filter(p => {
        const t = ts(p.created_at);
        return t >= cohortStart && t <= cohortEnd;
      });
      const userCreatedAt = new Map<string, number>();
      cohort.forEach(p => userCreatedAt.set(p.user_id, ts(p.created_at)));

      const userActivityTimes = new Map<string, number[]>();
      attendees.forEach(a => {
        const evtTs = eventDate.get(a.event_id);
        if (!evtTs) return;
        const arr = userActivityTimes.get(a.user_id) ?? [];
        arr.push(evtTs);
        userActivityTimes.set(a.user_id, arr);
      });

      const cohortSize = cohort.length;
      let r1 = 0, r7 = 0, r30 = 0;
      cohort.forEach(p => {
        const created = ts(p.created_at);
        const acts = userActivityTimes.get(p.user_id) ?? [];
        if (acts.some(t => t - created >= 0 && t - created <= 1.5 * DAY)) r1++;
        if (acts.some(t => t - created >= 0 && t - created <= 7.5 * DAY)) r7++;
        if (acts.some(t => t - created >= 0 && t - created <= 30 * DAY)) r30++;
      });
      const retentionD1  = cohortSize > 0 ? Math.round((r1  / cohortSize) * 100) : 0;
      const retentionD7  = cohortSize > 0 ? Math.round((r7  / cohortSize) * 100) : 0;
      const retentionD30 = cohortSize > 0 ? Math.round((r30 / cohortSize) * 100) : 0;

      // ── Revenue
      const sumAbs = (rows: { amount: number | null }[]) =>
        rows.reduce((s, r) => s + Math.abs(Number(r.amount ?? 0)), 0);
      const coinVolume30d = sumAbs(coin30);
      const coinVolume7d = sumAbs(coin7);
      const giftingVolume30d = coinGift
        .filter(r => r.type === "gift_sent" || r.type === "gift_received" || r.type === "gift")
        .reduce((s, r) => s + Math.abs(Number(r.amount ?? 0)), 0);
      const affiliateClicks30d = clicks30.length;
      const affiliateClicks7d = clicks7.length;
      const estimatedGMV = affiliateClicks30d * 50_000; // 50k VND avg basket × ~5% conversion handled upstream

      // Coin trend — daily volume
      const coinDayMap = new Map<string, number>();
      for (let i = 29; i >= 0; i--) coinDayMap.set(isoDay(new Date(now - i * DAY)), 0);
      coin30.forEach(r => {
        const date = isoDay(new Date(r.created_at));
        if (coinDayMap.has(date)) {
          coinDayMap.set(date, (coinDayMap.get(date) ?? 0) + Math.abs(Number(r.amount ?? 0)));
        }
      });
      const coinTrend: BICoinDay[] = Array.from(coinDayMap.entries()).map(([date, volume]) => ({ date, volume }));

      // ── Tickets (paid)
      const tickets30 = (ticketsRes.data ?? []) as Array<{ id: string; paid_amount: number | null; status: string; event_id: string }>;
      const paidValid = tickets30.filter(t => Number(t.paid_amount ?? 0) > 0 && (t.status === "valid" || t.status === "used"));
      const ticketsSold30d = paidValid.length;
      const ticketRevenue30d = paidValid.reduce((s, t) => s + Number(t.paid_amount ?? 0), 0);
      const hostFees30 = (hostFeesRes.data ?? []) as Array<{ amount: number | null }>;
      const platformFeeRevenue30d = hostFees30.reduce((s, r) => s + Math.abs(Number(r.amount ?? 0)), 0);
      const eventHostMap = new Map(((eventsRes.data ?? []) as any[]).map((e: any) => [e.id, e.created_by]));
      const activePayingHosts30d = new Set(paidValid.map(t => eventHostMap.get(t.event_id)).filter(Boolean)).size;

      setData({
        totalUsers: profiles.length,
        totalGroups: groups.length,
        totalSessions: events.length,
        totalTournaments: tournaments.length,
        totalReferees,
        totalHosts,
        coinVolume30d,
        affiliateClicks30d,
        signups7d, signups30d, signups90d,
        weeklySignups, topCities,
        dauSeries, wau, mau, sessionsPerActiveUser, avgDailyMinutes,
        density,
        retentionD1, retentionD7, retentionD30,
        coinVolume7d, giftingVolume30d, affiliateClicks7d, estimatedGMV, coinTrend,
        ticketsSold30d, ticketRevenue30d, platformFeeRevenue30d, activePayingHosts30d,
        generatedAt: Date.now(),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load BI data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { data, loading, error, refresh: load };
};
