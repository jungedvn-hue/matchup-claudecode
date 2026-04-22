import { motion } from "framer-motion";
import { ArrowLeft, Trophy, Target, TrendingUp, Zap, Flame } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { playerStats } from "@/data/profile";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line, Tooltip } from "recharts";
import { useLanguage } from "@/i18n/LanguageContext";

const StatisticsPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const s = playerStats;

  return (
    <div className="pb-20 min-h-screen">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-lg font-display font-bold text-foreground">{t("statistics.title")}</h1>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-5">
        {/* Key Stats */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { icon: Target, label: t("statistics.totalMatches"), value: s.totalMatches, color: "text-primary" },
            { icon: Trophy, label: t("statistics.winRate"), value: `${s.winRate}%`, color: "text-primary" },
            { icon: Flame, label: t("statistics.currentStreak"), value: `${s.currentStreak} ${t("common.matches")}`, color: "text-orange-500" },
            { icon: Zap, label: t("statistics.bestStreak"), value: `${s.bestStreak} ${t("common.matches")}`, color: "text-yellow-500" },
          ].map((stat, i) => (
            <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
              <Card className="p-3 shadow-card">
                <stat.icon className={`h-4 w-4 ${stat.color} mb-1`} />
                <p className="text-lg font-display font-bold text-card-foreground">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground">{stat.label}</p>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Win/Loss */}
        <Card className="p-4 shadow-card">
          <h3 className="text-sm font-display font-semibold text-card-foreground mb-3">{t("statistics.winLoss")}</h3>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xs text-primary font-semibold">{s.wins}W</span>
            <Progress value={(s.wins / s.totalMatches) * 100} className="flex-1 h-2.5" />
            <span className="text-xs text-destructive font-semibold">{s.losses}L</span>
          </div>
        </Card>

        {/* Monthly Chart */}
        <Card className="p-4 shadow-card">
          <h3 className="text-sm font-display font-semibold text-card-foreground mb-3">{t("statistics.monthlyMatches")}</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={s.monthlyMatches}>
              <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={20} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              <Bar dataKey="wins" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name={t("common.win")} />
              <Bar dataKey="losses" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} name={t("common.loss")} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Skill Progress */}
        <Card className="p-4 shadow-card">
          <h3 className="text-sm font-display font-semibold text-card-foreground mb-3">{t("statistics.ratingProgress")}</h3>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={s.skillProgress}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis domain={[2.5, 5]} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={25} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              <Line type="monotone" dataKey="rating" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))", r: 3 }} name="Rating" />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Top Partners */}
        <Card className="p-4 shadow-card">
          <h3 className="text-sm font-display font-semibold text-card-foreground mb-3">{t("statistics.topPartners")}</h3>
          <div className="space-y-2.5">
            {s.topPartners.map((p, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-muted-foreground w-4">{i + 1}</span>
                  <span className="text-sm font-medium text-card-foreground">{p.name}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{p.matches} {t("common.matches")}</span>
                  <span className="text-primary font-semibold">{p.winRate}%</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default StatisticsPage;
