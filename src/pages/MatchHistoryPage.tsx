import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { matchHistory } from "@/data/profile";
import { useLanguage } from "@/i18n/LanguageContext";

type FilterType = "all" | "won" | "lost";

const MatchHistoryPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [filter, setFilter] = useState<FilterType>("all");

  const filtered = filter === "all" ? matchHistory : matchHistory.filter(m => m.result === filter);
  const wins = matchHistory.filter(m => m.result === "won").length;
  const losses = matchHistory.filter(m => m.result === "lost").length;

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

      <div className="px-4 pt-4 space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: t("history.total"), value: matchHistory.length, color: "text-foreground" },
            { label: t("common.won"), value: wins, color: "text-primary" },
            { label: t("common.lost"), value: losses, color: "text-destructive" },
          ].map((s, i) => (
            <Card key={i} className="p-2.5 text-center shadow-card">
              <p className={`text-lg font-display font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </Card>
          ))}
        </div>

        {/* Filter */}
        <div className="flex gap-2">
          {([["all", t("common.all")], ["won", t("common.won")], ["lost", t("common.lost")]] as [FilterType, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === key ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Matches */}
        <div className="space-y-2">
          {filtered.map((match, i) => (
            <motion.div key={match.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card className="p-3 shadow-card">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-lg">{match.opponentAvatar}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-card-foreground">vs {match.opponent}</p>
                      <span className={`text-xs font-bold ${match.result === "won" ? "text-primary" : "text-destructive"}`}>
                        {match.result === "won" ? t("common.won") : t("common.lost")}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{match.score}</p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                      <span>{match.date}</span>
                      <span>·</span>
                      <span>{match.group}</span>
                      <span>·</span>
                      <span>{match.duration}</span>
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
