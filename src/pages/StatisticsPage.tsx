import { motion } from "framer-motion";
import { ArrowLeft, Trophy, Target, Zap, Flame } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line, Tooltip } from "recharts";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { useMatchRecords, usePlayerProfile, type MatchRecord } from "@/hooks/useMatches";
import { useStreak } from "@/hooks/useGamification";

interface MonthBucket { month: string; wins: number; losses: number }

const StatisticsPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { matches } = useMatchRecords();
  const { profile } = usePlayerProfile();
  const { streak } = useStreak();

  const data = useMemo(() => {
    if (!user) return null;
    let wins = 0, losses = 0;
    const months = new Map<string, MonthBucket>();
    const partners = new Map<string, { name: string; played: number; wins: number }>();
    const ratingTrend: Array<{ date: string; rating: number }> = [];
    let runningRating = profile?.dupr_rating ?? 2.0;
    // Build trend backwards: latest verified matches give us deltas
    const verified = matches.filter(m => m.verified).slice().reverse();
    for (const m of verified) {
      const isSubmitter = m.submitter_user_id === user.id;
      const delta = isSubmitter ? (m.dupr_delta_submitter ?? 0) : (m.dupr_delta_opponent ?? 0);
      ratingTrend.push({ date: new Date(m.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }), rating: Number((runningRating).toFixed(2)) });
      runningRating = runningRating - delta; // step back in time
    }
    ratingTrend.reverse();

    for (const m of matches) {
      const isSubmitter = m.submitter_user_id === user.id;
      const isWon = isSubmitter ? m.result === "won" : m.result === "lost";
      if (m.verified) {
        if (isWon) wins++; else losses++;
      }
      const dt = new Date(m.created_at);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
      const monthLabel = dt.toLocaleDateString(undefined, { month: "short" });
      const bucket = months.get(key) ?? { month: monthLabel, wins: 0, losses: 0 };
      if (m.verified) {
        if (isWon) bucket.wins++; else bucket.losses++;
      }
      months.set(key, bucket);

      const partnerId = isSubmitter ? m.opponent_user_id : m.submitter_user_id;
      const partnerName = (isSubmitter ? m.opponent_profile?.display_name : m.submitter_profile?.display_name) || "Unknown";
      const p = partners.get(partnerId) ?? { name: partnerName, played: 0, wins: 0 };
      p.played++;
      if (m.verified && isWon) p.wins++;
      partners.set(partnerId, p);
    }

    const monthly = Array.from(months.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([, v]) => v);

    const top = Array.from(partners.values())
      .sort((a, b) => b.played - a.played)
      .slice(0, 5)
      .map(p => ({ name: p.name, matches: p.played, winRate: p.played ? Math.round((p.wins / p.played) * 100) : 0 }));

    const total = wins + losses;
    return {
      total, wins, losses,
      winRate: total ? Math.round((wins / total) * 100) : 0,
      monthly,
      ratingTrend,
      topPartners: top,
    };
  }, [matches, user, profile?.dupr_rating]);

  const currentStreak = streak?.current_streak ?? 0;
  const bestStreak = streak?.longest_streak ?? 0;

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

      <div className="px-4 pt-4 max-w-2xl mx-auto space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {[
            { icon: Target, label: t("statistics.totalMatches"), value: data?.total ?? 0, tone: "primary" },
            { icon: Trophy, label: t("statistics.winRate"), value: `${data?.winRate ?? 0}%`, tone: "emerald" },
            { icon: Flame, label: t("statistics.currentStreak"), value: currentStreak, tone: "blue" },
            { icon: Zap, label: t("statistics.bestStreak"), value: bestStreak, tone: "amber" },
          ].map((stat, i) => (
            <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
              <Card className="p-3 shadow-card">
                <div className={`h-7 w-7 rounded-lg flex items-center justify-center mb-1.5 ${
                  stat.tone === "primary" ? "bg-primary/10 text-primary" :
                  stat.tone === "emerald" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                  stat.tone === "blue" ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" :
                  "bg-amber-500/10 text-amber-600 dark:text-amber-500"
                }`}>
                  <stat.icon className="h-3.5 w-3.5" />
                </div>
                <p className="text-lg font-display font-bold text-card-foreground tabular-nums">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground">{stat.label}</p>
              </Card>
            </motion.div>
          ))}
        </div>

        {data && data.total > 0 && (
          <Card className="p-4 shadow-card">
            <h3 className="text-sm font-display font-semibold text-card-foreground mb-3">{t("statistics.winLoss")}</h3>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold tabular-nums">{data.wins}W</span>
              <Progress value={(data.wins / data.total) * 100} className="flex-1 h-2.5" />
              <span className="text-xs text-destructive font-semibold tabular-nums">{data.losses}L</span>
            </div>
          </Card>
        )}

        {data && data.monthly.length > 0 && (
          <Card className="p-4 shadow-card">
            <h3 className="text-sm font-display font-semibold text-card-foreground mb-3">{t("statistics.monthlyMatches")}</h3>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={data.monthly}>
                <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={20} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Bar dataKey="wins" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name={t("common.win")} />
                <Bar dataKey="losses" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} name={t("common.loss")} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

        {data && data.ratingTrend.length > 1 && (
          <Card className="p-4 shadow-card">
            <h3 className="text-sm font-display font-semibold text-card-foreground mb-3">{t("statistics.ratingProgress")}</h3>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={data.ratingTrend}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis domain={["dataMin - 0.2", "dataMax + 0.2"]} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={30} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Line type="monotone" dataKey="rating" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))", r: 3 }} name="DUPR" />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        )}

        {data && data.topPartners.length > 0 && (
          <Card className="p-4 shadow-card">
            <h3 className="text-sm font-display font-semibold text-card-foreground mb-3">{t("statistics.topPartners")}</h3>
            <div className="space-y-2.5">
              {data.topPartners.map((p, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground w-4 tabular-nums">{i + 1}</span>
                    <span className="text-sm font-medium text-card-foreground truncate">{p.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="tabular-nums">{p.matches}</span>
                    <span className="text-primary font-semibold tabular-nums">{p.winRate}%</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {(!data || data.total === 0) && (
          <Card className="p-6 text-center shadow-card">
            <Trophy className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-xs text-muted-foreground">{t("statistics.empty") || "Chưa có dữ liệu — log một vài trận để xem thống kê"}</p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default StatisticsPage;
