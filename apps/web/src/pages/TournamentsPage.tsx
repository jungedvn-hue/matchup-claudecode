import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Plus, Trophy, Calendar, MapPin, Users, Search, Loader2, ChevronRight, Settings, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useLanguage } from "@/i18n/LanguageContext";
import { useTournaments } from "@/context/TournamentContext";
import { useAuth } from "@/context/AuthContext";
import { useRoles, hasRole } from "@/hooks/use-roles";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getTournamentProgress } from "@/lib/tournament/engine";

type StatusTab = "active" | "draft" | "completed";

const TournamentsPage = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { tournaments, loading, deleteTournament } = useTournaments();
  const { user } = useAuth();
  const roles = useRoles();
  const isHost = hasRole(roles, "host");
  const [searchParams, setSearchParams] = useSearchParams();
  const mineOnly = searchParams.get("mine") === "1";

  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<StatusTab>("active");

  const setMineOnly = (v: boolean) => {
    const next = new URLSearchParams(searchParams);
    if (v) next.set("mine", "1"); else next.delete("mine");
    setSearchParams(next, { replace: true });
  };

  const tabs: { key: StatusTab; label: string }[] = [
    { key: "active", label: t("tournaments.active") },
    { key: "draft", label: t("tournaments.upcoming") },
    { key: "completed", label: t("tournaments.past") },
  ];

  const scoped = useMemo(
    () => mineOnly ? tournaments.filter(t => t.host_id === user?.id) : tournaments,
    [tournaments, mineOnly, user],
  );

  const counts = useMemo(() => ({
    active: scoped.filter(t => t.status === "active").length,
    draft: scoped.filter(t => t.status === "draft").length,
    completed: scoped.filter(t => t.status === "completed").length,
  }), [scoped]);

  const filtered = useMemo(() =>
    scoped.filter(to => {
      if (to.status !== tab) return false;
      if (!search) return true;
      return (
        to.name.toLowerCase().includes(search.toLowerCase()) ||
        to.location.toLowerCase().includes(search.toLowerCase())
      );
    }),
  [scoped, tab, search]);

  return (
    <div className="pb-20 min-h-screen">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3 space-y-3">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <h1 className="text-lg font-display font-bold text-foreground flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            {t("tournaments.title")}
          </h1>
          {isHost && (
            <button
              onClick={() => navigate("/tour-manager/create")}
              className="flex items-center gap-1.5 h-8 px-3 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> {t("tournaments.create")}
            </button>
          )}
        </div>

        <div className="max-w-2xl mx-auto relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            placeholder={t("tm.searchPlaceholder")}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-4 rounded-xl bg-secondary/60 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {isHost && (
          <div className="max-w-2xl mx-auto flex gap-1.5">
            <button
              onClick={() => setMineOnly(false)}
              className={`flex-1 h-8 text-[11px] font-medium rounded-lg transition-colors ${
                !mineOnly ? "bg-primary text-primary-foreground" : "bg-secondary/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("tournaments.scope.all")}
            </button>
            <button
              onClick={() => setMineOnly(true)}
              className={`flex-1 h-8 text-[11px] font-medium rounded-lg transition-colors ${
                mineOnly ? "bg-primary text-primary-foreground" : "bg-secondary/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("tournaments.scope.mine")}
            </button>
          </div>
        )}

        <div className="max-w-2xl mx-auto flex gap-1 bg-secondary/60 rounded-xl p-0.5">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
                tab === key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
              {counts[key] > 0 && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                  tab === key ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"
                }`}>
                  {counts[key]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4 max-w-2xl mx-auto space-y-3">
        {loading ? (
          <div className="py-20 flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin opacity-40" />
            <p className="text-sm">{t("common.loading")}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 flex flex-col items-center gap-3 text-muted-foreground">
            <Trophy className="h-10 w-10 opacity-20" />
            <p className="text-sm">{t("tm.noTournaments")}</p>
            {isHost && tab === "draft" && (
              <button
                onClick={() => navigate("/tour-manager/create")}
                className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-semibold mt-1"
              >
                <Plus className="h-3.5 w-3.5" /> {t("tournaments.create")}
              </button>
            )}
          </div>
        ) : (
          filtered.map((to, i) => {
            const allMatches = to.categories.flatMap(c => [
              ...(c.pools || []).flatMap(p => p.matches || []),
              ...(c.bracketRounds || []).flatMap(r => r.matches || []),
            ]);
            const progress = getTournamentProgress(allMatches);
            const isActive = to.status === "active";
            const isCompleted = to.status === "completed";
            const isMine = to.host_id === user?.id;
            const entryCount = to.categories.reduce((s, c) => s + (c.entries?.length ?? 0), 0);

            return (
              <motion.div
                key={to.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Card className={`overflow-hidden shadow-card hover:border-primary/30 transition-all ${
                  isActive ? "bg-gradient-to-br from-primary/5 via-card to-card" :
                  isCompleted ? "bg-gradient-to-br from-muted/30 via-card to-card opacity-80" :
                  "bg-gradient-to-br from-amber-500/5 via-card to-card"
                }`}>
                  <button
                    className="w-full text-left p-4 space-y-3"
                    onClick={() => navigate(isMine ? `/tour-manager/${to.id}` : `/tournament-live/${to.id}`)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-display font-bold text-card-foreground truncate">{to.name}</h3>
                          {isActive && (
                            <span className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full animate-pulse shrink-0">LIVE</span>
                          )}
                          {isCompleted && (
                            <span className="text-[9px] font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full shrink-0">
                              {t("tm.status.completed")}
                            </span>
                          )}
                          {isMine && (
                            <span className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5 shrink-0">
                              <Settings className="h-2.5 w-2.5" /> {t("tournaments.scope.mine")}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded mt-1 inline-block">
                          {t(`tm.format.${to.format}`)}
                        </span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    </div>

                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {to.date}
                      </span>
                      {to.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {to.location}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {entryCount > 0 ? `${entryCount} ${t("tm.players")}` : `${to.categories.length} ${t("tm.categories")}`}
                      </span>
                    </div>

                    {isActive && progress.total > 0 && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-muted-foreground">{progress.completed}/{progress.total} {t("home.matchesDone")}</span>
                          <span className="font-semibold text-primary">{progress.pct}%</span>
                        </div>
                        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress.pct}%` }} />
                        </div>
                      </div>
                    )}
                  </button>

                  {isMine && (
                    <div className="px-4 pb-3 pt-1 flex items-center gap-2 border-t border-border/40">
                      <button
                        onClick={() => navigate(`/tour-manager/${to.id}`)}
                        className="flex-1 h-8 rounded-lg bg-primary/10 text-primary text-[11px] font-semibold flex items-center justify-center gap-1.5 hover:bg-primary/15 transition-colors"
                      >
                        <Settings className="h-3.5 w-3.5" /> {t("tournaments.manage")}
                      </button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex items-center justify-center">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t("common.confirm")}</AlertDialogTitle>
                            <AlertDialogDescription>{t("tm.deleteConfirmDesc")}</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteTournament(to.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              {t("common.delete")}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </Card>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default TournamentsPage;
