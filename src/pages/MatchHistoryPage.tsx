import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { useMatchRecords, type MatchRecord } from "@/hooks/useMatches";

type FilterType = "all" | "won" | "lost";

const formatDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

const MatchHistoryPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { matches, loading } = useMatchRecords();
  const [filter, setFilter] = useState<FilterType>("all");

  const view = useMemo(() => {
    if (!user) return [];
    return matches.map((m: MatchRecord) => {
      const isSubmitter = m.submitter_user_id === user.id;
      const other = isSubmitter ? m.opponent_profile : m.submitter_profile;
      const isWon = isSubmitter ? m.result === "won" : m.result === "lost";
      const sets: string[] = [];
      for (let s = 1; s <= 5; s++) {
        const sub = (m as unknown as Record<string, number | null>)[`submitter_score_set${s}`];
        const opp = (m as unknown as Record<string, number | null>)[`opponent_score_set${s}`];
        if (sub != null && opp != null) sets.push(isSubmitter ? `${sub}-${opp}` : `${opp}-${sub}`);
      }
      return {
        id: m.id,
        opponent: other?.display_name || "Unknown",
        avatar_url: other?.avatar_url,
        score: sets.join(", "),
        date: formatDate(m.created_at),
        format: m.format,
        verified: m.verified,
        result: isWon ? "won" : "lost",
      };
    });
  }, [matches, user]);

  const wins = view.filter(m => m.result === "won").length;
  const losses = view.filter(m => m.result === "lost").length;
  const filtered = filter === "all" ? view : view.filter(m => m.result === filter);

  return (
    <div className="pb-20 min-h-screen">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-lg font-display font-bold text-foreground">{t("history.title")}</h1>
        </div>
      </div>

      <div className="px-4 pt-4 max-w-2xl mx-auto space-y-4">
        <Card className="p-4 shadow-card overflow-hidden bg-gradient-to-br from-primary/5 via-card to-card">
          <div className="grid grid-cols-3 gap-2.5">
            <div className="text-center">
              <p className="text-xl font-display font-bold text-primary tabular-nums leading-none">{view.length}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1.5">{t("history.total")}</p>
            </div>
            <div className="text-center border-x border-border/50">
              <p className="text-xl font-display font-bold text-emerald-600 dark:text-emerald-400 tabular-nums leading-none">{wins}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1.5">{t("common.won")}</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-display font-bold text-destructive tabular-nums leading-none">{losses}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1.5">{t("common.lost")}</p>
            </div>
          </div>
        </Card>

        <div className="flex gap-2">
          {([["all", t("common.all")], ["won", t("common.won")], ["lost", t("common.lost")]] as [FilterType, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                filter === key ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:border-primary/30"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {loading ? (
            <p className="text-xs text-muted-foreground py-8 text-center">…</p>
          ) : filtered.length === 0 ? (
            <Card className="p-6 text-center shadow-card">
              <Trophy className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-xs text-muted-foreground">{t("history.empty")}</p>
            </Card>
          ) : filtered.map((match, i) => (
            <motion.div key={match.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card className="p-3 shadow-card">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    {match.avatar_url && <AvatarImage src={match.avatar_url} />}
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">{match.opponent[0]?.toUpperCase() || "?"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-card-foreground truncate">vs {match.opponent}</p>
                      <span className={`text-xs font-bold shrink-0 ${match.result === "won" ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                        {match.result === "won" ? t("common.won") : t("common.lost")}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground tabular-nums mt-0.5">{match.score}</p>
                    <div className="flex items-center gap-1.5 mt-1 text-[10px] text-muted-foreground">
                      <span>{match.date}</span>
                      <span>·</span>
                      <span className="capitalize">{match.format}</span>
                      {!match.verified && <><span>·</span><span className="text-amber-600 dark:text-amber-500">{t("history.pendingShort")}</span></>}
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MatchHistoryPage;
