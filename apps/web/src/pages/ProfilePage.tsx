import { useState } from "react";
import { motion } from "framer-motion";

import {
  Settings, ChevronRight, Trophy, Target, TrendingUp,
  Users, Star, MapPin, Edit, Flame, LogOut, Ticket, Heart,
  ShieldCheck, Activity, LayoutDashboard, Coins, Gavel, Building2, Store,
  Sparkles, BarChart3,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import SkillBadge from "@/components/SkillBadge";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import XPProgressBar from "@/components/XPProgressBar";
import LogMatchDialog from "@/components/LogMatchDialog";
import { useAuth } from "@/context/AuthContext";
import { useRoles, hasRole } from "@/hooks/use-roles";
import { toast } from "sonner";
import { usePlayerProfile, usePlayerStats, useMatchRecords, type MatchRecord } from "@/hooks/useMatches";
import { useStreak } from "@/hooks/useGamification";
import { usePointBalance, formatPoint } from "@/hooks/usePoints";
import PageHeader from "@/components/PageHeader";
import { usePendingFriendCount } from "@/hooks/useFriends";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type SkillLevel = "beginner" | "intermediate" | "advanced" | "pro";

// ── Settings-style primitives ────────────────────────────────────────
type RowProps = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: React.ReactNode;
  badge?: number;
  destructive?: boolean;
  onClick?: () => void;
  iconBg?: string;
  iconColor?: string;
};
const Row = ({ icon: Icon, label, value, badge, destructive, onClick, iconBg = "bg-primary/10", iconColor = "text-primary" }: RowProps) => (
  <button
    onClick={onClick}
    className="w-full flex items-center gap-3 px-3.5 py-3 hover:bg-secondary/40 transition-colors text-left"
  >
    <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${destructive ? "bg-destructive/10 text-destructive" : `${iconBg} ${iconColor}`}`}>
      <Icon className="h-3.5 w-3.5" />
    </div>
    <span className={`flex-1 text-sm font-medium ${destructive ? "text-destructive" : "text-foreground"}`}>{label}</span>
    {badge !== undefined && badge > 0 && (
      <span className="h-5 min-w-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center tabular-nums">{badge}</span>
    )}
    {value !== undefined && <span className="text-xs text-muted-foreground truncate max-w-[40%]">{value}</span>}
    <ChevronRight className={`h-4 w-4 ${destructive ? "text-destructive/60" : "text-muted-foreground/60"}`} />
  </button>
);

const GroupLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-3 mt-5 mb-1.5">{children}</p>
);

const SectionCard = ({ children }: { children: React.ReactNode }) => (
  <Card className="overflow-hidden divide-y divide-border/60 rounded-2xl shadow-sm">{children}</Card>
);

const ProfilePage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const { user, signOut, session } = useAuth();
  const roles = useRoles();
  const { profile } = usePlayerProfile();
  const { stats, loading: statsLoading } = usePlayerStats();
  const { matches, refetch: refetchMatches } = useMatchRecords({ limit: 4 });
  const { streak, loading: streakLoading } = useStreak();
  const { count: pendingFriends } = usePendingFriendCount();
  const { balance } = usePointBalance();

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success(t("common.logoutSuccess"));
      navigate("/login");
    } catch {
      toast.error(t("common.logoutError"));
    }
  };

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center gap-6">
        <div className="h-20 w-20 rounded-3xl bg-primary/10 flex items-center justify-center">
          <Users className="h-10 w-10 text-primary" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-display font-bold">{t("common.notLoggedIn")}</h2>
          <p className="text-muted-foreground">{t("common.loginToView")}</p>
        </div>
        <Button onClick={() => navigate("/login")} className="w-full max-w-[200px] rounded-xl font-bold">
          {t("common.loginNow")}
        </Button>
      </div>
    );
  }

  const displayName = profile?.display_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const skill = (profile?.skill_level as SkillLevel) || "beginner";
  const totalXP = profile?.total_xp ?? 0;
  const level = profile?.current_level ?? 1;
  const dupr = profile?.dupr_rating ?? 2.0;

  const myMatchView = (m: MatchRecord) => {
    if (!user) return null;
    const isSubmitter = m.submitter_user_id === user.id;
    const other = isSubmitter ? m.opponent_profile : m.submitter_profile;
    const isWon = isSubmitter ? m.result === "won" : m.result === "lost";
    const sets: string[] = [];
    for (let s = 1; s <= 5; s++) {
      const sub = (m as unknown as Record<string, number | null>)[`submitter_score_set${s}`];
      const opp = (m as unknown as Record<string, number | null>)[`opponent_score_set${s}`];
      if (sub != null && opp != null) {
        sets.push(isSubmitter ? `${sub}-${opp}` : `${opp}-${sub}`);
      }
    }
    const date = new Date(m.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" });
    return { name: other?.display_name || "Unknown", isWon, score: sets.join(", "), date, verified: m.verified };
  };

  const hasBusinessRole =
    hasRole(roles, "host") || hasRole(roles, "court_owner") ||
    hasRole(roles, "store_owner") || hasRole(roles, "referee");

  return (
    <div className="pb-24 min-h-screen">
      <LogMatchDialog open={logDialogOpen} onOpenChange={setLogDialogOpen} onCreated={refetchMatches} />

      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("settings.logout")}</AlertDialogTitle>
            <AlertDialogDescription>{t("settings.logoutConfirm")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("settings.logout")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PageHeader title={t("profile.title")} right={
        <button onClick={() => navigate("/settings")} aria-label={t("settings.title")}
          className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground">
          <Settings className="h-4 w-4" />
        </button>
      } />

      <div className="px-3 pt-4 max-w-2xl mx-auto">
        {/* Hero card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="px-1">
          <Card className="p-4 shadow-card overflow-hidden bg-gradient-to-br from-primary/5 via-card to-card space-y-4 rounded-2xl">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 ring-2 ring-primary/20">
                {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
                <AvatarFallback className="bg-primary/10 text-primary font-display font-bold text-xl">
                  {displayName[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-display font-bold text-card-foreground truncate">{displayName}</h2>
                  <SkillBadge level={skill} />
                </div>
                {profile?.location && (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[11px] text-muted-foreground truncate">{profile.location}</span>
                  </div>
                )}
                <Button size="sm" variant="outline" onClick={() => navigate("/edit-profile")} className="h-7 text-[10px] rounded-lg border-primary/20 hover:bg-primary/5 mt-2">
                  <Edit className="h-3 w-3 mr-1" /> {t("common.edit")}
                </Button>
              </div>
            </div>

            <XPProgressBar currentXP={totalXP} level={level} />

            <Button onClick={() => setLogDialogOpen(true)} className="w-full rounded-xl gap-2 font-bold shadow-lg shadow-primary/20">
              <Trophy className="h-4 w-4" /> {t("common.logMatch")}
            </Button>
          </Card>
        </motion.div>

        {/* Stat tiles — clickable shortcuts */}
        <div className="grid grid-cols-4 gap-2 mt-4 px-1">
          {[
            { tone: "primary", icon: Target, value: stats.totalMatches, label: t("common.matches"), to: "/statistics", loading: statsLoading },
            { tone: "emerald", icon: TrendingUp, value: `${stats.winRate}%`, label: t("statistics.winRate"), to: "/statistics", loading: statsLoading },
            { tone: "amber", icon: Star, value: dupr.toFixed(2), label: "DUPR", to: "/statistics", loading: false },
            { tone: "blue", icon: Flame, value: streak?.current_streak ?? 0, label: t("profile.streak"), to: "/statistics", loading: streakLoading },
          ].map((s, i) => (
            <motion.button
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => navigate(s.to)}
              className="text-left"
            >
              <Card className="p-2.5 shadow-card text-center bg-card hover:border-primary/30 transition-colors">
                <div className={`h-7 w-7 mx-auto mb-1.5 rounded-lg flex items-center justify-center ${
                  s.tone === "primary" ? "bg-primary/10 text-primary" :
                  s.tone === "emerald" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                  s.tone === "amber" ? "bg-amber-500/10 text-amber-600 dark:text-amber-500" :
                  "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                }`}>
                  <s.icon className="h-3.5 w-3.5" />
                </div>
                {s.loading ? (
                  <div className="h-4 w-8 mx-auto rounded bg-muted animate-pulse" />
                ) : (
                  <p className="text-base font-display font-bold text-card-foreground tabular-nums leading-none">{s.value}</p>
                )}
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-1">{s.label}</p>
              </Card>
            </motion.button>
          ))}
        </div>

        {/* Recent matches */}
        <section className="mt-5 px-1">
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-sm font-display font-semibold text-foreground">{t("profile.recentMatches")}</h2>
            <button onClick={() => navigate("/match-history")} className="text-xs text-primary font-medium">{t("common.seeAll")}</button>
          </div>
          {matches.length === 0 ? (
            <Card className="p-6 text-center shadow-card rounded-2xl">
              <Trophy className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-xs text-muted-foreground">{t("profile.noMatches")}</p>
            </Card>
          ) : (
            <Card className="shadow-card overflow-hidden rounded-2xl">
              {matches.map((m, i) => {
                const v = myMatchView(m);
                if (!v) return null;
                return (
                  <div key={m.id} className={`flex items-center justify-between px-3.5 py-2.5 ${i < matches.length - 1 ? "border-b border-border" : ""}`}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`h-2 w-2 rounded-full shrink-0 ${v.isWon ? "bg-primary" : "bg-destructive"}`} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-card-foreground truncate">vs {v.name}</p>
                        <p className="text-[11px] text-muted-foreground tabular-nums">{v.score}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-xs font-semibold ${v.isWon ? "text-primary dark:text-primary" : "text-destructive"}`}>
                        {v.isWon ? t("common.won") : t("common.lost")}
                        {!v.verified && <span className="text-[9px] text-amber-600 dark:text-amber-500 ml-1">·{t("profile.pending")}</span>}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{v.date}</p>
                    </div>
                  </div>
                );
              })}
            </Card>
          )}
        </section>

        {/* ── Grouped menu (Settings style) ────────────────────────── */}

        {/* Discover */}
        <GroupLabel>{t("profile.group.discover")}</GroupLabel>
        <SectionCard>
          <Row icon={Sparkles} label={t("arena.title")} onClick={() => navigate("/arena")} iconBg="bg-violet-500/10" iconColor="text-violet-600 dark:text-violet-400" />
        </SectionCard>

        {/* Activity */}
        <GroupLabel>{t("profile.group.activity")}</GroupLabel>
        <SectionCard>
          <Row icon={Ticket} label={t("profile.myTickets")} onClick={() => navigate("/my-tickets")} iconBg="bg-blue-500/10" iconColor="text-blue-600 dark:text-blue-400" />
          <Row icon={Activity} label={t("profile.myBookings")} onClick={() => navigate("/my-bookings")} iconBg="bg-emerald-500/10" iconColor="text-emerald-600 dark:text-emerald-400" />
          <Row icon={BarChart3} label={t("profile.statistics")} onClick={() => navigate("/statistics")} iconBg="bg-amber-500/10" iconColor="text-amber-600 dark:text-amber-500" />
        </SectionCard>

        {/* Social */}
        <GroupLabel>{t("profile.group.social")}</GroupLabel>
        <SectionCard>
          <Row icon={Users} label={t("friends.title")} badge={pendingFriends} onClick={() => navigate("/friends")} />
          <Row icon={Heart} label={t("profile.favoritePartners")} onClick={() => navigate("/favorite-partners")} iconBg="bg-rose-500/10" iconColor="text-rose-500" />
        </SectionCard>

        {/* Finance */}
        <GroupLabel>{t("profile.group.finance")}</GroupLabel>
        <SectionCard>
          <Row
            icon={Coins}
            label={t("wallet.title")}
            value={balance ? `${formatPoint(balance.balance)} 🪙` : undefined}
            onClick={() => navigate("/wallet")}
            iconBg="bg-amber-500/10"
            iconColor="text-amber-600 dark:text-amber-500"
          />
        </SectionCard>

        {/* Business (only if any role) */}
        {hasBusinessRole && (
          <>
            <GroupLabel>{t("profile.group.business")}</GroupLabel>
            <SectionCard>
              {(hasRole(roles, "host") || hasRole(roles, "court_owner")) && (
                <Row icon={LayoutDashboard} label={t("nav.host")} onClick={() => navigate("/dashboard")} iconBg="bg-indigo-500/10" iconColor="text-indigo-600 dark:text-indigo-400" />
              )}
              {hasRole(roles, "court_owner") && (
                <Row icon={Building2} label={t("profile.myVenues")} onClick={() => navigate("/my-venues")} iconBg="bg-cyan-500/10" iconColor="text-cyan-600 dark:text-cyan-400" />
              )}
              {hasRole(roles, "store_owner") && (
                <Row icon={Store} label={t("store.dashboard.title")} onClick={() => navigate("/my-store")} iconBg="bg-fuchsia-500/10" iconColor="text-fuchsia-600 dark:text-fuchsia-400" />
              )}
              {hasRole(roles, "referee") && (
                <Row icon={Gavel} label={t("profile.refereeHub")} onClick={() => navigate("/referee")} iconBg="bg-orange-500/10" iconColor="text-orange-600 dark:text-orange-400" />
              )}
            </SectionCard>
          </>
        )}

        {/* Account */}
        <GroupLabel>{t("profile.group.account")}</GroupLabel>
        <SectionCard>
          <Row icon={ShieldCheck} label={t("verify.title")} onClick={() => navigate("/verify")} iconBg="bg-emerald-500/10" iconColor="text-emerald-600 dark:text-emerald-400" />
          <Row icon={Settings} label={t("settings.title")} onClick={() => navigate("/settings")} iconBg="bg-secondary" iconColor="text-foreground" />
          <Row icon={LogOut} label={t("settings.logout")} destructive onClick={() => setLogoutOpen(true)} />
        </SectionCard>

      </div>
    </div>
  );
};

export default ProfilePage;
