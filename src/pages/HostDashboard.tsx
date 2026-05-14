import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Users, Calendar, Clock, ChevronRight, Plus, Award,
  Loader2, MapPin, Trophy, UserPlus, Check, Sparkles, ArrowLeft, TrendingUp, BarChart2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { useMyGroups, useGroupMembership } from "@/hooks/useGroups";
import { useHostStats } from "@/hooks/useHostStats";
import { useTournaments } from "@/context/TournamentContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const sb = supabase as unknown as { from: (t: string) => any };

interface PendingRequest {
  id: string;
  group_id: string;
  user_id: string;
  joined_at: string;
  group_name: string;
  group_emoji: string;
  display_name?: string;
  avatar_url?: string;
}

interface UpcomingEvent {
  id: string;
  group_id: string;
  group_name: string;
  group_emoji: string;
  title: string;
  event_date: string;
  attendee_count: number;
  max_attendees: number | null;
  location: string | null;
}

const HostDashboard = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { groups: myGroups, loading: loadingGroups, refetch: refetchGroups } = useMyGroups();
  const { tournaments } = useTournaments();

  // Filter to groups I host
  const hostedGroups = useMemo(
    () => myGroups.filter(g => g.host_user_id === user?.id),
    [myGroups, user?.id]
  );

  // Tournaments I host
  const hostedTournaments = useMemo(
    () => tournaments.filter(t => t.host_id === user?.id),
    [tournaments, user?.id]
  );
  const activeTours = hostedTournaments.filter(t => t.status === "active");

  const [pending, setPending] = useState<PendingRequest[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingEvent[]>([]);
  const [loadingExtra, setLoadingExtra] = useState(true);

  useEffect(() => {
    if (hostedGroups.length === 0) { setPending([]); setUpcoming([]); setLoadingExtra(false); return; }
    const groupIds = hostedGroups.map(g => g.id);

    (async () => {
      setLoadingExtra(true);
      const [pendingRes, eventsRes] = await Promise.all([
        sb.from("group_members").select("*").in("group_id", groupIds).eq("status", "pending"),
        sb.from("group_events").select("*").in("group_id", groupIds)
          .gte("event_date", new Date().toISOString())
          .order("event_date", { ascending: true }).limit(5),
      ]);

      const pendingRows = (pendingRes.data ?? []) as any[];
      if (pendingRows.length > 0) {
        const uids = pendingRows.map(p => p.user_id);
        const { data: profiles } = await sb.from("profiles").select("user_id,display_name,avatar_url").in("user_id", uids);
        const pMap: Record<string, any> = {};
        (profiles ?? []).forEach((p: any) => { pMap[p.user_id] = p; });
        const gMap = new Map(hostedGroups.map(g => [g.id, g]));
        setPending(pendingRows.map(p => ({
          id: p.id, group_id: p.group_id, user_id: p.user_id, joined_at: p.joined_at,
          group_name: gMap.get(p.group_id)?.name ?? "",
          group_emoji: gMap.get(p.group_id)?.cover_emoji ?? "🥎",
          display_name: pMap[p.user_id]?.display_name,
          avatar_url: pMap[p.user_id]?.avatar_url,
        })));
      } else {
        setPending([]);
      }

      const eventRows = (eventsRes.data ?? []) as any[];
      const gMap = new Map(hostedGroups.map(g => [g.id, g]));
      setUpcoming(eventRows.map(e => ({
        id: e.id, group_id: e.group_id,
        group_name: gMap.get(e.group_id)?.name ?? "",
        group_emoji: gMap.get(e.group_id)?.cover_emoji ?? "🥎",
        title: e.title, event_date: e.event_date,
        attendee_count: e.attendee_count, max_attendees: e.max_attendees,
        location: e.location,
      })));
      setLoadingExtra(false);
    })();
  }, [hostedGroups]);

  const hostedGroupIds = useMemo(() => hostedGroups.map(g => g.id), [hostedGroups]);
  const hostStats = useHostStats(hostedGroupIds);

  // Stats (real data)
  const totalMembers = hostedGroups.reduce((s, g) => s + g.member_count, 0);
  const eventsThisWeek = upcoming.filter(e => {
    const diff = new Date(e.event_date).getTime() - Date.now();
    return diff < 7 * 86400000;
  }).length;

  const handleApprove = async (groupId: string, userId: string, name: string) => {
    // Try RPC first (SECURITY DEFINER, bypasses RLS edge cases). Fallback to direct update.
    const { data: rpcData, error: rpcErr } = await sb.rpc("fn_approve_group_member", {
      p_group_id: groupId, p_user_id: userId,
    });
    let updated = !rpcErr && rpcData === true;
    if (rpcErr) {
      // Fallback: direct update with .select() to verify rows changed
      const { data, error } = await sb.from("group_members")
        .update({ status: "active" })
        .eq("group_id", groupId).eq("user_id", userId)
        .select();
      if (error) { toast.error(error.message); return; }
      updated = !!data && data.length > 0;
    }
    if (!updated) {
      toast.error(t("groups.approveFailed"));
      return;
    }
    toast.success(`${t("groups.approved")} — ${name}`);
    setPending(prev => prev.filter(p => !(p.group_id === groupId && p.user_id === userId)));
    refetchGroups();
  };

  const handleReject = async (groupId: string, userId: string) => {
    const { error } = await sb.from("group_members")
      .delete().eq("group_id", groupId).eq("user_id", userId);
    if (error) { toast.error(error.message); return; }
    toast.success(t("groups.removed"));
    setPending(prev => prev.filter(p => !(p.group_id === groupId && p.user_id === userId)));
  };

  if (loadingGroups) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary opacity-40" />
    </div>
  );

  const formatEventDate = (iso: string) =>
    new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="pb-20 min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg font-display font-bold text-foreground flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary shrink-0" />
              {t("dashboard.title")}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {t("dashboard.managing")} {hostedGroups.length} {t("dashboard.groups")} · {totalMembers} {t("dashboard.players")}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 max-w-2xl mx-auto space-y-4">

        {/* Stats — Health Hub color tiers */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { tone: "primary", icon: Users, value: totalMembers, label: t("dashboard.activePlayers") },
            { tone: "blue", icon: Calendar, value: eventsThisWeek, label: t("dashboard.eventsThisWeek") },
            { tone: "amber", icon: Trophy, value: activeTours.length, label: t("dashboard.liveTournaments") },
            { tone: "emerald", icon: UserPlus, value: pending.length, label: t("dashboard.pendingMembers") },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
              <Card className="p-2.5 shadow-card text-center bg-card">
                <div className={`h-7 w-7 mx-auto mb-1.5 rounded-lg flex items-center justify-center ${
                  s.tone === "primary" ? "bg-primary/10 text-primary" :
                  s.tone === "blue" ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" :
                  s.tone === "amber" ? "bg-amber-500/10 text-amber-600 dark:text-amber-500" :
                  "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                }`}>
                  <s.icon className="h-3.5 w-3.5" />
                </div>
                <p className="text-base font-display font-bold text-card-foreground tabular-nums leading-none">{s.value}</p>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-1">{s.label}</p>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Historical stats row */}
        <div className="grid grid-cols-3 gap-2">
          {[
            {
              tone: "violet", icon: BarChart2,
              value: hostStats.loading ? "—" : hostStats.totalEvents.toString(),
              label: t("dashboard.totalEventsHosted"),
            },
            {
              tone: "sky", icon: Users,
              value: hostStats.loading || hostStats.totalEvents === 0 ? "—" : `${hostStats.avgAttendance}`,
              label: t("dashboard.avgAttendance"),
            },
            {
              tone: "emerald", icon: TrendingUp,
              value: hostStats.loading || hostStats.totalRevenue === 0 ? "—" : `${hostStats.totalRevenue.toLocaleString()}đ`,
              label: t("dashboard.revenue"),
            },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 + i * 0.05 }}>
              <Card className="p-2.5 shadow-card text-center bg-card">
                <div className={`h-7 w-7 mx-auto mb-1.5 rounded-lg flex items-center justify-center ${
                  s.tone === "violet" ? "bg-violet-500/10 text-violet-600 dark:text-violet-400" :
                  s.tone === "sky" ? "bg-sky-500/10 text-sky-600 dark:text-sky-400" :
                  "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                }`}>
                  <s.icon className="h-3.5 w-3.5" />
                </div>
                <p className="text-base font-display font-bold text-card-foreground tabular-nums leading-none">{s.value}</p>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-1">{s.label}</p>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Quick Actions */}
        <section>
          <h2 className="text-sm font-display font-bold text-foreground mb-2.5">{t("common.quickActions")}</h2>
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: Plus, label: t("groups.newGroup"), tone: "primary", action: () => navigate("/groups") },
              { icon: Award, label: t("nav.tourManager"), tone: "amber", action: () => navigate("/tour-manager/create") },
              { icon: Calendar, label: t("dashboard.viewEvents"), tone: "blue", action: () => navigate("/groups") },
            ].map((a, i) => (
              <motion.button
                key={i} onClick={a.action}
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="p-3 rounded-xl bg-card border border-border hover:border-primary/30 hover:bg-primary/5 transition-all active:scale-95 text-left shadow-sm"
              >
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center mb-2 ${
                  a.tone === "primary" ? "bg-primary/10 text-primary" :
                  a.tone === "amber" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" :
                  "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                }`}>
                  <a.icon className="h-4 w-4" />
                </div>
                <p className="text-[11px] font-semibold text-foreground leading-tight">{a.label}</p>
              </motion.button>
            ))}
          </div>
        </section>

        {/* Pending member requests */}
        {pending.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-display font-bold text-foreground flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-emerald-500" />
              {t("dashboard.pendingRequests")} ({pending.length})
            </h2>
            <div className="space-y-2">
              {pending.map(p => (
                <Card key={p.id} className="p-3 shadow-card bg-gradient-to-br from-emerald-500/5 via-card to-card">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-lg shrink-0">
                      {p.group_emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{p.display_name || t("common.unknown")}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{p.group_name}</p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button onClick={() => handleApprove(p.group_id, p.user_id, p.display_name || "")}
                        className="h-8 px-2.5 rounded-lg bg-primary text-primary-foreground text-[11px] font-semibold flex items-center gap-1 hover:bg-primary/90">
                        <Check className="h-3 w-3" /> {t("groups.approve")}
                      </button>
                      <button onClick={() => handleReject(p.group_id, p.user_id)}
                        className="h-8 px-2.5 rounded-lg border border-border text-[11px] font-medium text-muted-foreground hover:border-destructive/30 hover:text-destructive">
                        {t("dashboard.reject")}
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* My Groups */}
        {hostedGroups.length > 0 ? (
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-display font-bold text-foreground flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                {t("dashboard.myGroups")} ({hostedGroups.length})
              </h2>
              <button onClick={() => navigate("/groups")} className="text-xs text-primary font-medium">{t("common.seeAll")}</button>
            </div>
            <div className="space-y-2">
              {hostedGroups.map(g => (
                <button key={g.id} onClick={() => navigate(`/group/${g.id}`)} className="w-full text-left">
                  <Card className="p-3 shadow-card hover:border-primary/30 transition-colors bg-gradient-to-br from-primary/5 via-card to-card">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center text-2xl shrink-0">
                        {g.cover_emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{g.name}</p>
                        <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-0.5"><Users className="h-3 w-3" /> {g.member_count}</span>
                          {g.location && <span className="flex items-center gap-0.5 truncate"><MapPin className="h-3 w-3 shrink-0" /> {g.location}</span>}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                  </Card>
                </button>
              ))}
            </div>
          </section>
        ) : (
          <Card className="p-6 text-center shadow-card">
            <Users className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground">{t("dashboard.noGroupsHosted")}</p>
            <button onClick={() => navigate("/groups")} className="mt-3 inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-semibold">
              <Plus className="h-3.5 w-3.5" /> {t("groups.newGroup")}
            </button>
          </Card>
        )}

        {/* Upcoming events */}
        {upcoming.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-display font-bold text-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              {t("events.upcoming")} ({upcoming.length})
            </h2>
            <div className="space-y-2">
              {upcoming.map(e => (
                <button key={e.id} onClick={() => navigate(`/group/${e.group_id}`)} className="w-full text-left">
                  <Card className="p-3 shadow-card bg-gradient-to-br from-blue-500/5 via-card to-card hover:border-primary/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-xl shrink-0">
                        {e.group_emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">{e.title}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{e.group_name}</p>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Clock className="h-2.5 w-2.5" /> {formatEventDate(e.event_date)}
                          {e.location && <><span>·</span><span className="truncate">{e.location}</span></>}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-display font-bold text-foreground tabular-nums">
                          {e.attendee_count}{e.max_attendees ? `/${e.max_attendees}` : ""}
                        </p>
                        <p className="text-[9px] text-muted-foreground">{t("events.going")}</p>
                      </div>
                    </div>
                  </Card>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Active tournaments */}
        {activeTours.length > 0 && (
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-display font-bold text-foreground flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" />
                {t("dashboard.liveTournaments")} ({activeTours.length})
              </h2>
              <button onClick={() => navigate("/tour-manager")} className="text-xs text-primary font-medium">{t("common.seeAll")}</button>
            </div>
            <div className="space-y-2">
              {activeTours.slice(0, 3).map(tour => (
                <button key={tour.id} onClick={() => navigate(`/tour-manager/${tour.id}`)} className="w-full text-left">
                  <Card className="p-3 shadow-card bg-gradient-to-br from-amber-500/5 via-card to-card hover:border-primary/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{tour.name}</p>
                        <p className="text-[11px] text-muted-foreground">{tour.date} · {tour.location}</p>
                      </div>
                      <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full shrink-0 animate-pulse">LIVE</span>
                    </div>
                  </Card>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default HostDashboard;
