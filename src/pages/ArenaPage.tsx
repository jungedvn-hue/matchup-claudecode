import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Flame, Trophy, Target, Gem, Sparkles, Lock, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { usePlayerProfile } from "@/hooks/useMatches";
import { useStreak, useDailyQuests, useAchievements, useXPHistory } from "@/hooks/useGamification";
import { getTierFromLevel, getXPForLevel } from "@/lib/gamification";
import { toast } from "sonner";
import XPProgressBar from "@/components/XPProgressBar";

const ArenaPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { session } = useAuth();
  const { profile } = usePlayerProfile();
  const { streak } = useStreak();
  const { quests, claim, refetch: refetchQuests } = useDailyQuests();
  const { items: achievements } = useAchievements();
  const { items: xpHistory } = useXPHistory(15);

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <p className="text-sm text-muted-foreground">{t("common.notLoggedIn")}</p>
      </div>
    );
  }

  const totalXP = profile?.total_xp ?? 0;
  const level = profile?.current_level ?? 1;
  const tier = getTierFromLevel(level);
  const tierKey = tier.toLowerCase();
  const gems = profile?.gems ?? 0;
  const currentStreak = streak?.current_streak ?? 0;
  const freezes = streak?.freeze_count ?? 0;
  const xpForNext = getXPForLevel(level);
  const xpForCurr = getXPForLevel(level - 1);

  const handleClaim = async (id: string) => {
    const res = await claim(id);
    if ("error" in res) { toast.error(res.error); return; }
    const gemsSuffix = res.gems > 0 ? t("arena.toast.claimedGems", { gems: res.gems }) : "";
    toast.success(t("arena.toast.claimed", { xp: res.xp, gems: gemsSuffix }));
    refetchQuests();
  };

  const flameColor = currentStreak >= 30 ? "text-purple-500" : currentStreak >= 7 ? "text-blue-500" : "text-orange-500";
  const flameBg = currentStreak >= 30 ? "bg-purple-500/10" : currentStreak >= 7 ? "bg-blue-500/10" : "bg-orange-500/10";

  return (
    <div className="pb-20 min-h-screen">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-lg font-display font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {t("arena.title")}
          </h1>
        </div>
      </div>

      <div className="px-4 pt-4 max-w-2xl mx-auto space-y-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-4 shadow-card overflow-hidden bg-gradient-to-br from-primary/5 via-card to-card space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Trophy className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Level {level}</p>
                  <p className="text-base font-display font-bold text-foreground">{t(`arena.tier.${tierKey}`)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full ${flameBg}`}>
                  <Flame className={`h-3.5 w-3.5 ${flameColor}`} />
                  <span className={`text-xs font-bold ${flameColor} tabular-nums`}>{currentStreak}</span>
                  {freezes > 0 && <span className="text-[10px] text-muted-foreground">+{freezes}❄</span>}
                </div>
                <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-cyan-500/10">
                  <Gem className="h-3.5 w-3.5 text-cyan-500" />
                  <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 tabular-nums">{gems}</span>
                </div>
              </div>
            </div>
            <XPProgressBar currentXP={totalXP} level={level} />
            <p className="text-[10px] text-muted-foreground tabular-nums">
              {t("arena.toNextLevel", { remaining: totalXP - xpForCurr, needed: xpForNext - xpForCurr, nextLevel: level + 1 })}
            </p>
          </Card>
        </motion.div>

        <section className="space-y-2">
          <div className="flex items-center gap-2 ml-1">
            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Target className="h-3.5 w-3.5" />
            </div>
            <h2 className="text-sm font-display font-bold text-foreground">{t("arena.dailyQuests")}</h2>
          </div>
          {quests.length === 0 ? (
            <Card className="p-4 text-center"><p className="text-xs text-muted-foreground">…</p></Card>
          ) : (
            <div className="space-y-2">
              {quests.map(pq => {
                if (!pq.quest) return null;
                const pct = Math.min(100, (pq.progress / pq.quest.target) * 100);
                const claimed = !!pq.claimed_at;
                const tone = pq.quest.is_bonus ? "from-amber-500/8" : "from-primary/5";
                return (
                  <Card key={pq.id} className={`p-3 shadow-card overflow-hidden bg-gradient-to-br ${tone} via-card to-card`}>
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-foreground truncate">{pq.quest.name_vi}</p>
                          {pq.quest.is_bonus && <Badge variant="outline" className="text-[9px] py-0 px-1.5">{t("arena.bonus")}</Badge>}
                        </div>
                        <p className="text-[11px] text-muted-foreground">{pq.quest.description_vi}</p>
                        <div className="mt-2 h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[10px] text-muted-foreground tabular-nums">{pq.progress}/{pq.quest.target}</span>
                          <span className="text-[10px] text-muted-foreground">+{pq.quest.xp_reward} XP{pq.quest.gem_reward > 0 ? ` · +${pq.quest.gem_reward}💎` : ""}</span>
                        </div>
                      </div>
                      {pq.completed && !claimed ? (
                        <Button size="sm" onClick={() => handleClaim(pq.id)} className="h-8 px-3 text-xs">
                          {t("arena.claim")}
                        </Button>
                      ) : claimed ? (
                        <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                          <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                      ) : null}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        <section className="space-y-2">
          <div className="flex items-center gap-2 ml-1">
            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Trophy className="h-3.5 w-3.5" />
            </div>
            <h2 className="text-sm font-display font-bold text-foreground">{t("arena.achievements")}</h2>
            <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">
              {achievements.filter(a => a.unlocked_at).length} / {achievements.length}
            </span>
          </div>
          <Card className="p-3 shadow-card">
            <div className="grid grid-cols-4 gap-2">
              {achievements.map(a => {
                const unlocked = !!a.unlocked_at;
                const aTier = a.current_tier;
                return (
                  <div key={a.id} className={`flex flex-col items-center gap-1 p-2 rounded-lg ${unlocked ? "bg-primary/5" : "bg-secondary/30 opacity-60"}`}>
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${unlocked ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {unlocked ? <Trophy className="h-4 w-4" /> : <Lock className="h-3.5 w-3.5" />}
                    </div>
                    <p className="text-[10px] font-medium text-center leading-tight line-clamp-2">{a.name_vi}</p>
                    {a.max_tier > 1 && (
                      <span className="text-[9px] text-muted-foreground tabular-nums">{aTier}/{a.max_tier}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </section>

        {xpHistory.length > 0 && (
          <section className="space-y-2">
            <div className="flex items-center gap-2 ml-1">
              <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
              <h2 className="text-sm font-display font-bold text-foreground">{t("arena.recentActivity")}</h2>
            </div>
            <Card className="shadow-card overflow-hidden">
              {xpHistory.map((tx, i) => (
                <div key={tx.id} className={`flex items-center justify-between px-3.5 py-2.5 ${i < xpHistory.length - 1 ? "border-b border-border" : ""}`}>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground">{t(`arena.source.${tx.source}`)}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(tx.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">+{tx.amount}</span>
                </div>
              ))}
            </Card>
          </section>
        )}
      </div>
    </div>
  );
};

export default ArenaPage;
