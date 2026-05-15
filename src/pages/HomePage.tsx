import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ShieldCheck, ChevronRight, Trophy, Flame, Gem,
  Sparkles, MapPin, Star, Plus, Award, LayoutDashboard,
  ShoppingBag, ExternalLink, Users, Calendar, Clock,
} from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import XPProgressBar from "@/components/XPProgressBar";
import LogMatchDialog from "@/components/LogMatchDialog";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { useRoles, hasRole } from "@/hooks/use-roles";
import { usePlayerProfile } from "@/hooks/useMatches";
import { useStreak } from "@/hooks/useGamification";
import { usePendingVerifications } from "@/hooks/useMatches";
import { useTournaments } from "@/context/TournamentContext";
import { useStores } from "@/hooks/useStores";
import { useMyGroups } from "@/hooks/useGroups";
import { useUpcomingEvents } from "@/hooks/useGroupEvents";
import { getTierFromLevel } from "@/lib/gamification";
import { useState } from "react";

const HomePage = () => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const isVi = language === "vi";
  const { user, session } = useAuth();
  const roles = useRoles();
  const { profile } = usePlayerProfile();
  const { streak } = useStreak();
  const { matches: pendingMatches } = usePendingVerifications();
  const { tournaments } = useTournaments();
  const { stores } = useStores();
  const { groups: myGroups } = useMyGroups();
  const { events: upcomingEvents } = useUpcomingEvents();
  const [logDialogOpen, setLogDialogOpen] = useState(false);

  const isHost = hasRole(roles, "host");
  const isStoreOwner = hasRole(roles, "store_owner");
  const isPlayer = hasRole(roles, "player");

  const displayName = profile?.display_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Player";
  const level = profile?.current_level ?? 1;
  const totalXP = profile?.total_xp ?? 0;
  const gems = profile?.gems ?? 0;
  const currentStreak = streak?.current_streak ?? 0;
  const tier = getTierFromLevel(level);

  const flameColor = currentStreak >= 30 ? "text-purple-500" : currentStreak >= 7 ? "text-blue-500" : "text-orange-500";

  const activeTournaments = tournaments.filter(t => t.status === "active").slice(0, 3);
  const featuredStores = stores.slice(0, 4);

  const quickActions = [
    isPlayer && { icon: Trophy, label: t("common.logMatch"), tone: "primary", action: () => setLogDialogOpen(true) },
    isPlayer && { icon: Sparkles, label: t("arena.title"), tone: "amber", path: "/arena" },
    isPlayer && { icon: Users, label: t("groups.title"), tone: "blue", path: "/groups" },
    isHost && { icon: Award, label: t("nav.tourManager"), tone: "primary", path: "/tour-manager" },
    isHost && { icon: LayoutDashboard, label: t("nav.host"), tone: "blue", path: "/dashboard" },
    isStoreOwner && { icon: ShoppingBag, label: t("tile.myStore"), tone: "emerald", path: "/my-store" },
    isPlayer && { icon: ShieldCheck, label: t("verify.title"), tone: "emerald", path: "/verify" },
  ].filter(Boolean) as { icon: any; label: string; tone: string; path?: string; action?: () => void }[];

  const toneClass = (tone: string) =>
    tone === "primary" ? "bg-primary/10 text-primary" :
    tone === "amber" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" :
    tone === "emerald" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
    "bg-blue-500/10 text-blue-600 dark:text-blue-400";

  return (
    <div className="pb-20 min-h-screen">
      <LogMatchDialog open={logDialogOpen} onOpenChange={setLogDialogOpen} />

      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <img src="/logo.png" alt="MatchUp" className="h-7" />
          <NotificationBell />
        </div>
      </div>

      <div className="px-4 pt-4 max-w-2xl mx-auto space-y-4">

        {/* Hero Card */}
        {session && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="p-4 shadow-card overflow-hidden bg-gradient-to-br from-primary/5 via-card to-card space-y-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 ring-2 ring-primary/20 shrink-0">
                  {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
                  <AvatarFallback className="bg-primary/10 text-primary font-display font-bold">
                    {displayName[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">{isVi ? "Chào," : "Hey,"}</p>
                  <h2 className="text-base font-display font-bold text-card-foreground truncate">{displayName}</h2>
                  <p className="text-[11px] text-muted-foreground">Lv.{level} · {tier}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${currentStreak >= 30 ? "bg-purple-500/10" : currentStreak >= 7 ? "bg-blue-500/10" : "bg-orange-500/10"}`}>
                    <Flame className={`h-3.5 w-3.5 ${flameColor}`} />
                    <span className={`text-xs font-bold tabular-nums ${flameColor}`}>{currentStreak}</span>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-cyan-500/10">
                    <Gem className="h-3.5 w-3.5 text-cyan-500" />
                    <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 tabular-nums">{gems}</span>
                  </div>
                </div>
              </div>

              <XPProgressBar currentXP={totalXP} level={level} />

              <Button
                onClick={() => setLogDialogOpen(true)}
                className="w-full rounded-xl gap-2 font-bold shadow-lg shadow-primary/20"
              >
                <Plus className="h-4 w-4" /> {t("common.logMatch")}
              </Button>
            </Card>
          </motion.div>
        )}

        {/* Pending Verifications Alert */}
        {pendingMatches.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
            <button
              onClick={() => navigate("/verify")}
              className="w-full flex items-center justify-between p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <p className="text-xs font-bold text-amber-700 dark:text-amber-400">
                  {pendingMatches.length} {t("home.pendingVerify")}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-amber-500 shrink-0" />
            </button>
          </motion.div>
        )}

        {/* Quick Actions */}
        {quickActions.length > 0 && (
          <section>
            <h2 className="text-sm font-display font-bold text-foreground mb-2.5">{t("common.quickActions")}</h2>
            <div className="grid grid-cols-3 gap-2">
              {quickActions.map((action, i) => (
                <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }}>
                  <button
                    onClick={() => action.path ? navigate(action.path) : action.action?.()}
                    className="w-full p-3 rounded-xl bg-card border border-border hover:border-primary/30 hover:bg-primary/5 transition-all active:scale-95 text-left shadow-sm"
                  >
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center mb-2 ${toneClass(action.tone)}`}>
                      <action.icon className="h-4 w-4" />
                    </div>
                    <p className="text-[11px] font-semibold text-foreground leading-tight">{action.label}</p>
                  </button>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Upcoming Events */}
        {session && upcomingEvents.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-2.5">
              <h2 className="text-sm font-display font-bold text-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                {t("events.upcoming")}
              </h2>
            </div>
            <div className="space-y-2">
              {upcomingEvents.slice(0, 3).map((ev, i) => {
                const d = new Date(ev.event_date);
                const dateLabel = d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
                return (
                  <motion.button
                    key={ev.id}
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                    onClick={() => navigate(`/group/${ev.group_id}`)}
                    className="w-full text-left"
                  >
                    <Card className="p-3 shadow-card bg-gradient-to-br from-primary/5 via-card to-card hover:border-primary/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-xl shrink-0">
                          {ev.group_emoji ?? "🥎"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-xs font-bold text-foreground truncate">{ev.title}</p>
                            {ev.my_rsvp === "going" && (
                              <span className="text-[9px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded-full">{t("events.rsvp.going")}</span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate">{ev.group_name}</p>
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Clock className="h-2.5 w-2.5" /> {dateLabel}
                            {ev.location && <><span>·</span><span className="truncate">{ev.location}</span></>}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </div>
                    </Card>
                  </motion.button>
                );
              })}
            </div>
          </section>
        )}

        {/* My Groups */}
        {session && myGroups.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-2.5">
              <h2 className="text-sm font-display font-bold text-foreground">{t("home.myGroupsSection")}</h2>
              <button onClick={() => navigate("/groups")} className="text-xs text-primary font-medium">{t("common.seeAll")}</button>
            </div>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {myGroups.slice(0, 5).map((g, i) => (
                <motion.button
                  key={g.id}
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }}
                  onClick={() => navigate(`/group/${g.id}`)}
                  className="shrink-0 w-32 p-3 rounded-xl bg-gradient-to-br from-primary/5 via-card to-card border border-border hover:border-primary/30 transition-all text-left"
                >
                  <div className="text-2xl mb-1">{g.cover_emoji}</div>
                  <p className="text-xs font-bold text-foreground truncate">{g.name}</p>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-0.5 mt-0.5">
                    <Users className="h-2.5 w-2.5" /> {g.member_count}
                  </p>
                </motion.button>
              ))}
            </div>
          </section>
        )}

        {/* Active Tournaments */}
        {activeTournaments.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-2.5">
              <h2 className="text-sm font-display font-bold text-foreground">{t("home.activeTournaments")}</h2>
              <button onClick={() => navigate("/tournaments")} className="text-xs text-primary font-medium">{t("common.seeAll")}</button>
            </div>
            <div className="space-y-2">
              {activeTournaments.map((tour, i) => {
                const total = tour.categories.flatMap(c => [...c.pools.flatMap(p => p.matches), ...c.bracketRounds.flatMap(r => r.matches)]).length;
                const done = tour.categories.flatMap(c => [...c.pools.flatMap(p => p.matches), ...c.bracketRounds.flatMap(r => r.matches)]).filter(m => m.status === "completed").length;
                const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                return (
                  <motion.div key={tour.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                    <button
                      onClick={() => navigate(`/tour-manager/${tour.id}`)}
                      className="w-full text-left"
                    >
                      <Card className="p-3 shadow-card hover:border-primary/30 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{tour.name}</p>
                            <p className="text-[11px] text-muted-foreground">{tour.date} · {tour.location}</p>
                          </div>
                          <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full shrink-0 ml-2">LIVE</span>
                        </div>
                        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1 tabular-nums">{done}/{total} {t("home.matchesDone")}</p>
                      </Card>
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </section>
        )}

        {/* Marketplace Preview */}
        {featuredStores.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-2.5">
              <h2 className="text-sm font-display font-bold text-foreground">{t("home.featuredStores")}</h2>
              <button onClick={() => navigate("/marketplace")} className="text-xs text-primary font-medium">{t("common.seeAll")}</button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {featuredStores.map((store, i) => (
                <motion.div key={store.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }}>
                  <button onClick={() => navigate(`/store/${store.id}`)} className="w-full text-left">
                    <Card className="p-3 shadow-card hover:border-primary/30 transition-colors h-full">
                      <div className="flex items-center gap-2 mb-1.5">
                        {store.logo_url ? (
                          <img src={store.logo_url} alt={store.name} className="h-8 w-8 rounded-lg object-cover shrink-0" />
                        ) : (
                          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <ShoppingBag className="h-4 w-4 text-primary" />
                          </div>
                        )}
                        <p className="text-xs font-semibold text-foreground truncate">{store.name}</p>
                      </div>
                      {store.address && (
                        <p className="text-[10px] text-muted-foreground truncate flex items-center gap-0.5">
                          <MapPin className="h-2.5 w-2.5 shrink-0" /> {store.address}
                        </p>
                      )}
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                        <span className="text-[10px] font-medium text-foreground tabular-nums">{store.avg_rating.toFixed(1)}</span>
                        <span className="text-[10px] text-muted-foreground">({store.review_count})</span>
                        {store.map_url && (
                          <ExternalLink className="h-2.5 w-2.5 text-muted-foreground ml-auto" />
                        )}
                      </div>
                    </Card>
                  </button>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Guest CTA */}
        {!session && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="p-6 text-center shadow-card bg-gradient-to-br from-primary/5 via-card to-card space-y-3">
              <Trophy className="h-10 w-10 mx-auto text-primary" />
              <div>
                <h2 className="text-base font-display font-bold text-foreground">{t("home.guestTitle")}</h2>
                <p className="text-xs text-muted-foreground mt-1">{t("home.guestDesc")}</p>
              </div>
              <Button onClick={() => navigate("/login")} className="w-full rounded-xl font-bold">
                {t("common.loginNow")}
              </Button>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
