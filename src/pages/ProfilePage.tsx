import { useState } from "react";
import { motion } from "framer-motion";

import {
  Settings, ChevronRight, Trophy, Target, TrendingUp,
  Calendar, Users, Star, Award, BarChart3, MapPin, Edit
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import SkillBadge from "@/components/SkillBadge";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { playerStats } from "@/data/profile";
import XPProgressBar from "@/components/XPProgressBar";
import LogMatchDialog from "@/components/LogMatchDialog";
import { Flame, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const stats = [
  { labelKey: "common.matches", value: playerStats.totalMatches, icon: Target },
  { labelKey: "statistics.winRate", value: `${playerStats.winRate}%`, icon: TrendingUp },
  { labelKey: "profile.title", value: playerStats.verifiedRating.toFixed(2), icon: Star, overrideLabel: "DUPR" },
  { labelKey: "stats.myGroups", value: "3", icon: Users },
];

const recentMatches = [
  { opponent: "Tom R.", resultKey: "won", score: "11-7, 11-9", dateKey: "common.today" },
  { opponent: "Sarah L.", resultKey: "won", score: "11-5, 11-8", dateKey: "common.yesterday" },
  { opponent: "Alex K.", resultKey: "lost", score: "9-11, 7-11", date: "Mar 15" },
  { opponent: "James P.", resultKey: "won", score: "11-3, 11-6", date: "Mar 14" },
];

const achievements = [
  { name: "First Win", icon: "🏆", earned: true },
  { name: "50 Matches", icon: "⭐", earned: true },
  { name: "Tournament Win", icon: "🥇", earned: true },
  { name: "100 Wins", icon: "💎", earned: false },
];

const ProfilePage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const { user, signOut, session } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success("Đã đăng xuất thành công");
      navigate("/login");
    } catch (error) {
      toast.error("Lỗi khi đăng xuất");
    }
  };

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center gap-6">
        <div className="h-20 w-20 rounded-3xl bg-primary/10 flex items-center justify-center">
          <Users className="h-10 w-10 text-primary" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-display font-bold">Bạn chưa đăng nhập</h2>
          <p className="text-muted-foreground">Vui lòng đăng nhập để xem hồ sơ và tham gia các giải đấu.</p>
        </div>
        <Button onClick={() => navigate("/login")} className="w-full max-w-[200px] rounded-xl font-bold">
          Đăng nhập ngay
        </Button>
      </div>
    );
  }

  return (
    <div className="pb-20 min-h-screen">
      <LogMatchDialog open={logDialogOpen} onOpenChange={setLogDialogOpen} />
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-display font-bold text-foreground">{t("profile.title")}</h1>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-orange-500/10 text-orange-500 px-2.5 py-1 rounded-full border border-orange-500/20">
              <Flame className="h-3.5 w-3.5 fill-orange-500" />
              <span className="text-xs font-bold">{playerStats.activeStreak}</span>
            </div>
            <button onClick={() => navigate("/settings")} className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground">
              <Settings className="h-4 w-4" />
            </button>
            <button onClick={handleLogout} className="h-9 w-9 rounded-xl bg-destructive/10 flex items-center justify-center text-destructive hover:bg-destructive/20 transition-colors">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-5">
        {/* Profile Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-4 shadow-card space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-primary/10 text-primary font-display font-bold text-xl">
                  {user?.email?.[0].toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-display font-bold text-card-foreground">
                    {user?.user_metadata?.full_name || user?.email?.split('@')[0] || "User"}
                  </h2>
                  <SkillBadge level="advanced" />
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <MapPin className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">San Francisco, CA</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Button size="sm" variant="outline" onClick={() => navigate("/edit-profile")} className="h-7 text-[10px] rounded-lg border-primary/20 hover:bg-primary/5">
                    <Edit className="h-3 w-3 mr-1" /> {t("common.edit")}
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => navigate("/settings")} className="h-7 w-7 rounded-lg text-muted-foreground">
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            
            <XPProgressBar currentXP={playerStats.currentXP} level={playerStats.level} />

            <div className="flex gap-2">
              <Button onClick={() => setLogDialogOpen(true)} className="flex-1 rounded-xl gap-2 font-bold shadow-lg shadow-primary/20">
                <Trophy className="h-4 w-4" /> {t("common.logMatch") || "Ghi điểm"}
              </Button>
              <Button variant="outline" size="icon" onClick={() => navigate("/edit-profile")} className="rounded-xl shrink-0">
                <Edit className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2">
          {stats.map((stat, i) => (
            <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.06 }}>
              <Card className="p-2.5 shadow-card text-center">
                <stat.icon className="h-4 w-4 mx-auto text-primary mb-1" />
                <p className="text-lg font-display font-bold text-card-foreground">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground">{stat.overrideLabel || t(stat.labelKey)}</p>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Achievements */}
        <section>
          <h2 className="text-sm font-display font-semibold text-foreground mb-2.5">{t("profile.achievements")}</h2>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
            {achievements.map((a, i) => (
              <div key={i} className={`flex flex-col items-center gap-1 min-w-[60px] ${!a.earned ? "opacity-40" : ""}`}>
                <div className="h-12 w-12 rounded-xl bg-neon/10 flex items-center justify-center text-2xl">{a.icon}</div>
                <span className="text-[10px] font-medium text-foreground text-center">{a.name}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Recent Matches */}
        <section>
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-sm font-display font-semibold text-foreground">{t("profile.recentMatches")}</h2>
            <button className="text-xs text-primary font-medium">{t("common.seeAll")}</button>
          </div>
          <Card className="shadow-card overflow-hidden">
            {recentMatches.map((match, i) => {
              const isWon = match.resultKey === "won";
              return (
                <div key={i} className={`flex items-center justify-between px-3.5 py-2.5 ${i < recentMatches.length - 1 ? "border-b border-border" : ""}`}>
                  <div className="flex items-center gap-2.5">
                    <div className={`h-2 w-2 rounded-full ${isWon ? "bg-primary" : "bg-destructive"}`} />
                    <div>
                      <p className="text-sm font-medium text-card-foreground">vs {match.opponent}</p>
                      <p className="text-[11px] text-muted-foreground">{match.score}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-xs font-semibold ${isWon ? "text-primary" : "text-destructive"}`}>{isWon ? t("common.won") : t("common.lost")}</p>
                    <p className="text-[10px] text-muted-foreground">{match.dateKey ? t(match.dateKey) : match.date}</p>
                  </div>
                </div>
              );
            })}
          </Card>
        </section>

        {/* Menu Items */}
        <section className="space-y-1">
          {[
            { label: t("profile.myTickets"), path: "/my-tickets" },
            { label: t("profile.favoritePartners"), path: "/favorite-partners" },
            { label: t("profile.matchHistory"), path: "/match-history" },
            { label: t("profile.statistics"), path: "/statistics", icon: <BarChart3 className="h-4 w-4" /> },
            { label: t("profile.roleSettings"), path: "/settings", icon: <Settings className="h-4 w-4" /> },
          ].map((item, i) => (
            <button key={i} onClick={() => item.path && navigate(item.path)} className="w-full flex items-center justify-between px-3.5 py-3 rounded-xl hover:bg-secondary/50 transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground">{item.icon}</span>
                <span className="text-sm font-medium text-foreground">{item.label}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
          
          <button 
            onClick={handleLogout} 
            className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl hover:bg-destructive/5 text-destructive transition-colors mt-2"
          >
            <LogOut className="h-4 w-4" />
            <span className="text-sm font-semibold select-none">Đăng xuất</span>
          </button>
        </section>
      </div>
    </div>
  );
};

export default ProfilePage;
