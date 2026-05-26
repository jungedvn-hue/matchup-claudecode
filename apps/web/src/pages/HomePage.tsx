import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ShieldCheck, ChevronRight, Trophy, Flame, Gem, Plus,
  Users, Calendar, Clock, GraduationCap, Map as MapIcon, Wrench,
} from "lucide-react";
import { TOOLS, filterToolsForRoles } from "@/lib/tools";
import { useRoles } from "@/hooks/use-roles";
import NotificationBell from "@/components/NotificationBell";
import BrandLogo from "@/components/BrandLogo";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import LogMatchDialog from "@/components/LogMatchDialog";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { usePlayerProfile, usePendingVerifications } from "@/hooks/useMatches";
import { useStreak } from "@/hooks/useGamification";
import { useMyGroups } from "@/hooks/useGroups";
import { useUpcomingEvents } from "@/hooks/useGroupEvents";
import { getTierFromLevel, getXPForLevel } from "@/lib/gamification";

const SectionTitle = ({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) => (
  <div className="flex items-baseline justify-between mb-3">
    <h2 className="text-[10px] uppercase tracking-[0.12em] font-semibold text-muted-foreground">{children}</h2>
    {action}
  </div>
);

const HomePage = () => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const isVi = language === "vi";
  const { user, session } = useAuth();
  const { profile } = usePlayerProfile();
  const { streak } = useStreak();
  const { matches: pendingMatches } = usePendingVerifications();
  const { groups: myGroups } = useMyGroups();
  const { events: upcomingEvents } = useUpcomingEvents();
  const roles = useRoles();
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const topTools = filterToolsForRoles(TOOLS, [...roles, "player"])
    .filter(tool => tool.status !== "coming_soon")
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 4);

  const displayName = profile?.display_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Player";
  const level = profile?.current_level ?? 1;
  const totalXP = profile?.total_xp ?? 0;
  const gems = profile?.gems ?? 0;
  const currentStreak = streak?.current_streak ?? 0;
  const tier = getTierFromLevel(level);
  const xpThisLevel = getXPForLevel(level);
  const xpNextLevel = getXPForLevel(level + 1);
  const xpProgress = Math.max(0, totalXP - xpThisLevel);
  const xpNeeded = xpNextLevel - xpThisLevel;
  const xpRemaining = Math.max(0, xpNextLevel - totalXP);
  const pct = xpNeeded > 0 ? Math.min(100, Math.round((xpProgress / xpNeeded) * 100)) : 0;

  const discoverTiles = [
    { cat: "groups",      icon: Users,          label: t("discover.groups"),      to: "/groups" },
    { cat: "courts",      icon: MapIcon,        label: t("discover.courts"),      to: "/discover?cat=courts" },
    { cat: "coaches",     icon: GraduationCap,  label: t("discover.coaches"),     to: "/discover?cat=coaches" },
    { cat: "tournaments", icon: Trophy,         label: t("discover.tournaments"), to: "/tournaments" },
  ];

  return (
    <div className="pb-24 min-h-screen">
      <LogMatchDialog open={logDialogOpen} onOpenChange={setLogDialogOpen} />

      {/* Header — minimal */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border/60 px-4 py-2.5">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <BrandLogo variant="full" className="h-6" />
          <NotificationBell />
        </div>
      </div>

      <div className="px-4 pt-6 max-w-2xl mx-auto space-y-7">

        {/* Hero — refined single card */}
        {session ? (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="p-5 shadow-card bg-card border-border space-y-4">
              <div className="flex items-start gap-3">
                <Avatar className="h-11 w-11 shrink-0">
                  {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
                  <AvatarFallback className="bg-primary/10 text-primary font-display font-semibold text-sm">
                    {displayName[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-muted-foreground">{isVi ? "Chào," : "Hello,"}</p>
                  <h1 className="text-base font-display font-semibold text-card-foreground truncate leading-tight">{displayName}</h1>
                  <p className="text-[11px] text-muted-foreground mt-0.5 tabular-nums">Lv.{level} · {tier}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="inline-flex items-center gap-1 px-2 h-6 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 text-[11px] font-semibold tabular-nums">
                    <Flame className="h-3 w-3" />{currentStreak}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 h-6 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-[11px] font-semibold tabular-nums">
                    <Gem className="h-3 w-3" />{gems}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="h-1 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-[11px] text-muted-foreground tabular-nums">
                  {xpRemaining} XP {isVi ? `đến Lv.${level + 1}` : `to Lv.${level + 1}`}
                </p>
              </div>

              <Button onClick={() => setLogDialogOpen(true)} className="w-full rounded-xl gap-2 font-semibold">
                <Plus className="h-4 w-4" /> {t("common.logMatch")}
              </Button>
            </Card>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="p-6 text-center shadow-card bg-card border-border space-y-3">
              <Trophy className="h-10 w-10 mx-auto text-primary" />
              <div>
                <h2 className="text-base font-display font-semibold text-foreground">{t("home.guestTitle")}</h2>
                <p className="text-xs text-muted-foreground mt-1">{t("home.guestDesc")}</p>
              </div>
              <Button onClick={() => navigate("/login")} className="w-full rounded-xl font-semibold">{t("common.loginNow")}</Button>
            </Card>
          </motion.div>
        )}

        {/* Pending verifications — conditional alert */}
        {pendingMatches.length > 0 && (
          <button
            onClick={() => navigate("/verify")}
            className="w-full flex items-center justify-between px-4 py-3 bg-amber-500/5 border border-amber-500/20 rounded-xl hover:bg-amber-500/10 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                {pendingMatches.length} {t("home.pendingVerify")}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-amber-500/60 shrink-0" />
          </button>
        )}

        {/* Discover — 2x2 flat grid */}
        <section>
          <SectionTitle action={
            <button onClick={() => navigate("/discover")} className="text-[11px] text-primary font-medium">
              {t("common.seeAll")}
            </button>
          }>
            {t("home.discoverNearby")}
          </SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            {discoverTiles.map((tile) => (
              <button
                key={tile.cat}
                onClick={() => navigate(tile.to)}
                className="group p-4 rounded-xl bg-card border border-border hover:border-primary/40 transition-all active:scale-[0.98] text-left"
              >
                <tile.icon className="h-5 w-5 text-primary/70 group-hover:text-primary transition-colors mb-2.5" />
                <p className="text-sm font-medium text-foreground">{tile.label}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Tiện ích / Utilities */}
        {topTools.length > 0 && (
          <section>
            <SectionTitle action={
              <button onClick={() => navigate("/tools")} className="text-[11px] text-primary font-medium">
                {t("common.seeAll")}
              </button>
            }>
              <span className="inline-flex items-center gap-1.5">
                <Wrench className="h-3 w-3" /> {t("home.utilities")}
              </span>
            </SectionTitle>
            <div className="grid grid-cols-2 gap-2">
              {topTools.map((tool) => {
                const Icon = tool.icon;
                const disabled = tool.status === "coming_soon";
                return (
                  <button
                    key={tool.id}
                    onClick={() => tool.route ? navigate(tool.route) : navigate("/tools")}
                    disabled={disabled}
                    className="group p-3.5 rounded-xl bg-card border border-border hover:border-primary/40 transition-all active:scale-[0.98] text-left disabled:opacity-50"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <Icon className="h-4.5 w-4.5 text-primary/70 group-hover:text-primary transition-colors" />
                      {tool.status === "beta" && (
                        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          {t("tools.badge.beta")}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-medium text-foreground leading-tight">{t(tool.labelKey)}</p>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Upcoming events */}
        {session && upcomingEvents.length > 0 && (
          <section>
            <SectionTitle>
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-3 w-3" /> {t("events.upcoming")}
              </span>
            </SectionTitle>
            <div className="divide-y divide-border/60 rounded-xl border border-border bg-card overflow-hidden">
              {upcomingEvents.slice(0, 3).map((ev) => {
                const d = new Date(ev.event_date);
                const dateLabel = d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
                return (
                  <button
                    key={ev.id}
                    onClick={() => navigate(`/group/${ev.group_id}`)}
                    className="w-full px-3 py-3 flex items-center gap-3 hover:bg-secondary/40 transition-colors text-left"
                  >
                    <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center text-lg shrink-0">
                      {ev.group_emoji ?? "🥎"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground truncate">{ev.title}</p>
                        {ev.my_rsvp === "going" && (
                          <span className="text-[9px] font-semibold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                            {t("events.rsvp.going")}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                        <Clock className="h-2.5 w-2.5" /> {dateLabel}
                        {ev.location && <span className="truncate">· {ev.location}</span>}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* My groups — slim avatar row */}
        {session && myGroups.length > 0 && (
          <section>
            <SectionTitle action={
              <button onClick={() => navigate("/groups")} className="text-[11px] text-primary font-medium">
                {t("common.seeAll")}
              </button>
            }>
              {t("home.myGroupsSection")}
            </SectionTitle>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
              {myGroups.slice(0, 8).map((g) => (
                <button
                  key={g.id}
                  onClick={() => navigate(`/group/${g.id}`)}
                  className="shrink-0 w-16 text-center group"
                >
                  <div className="h-14 w-14 rounded-full bg-secondary border border-border group-hover:border-primary/40 flex items-center justify-center text-2xl transition-colors mx-auto">
                    {g.cover_emoji}
                  </div>
                  <p className="text-[11px] text-foreground mt-1.5 truncate">{g.name}</p>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default HomePage;
