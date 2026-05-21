import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Trophy, Star, Activity, Loader2, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLanguage } from "@/i18n/LanguageContext";
import { useRefereeBrowse, type RefereeProfile } from "@/hooks/useReferee";

type Tab = "matches" | "rating" | "tournaments";

const RefereeLeaderboardPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [tab, setTab] = useState<Tab>("matches");
  const { results, loading } = useRefereeBrowse("");

  const sorted = useMemo(() => {
    const arr = [...results];
    if (tab === "matches") arr.sort((a, b) => (b.matches_officiated ?? 0) - (a.matches_officiated ?? 0));
    else if (tab === "rating") arr.sort((a, b) => {
      const ra = (a.rating_count ?? 0) >= 3 ? (a.rating_avg ?? 0) : -1;
      const rb = (b.rating_count ?? 0) >= 3 ? (b.rating_avg ?? 0) : -1;
      return rb - ra;
    });
    else arr.sort((a, b) => (b.tournaments_count ?? 0) - (a.tournaments_count ?? 0));
    return arr.slice(0, 50);
  }, [results, tab]);

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: "matches",     label: t("refLB.matches"),     icon: Trophy },
    { key: "rating",      label: t("refLB.rating"),      icon: Star },
    { key: "tournaments", label: t("refLB.tournaments"), icon: Activity },
  ];

  return (
    <div className="min-h-screen pb-20">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3 space-y-3">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button onClick={() => navigate(-1)} className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-lg font-display font-bold flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" /> {t("refLB.title")}
          </h1>
        </div>
        <div className="max-w-2xl mx-auto flex gap-1.5">
          {tabs.map(tb => {
            const Icon = tb.icon;
            const active = tab === tb.key;
            return (
              <button
                key={tb.key}
                onClick={() => setTab(tb.key)}
                className={`flex-1 h-9 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors ${
                  active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" /> {tb.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4 pt-4 max-w-2xl mx-auto space-y-2">
        {loading ? (
          <div className="py-12 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground/50" /></div>
        ) : sorted.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">{t("refLB.empty")}</Card>
        ) : (
          sorted.map((r: RefereeProfile, i) => (
            <motion.div key={r.user_id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.015 }}>
              <Card
                className="p-3 shadow-card hover:border-primary/30 transition-all cursor-pointer"
                onClick={() => navigate(`/referee/${r.user_id}`)}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-7 text-center font-stat font-bold tabular-nums shrink-0 ${
                    i === 0 ? "text-amber-500 text-lg" : i < 3 ? "text-foreground" : "text-muted-foreground"
                  }`}>
                    {i + 1}
                  </div>
                  <Avatar className="h-10 w-10 shrink-0">
                    {r.avatar_url && <AvatarImage src={r.avatar_url} />}
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                      {r.display_name?.[0]?.toUpperCase() ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-bold text-foreground truncate">{r.display_name ?? "—"}</p>
                      {r.certification_level !== "community" && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary/15 text-primary uppercase tracking-wide inline-flex items-center gap-0.5">
                          <ShieldCheck className="h-2.5 w-2.5" />{r.certification_level}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-0.5 font-stat tabular-nums"><Trophy className="h-3 w-3" />{r.matches_officiated}</span>
                      {r.rating_count > 0 && r.rating_avg != null && (
                        <span className="inline-flex items-center gap-0.5 font-stat tabular-nums text-amber-500"><Star className="h-3 w-3 fill-amber-500" />{r.rating_avg.toFixed(1)} ({r.rating_count})</span>
                      )}
                      <span className="inline-flex items-center gap-0.5 font-stat tabular-nums"><Activity className="h-3 w-3" />{r.tournaments_count ?? 0}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-stat font-bold text-lg text-primary tabular-nums leading-none">
                      {tab === "matches" ? r.matches_officiated
                        : tab === "rating" ? (r.rating_count >= 3 && r.rating_avg != null ? r.rating_avg.toFixed(2) : "—")
                        : (r.tournaments_count ?? 0)}
                    </p>
                    <p className="text-[9px] uppercase tracking-wide text-muted-foreground font-semibold mt-0.5">
                      {tab === "matches" ? t("refLB.matchesUnit") : tab === "rating" ? t("refLB.ratingUnit") : t("refLB.tournamentsUnit")}
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default RefereeLeaderboardPage;
