import { useState } from "react";
import { motion } from "framer-motion";

import {
  Settings, ChevronRight, Trophy, Target, TrendingUp,
  Users, Star, BarChart3, MapPin, Edit, Flame, LogOut, Sparkles,
  Ticket, Heart, History, ShieldCheck, Activity, LayoutDashboard,
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
import { usePendingFriendCount } from "@/hooks/useFriends";

type SkillLevel = "beginner" | "intermediate" | "advanced" | "pro";

const ProfilePage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const { user, signOut, session } = useAuth();
  const roles = useRoles();
  const { profile } = usePlayerProfile();
  const { stats } = usePlayerStats();
  const { matches, refetch: refetchMatches } = useMatchRecords({ limit: 4 });
  const { streak } = useStreak();
  const { count: pendingFriends } = usePendingFriendCount();

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

  return (
    <div className="pb-20 min-h-screen">
      <LogMatchDialog open={logDialogOpen} onOpenChange={setLogDialogOpen} onCreated={refetchMatches} />
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-display font-bold text-foreground">{t("profile.title")}</h1>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/settings")} className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground">
              <Settings className="h-4 w-4" />
            </button>
            <button onClick={handleLogout} className="h-9 w-9 rounded-xl bg-destructive/10 flex items-center justify-center text-destructive hover:bg-destructive/20 transition-colors">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 max-w-2xl mx-auto space-y-4">
        {/* Hero card — Health Hub gradient */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-4 shadow-card overflow-hidden bg-gradient-to-br from-primary/5 via-card to-card space-y-4">
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

        {/* Stat tiles — Health Hub color tiers */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { tone: "primary", icon: Target, value: stats.totalMatches, label: t("common.matches") },
            { tone: "emerald", icon: TrendingUp, value: `${stats.winRate}%`, label: t("statistics.winRate") },
            { tone: "amber", icon: Star, value: dupr.toFixed(2), label: "DUPR" },
            { tone: "blue", icon: Flame, value: streak?.current_streak ?? 0, label: t("profile.streak") },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
              <Card className="p-2.5 shadow-card text-center bg-card">
                <div className={`h-7 w-7 mx-auto mb-1.5 rounded-lg flex items-center justify-center ${
                  s.tone === "primary" ? "bg-primary/10 text-primary" :
                  s.tone === "emerald" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                  s.tone === "amber" ? "bg-amber-500/10 text-amber-600 dark:text-amber-500" :
                  "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                }`}>
                  <s.icon className="h-3.5 w-3.5" />
                </div>
                <p className="text-base font-display font-bold text-card-foreground tabular-nums leading-none">{s.value}</p>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-1">{s.label}</p>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Recent matches */}
        <section>
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-sm font-display font-semibold text-foreground">{t("profile.recentMatches")}</h2>
            <button onClick={() => navigate("/match-history")} className="text-xs text-primary font-medium">{t("common.seeAll")}</button>
          </div>
          {matches.length === 0 ? (
            <Card className="p-6 text-center shadow-card">
              <Trophy className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-xs text-muted-foreground">{t("profile.noMatches")}</p>
            </Card>
          ) : (
            <Card className="shadow-card overflow-hidden">
              {matches.map((m, i) => {
                const v = myMatchView(m);
                if (!v) return null;
                return (
                  <div key={m.id} className={`flex items-center justify-between px-3.5 py-2.5 ${i < matches.length - 1 ? "border-b border-border" : ""}`}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`h-2 w-2 rounded-full shrink-0 ${v.isWon ? "bg-emerald-500" : "bg-destructive"}`} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-card-foreground truncate">vs {v.name}</p>
                        <p className="text-[11px] text-muted-foreground tabular-nums">{v.score}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-xs font-semibold ${v.isWon ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
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

        {/* Menu */}
        <section className="space-y-1">
          {[
            { label: t("arena.title"), path: "/arena", icon: <Sparkles className="h-4 w-4" /> },
            { label: t("nav.health"), path: "/health", icon: <Activity className="h-4 w-4" /> },
            { label: t("profile.myTickets"), path: "/my-tickets", icon: <Ticket className="h-4 w-4" /> },
            { label: t("friends.title"), path: "/friends", icon: <Users className="h-4 w-4" />, badge: pendingFriends },
            { label: t("profile.favoritePartners"), path: "/favorite-partners", icon: <Heart className="h-4 w-4" /> },
            { label: t("profile.matchHistory"), path: "/match-history", icon: <History className="h-4 w-4" /> },
            { label: t("verify.title"), path: "/verify", icon: <ShieldCheck className="h-4 w-4" /> },
            { label: t("profile.statistics"), path: "/statistics", icon: <BarChart3 className="h-4 w-4" /> },
            (hasRole(roles, "host") || hasRole(roles, "court_owner")) && { label: t("nav.host"), path: "/dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
            { label: t("settings.title"), path: "/settings", icon: <Settings className="h-4 w-4" /> },
          ].filter(Boolean).map((item: any, i) => (
            <button key={i} onClick={() => item.path && navigate(item.path)} className="w-full flex items-center justify-between px-3.5 py-3 rounded-xl hover:bg-secondary/50 transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground">{item.icon}</span>
                <span className="text-sm font-medium text-foreground">{item.label}</span>
              </div>
              <div className="flex items-center gap-2">
                {item.badge > 0 && (
                  <span className="h-5 min-w-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center tabular-nums">{item.badge}</span>
                )}
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </button>
          ))}
        </section>
      </div>
    </div>
  );
};

export default ProfilePage;
