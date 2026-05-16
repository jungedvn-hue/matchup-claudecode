import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Search, Trophy, Clock, CheckCircle2, Gavel, Trash2, PlayCircle, FileEdit, MapPin, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useLanguage } from "@/i18n/LanguageContext";
import { useTournaments } from "@/context/TournamentContext";
import { useAuth } from "@/context/AuthContext";
import { getTournamentProgress } from "@/lib/tournament/engine";
import { toast } from "sonner";

type TabKey = "active" | "draft" | "completed" | "refereeing";

const TourManagerPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { tournaments, updateTournament, deleteTournament } = useTournaments();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<TabKey>("active");
  const [showJoinRef, setShowJoinRef] = useState(false);
  const [accessCode, setAccessCode] = useState("");

  const filtered = tournaments.filter(
    tn => tn.name.toLowerCase().includes(search.toLowerCase()) ||
          tn.location.toLowerCase().includes(search.toLowerCase())
  );

  const active     = filtered.filter(tn => tn.status === "active"    && tn.host_id === user?.id);
  const draft      = filtered.filter(tn => tn.status === "draft"     && tn.host_id === user?.id);
  const completed  = filtered.filter(tn => tn.status === "completed" && tn.host_id === user?.id);
  const refereeing = filtered.filter(tn => tn.referees?.some(r => r.userId === user?.id));

  const lists: Record<TabKey, typeof tournaments> = { active, draft, completed, refereeing };

  const handleJoinRef = () => {
    if (!user) { toast.error(t("auth.loginRequired")); return; }
    if (!accessCode.trim()) return;
    const target = tournaments.find(tn => tn.referees?.some(r => r.accessCode === accessCode.trim().toUpperCase()));
    if (!target) { toast.error(t("tm.invalidAccessCode")); return; }
    const ref = target.referees?.find(r => r.accessCode === accessCode.trim().toUpperCase());
    if (ref?.userId === user.id) { toast.success(t("tm.alreadyJoined")); setShowJoinRef(false); return; }
    if (ref?.userId) { toast.error(t("tm.codeAlreadyUsed")); return; }
    updateTournament({ ...target, referees: target.referees?.map(r => r.id === ref?.id ? { ...r, userId: user.id } : r) });
    toast.success(t("tm.joinSuccess"));
    setShowJoinRef(false);
    setAccessCode("");
  };

  const TournamentCard = ({ tournament }: { tournament: typeof tournaments[0] }) => {
    const allMatches = tournament.categories.flatMap(c => [
      ...c.pools.flatMap(p => p.matches),
      ...c.bracketRounds.flatMap(r => r.matches),
    ]);
    const progress = getTournamentProgress(allMatches);
    const isMine = tournament.host_id === user?.id;

    const tone =
      tournament.status === "active"    ? "from-primary/8" :
      tournament.status === "completed" ? "from-secondary"     :
      "from-amber-500/8";

    const statusBadge =
      tournament.status === "active"    ? "bg-primary/10 text-primary dark:text-primary border-primary/20" :
      tournament.status === "completed" ? "bg-secondary text-muted-foreground border-border" :
                                          "bg-amber-500/10 text-amber-700 dark:text-amber-500 border-amber-500/20";

    return (
      <Card className={`p-3.5 shadow-card cursor-pointer hover:border-primary/30 transition-all overflow-hidden bg-gradient-to-br ${tone} via-card to-card`}
            onClick={() => navigate(`/tour-manager/${tournament.id}`)}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-display font-bold text-foreground truncate">{tournament.name}</p>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
              <MapPin className="h-3 w-3 shrink-0" /> {tournament.location}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${statusBadge}`}>
              {t(`tm.status.${tournament.status}`)}
            </span>
            {isMine && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button onClick={e => e.stopPropagation()}
                          className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent onClick={e => e.stopPropagation()}>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("common.confirm")}</AlertDialogTitle>
                    <AlertDialogDescription>{t("tm.deleteConfirmDesc")}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteTournament(tournament.id)}
                                       className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      {t("common.delete")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 mt-2 text-[11px] text-muted-foreground tabular-nums">
          <span>{tournament.date}</span>
          <span>·</span>
          <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {tournament.categories.length} {t("tm.categories")}</span>
          <span>·</span>
          <span>{t(`tm.format.${tournament.format}`)}</span>
        </div>

        {tournament.status === "active" && progress.total > 0 && (
          <div className="mt-2.5">
            <div className="flex justify-between text-[10px] mb-1">
              <span className="text-muted-foreground">{t("tm.progress")}</span>
              <span className="font-bold text-primary dark:text-primary tabular-nums">{progress.pct}%</span>
            </div>
            <div className="h-1.5 bg-secondary/80 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary to-primary rounded-full transition-all"
                   style={{ width: `${progress.pct}%` }} />
            </div>
          </div>
        )}
      </Card>
    );
  };

  const TABS: { key: TabKey; label: string; icon: any; count: number; tone: string }[] = [
    { key: "active",     label: t("tm.active"),     icon: Clock,        count: active.length,     tone: "text-primary dark:text-primary" },
    { key: "draft",      label: t("tm.drafts"),     icon: FileEdit,     count: draft.length,      tone: "text-amber-600 dark:text-amber-500" },
    { key: "completed",  label: t("tm.completed"),  icon: CheckCircle2, count: completed.length,  tone: "text-muted-foreground" },
    { key: "refereeing", label: t("tm.referee"),    icon: Gavel,        count: refereeing.length, tone: "text-violet-600 dark:text-violet-400" },
  ];

  const list = lists[tab];

  return (
    <div className="pb-24 min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3 space-y-3">
        <div className="flex items-center gap-2 max-w-2xl mx-auto">
          <button onClick={() => navigate("/")} className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-lg font-display font-bold text-foreground flex items-center gap-2 flex-1 min-w-0 truncate">
            <Trophy className="h-5 w-5 text-primary shrink-0" />
            <span className="truncate">{t("tm.title")}</span>
          </h1>
          <Button size="sm" className="h-9 gap-1.5 shrink-0 rounded-xl font-semibold" onClick={() => navigate("/tour-manager/create")}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{t("tm.createNew")}</span>
            <span className="sm:hidden">{t("groups.newGroup").includes("Tạo") ? "Tạo" : "New"}</span>
          </Button>
        </div>

        {/* Secondary actions */}
        <div className="max-w-2xl mx-auto flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
          <button onClick={() => navigate("/my-matches")}
                  className="flex items-center gap-1 h-7 px-2.5 rounded-full bg-secondary/60 text-[11px] font-medium text-muted-foreground hover:text-foreground whitespace-nowrap shrink-0 transition-colors">
            <PlayCircle className="h-3 w-3" /> {t("mm.title")}
          </button>
          <button onClick={() => navigate("/referee")}
                  className="flex items-center gap-1 h-7 px-2.5 rounded-full bg-secondary/60 text-[11px] font-medium text-muted-foreground hover:text-foreground whitespace-nowrap shrink-0 transition-colors">
            <Gavel className="h-3 w-3" /> {t("ref.title")}
          </button>
          <button onClick={() => setShowJoinRef(true)}
                  className="flex items-center gap-1 h-7 px-2.5 rounded-full bg-violet-500/10 text-[11px] font-medium text-violet-700 dark:text-violet-400 hover:bg-violet-500/15 whitespace-nowrap shrink-0 transition-colors">
            <Plus className="h-3 w-3" /> {t("tm.joinReferee")}
          </button>
        </div>

        {/* Search */}
        <div className="max-w-2xl mx-auto relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder={t("tm.searchPlaceholder")} value={search} onChange={e => setSearch(e.target.value)}
                 className="pl-9 h-9 rounded-xl bg-secondary/60 border-0 focus-visible:ring-2 focus-visible:ring-primary/30" />
        </div>
      </div>

      <div className="px-4 pt-4 max-w-2xl mx-auto space-y-4">
        {/* Stat tiles */}
        <Card className="p-4 shadow-card overflow-hidden bg-gradient-to-br from-primary/5 via-card to-card">
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center">
              <p className="text-2xl font-display font-bold text-primary dark:text-primary tabular-nums leading-none">{active.length}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1.5">{t("tm.active")}</p>
            </div>
            <div className="text-center border-x border-border/50">
              <p className="text-2xl font-display font-bold text-amber-600 dark:text-amber-500 tabular-nums leading-none">{draft.length}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1.5">{t("tm.drafts")}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-display font-bold text-foreground tabular-nums leading-none">{completed.length}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1.5">{t("tm.completed")}</p>
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <div className="grid grid-cols-4 gap-1 bg-secondary/60 rounded-xl p-1">
          {TABS.map(({ key, label, icon: Icon, count, tone }) => {
            const isActive = tab === key;
            return (
              <button key={key} onClick={() => setTab(key)}
                      className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded-lg text-[11px] font-medium transition-all min-w-0 ${
                        isActive ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                      }`}>
                <Icon className={`h-3 w-3 shrink-0 ${isActive ? tone : ""}`} />
                <span className="truncate">{label}</span>
                {count > 0 && (
                  <span className={`shrink-0 text-[9px] font-bold tabular-nums ${isActive ? tone : "text-muted-foreground"}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* List */}
        <div className="space-y-2.5">
          {list.length === 0 ? (
            <div className="py-16 flex flex-col items-center gap-3 text-muted-foreground">
              <Trophy className="h-10 w-10 opacity-20" />
              <p className="text-sm">{t("tm.noTournaments")}</p>
              {tab === "active" && (
                <Button variant="outline" size="sm" className="rounded-xl" onClick={() => navigate("/tour-manager/create")}>
                  <Plus className="h-4 w-4 mr-1" /> {t("tm.createFirst")}
                </Button>
              )}
            </div>
          ) : (
            list.map((tn, i) => (
              <motion.div key={tn.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <TournamentCard tournament={tn} />
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Join Referee Dialog */}
      <Dialog open={showJoinRef} onOpenChange={setShowJoinRef}>
        <DialogContent className="sm:max-w-[400px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">
              <Gavel className="h-5 w-5 text-primary" /> {t("tm.joinReferee")}
            </DialogTitle>
            <DialogDescription>
              {t("tm.refereeJoinDesc") || "Enter the access code provided by the organizer to start managing matches."}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <Label className="text-xs font-medium">Access Code</Label>
            <Input placeholder={t("tm.refereeCodePh")} className="font-mono uppercase" value={accessCode}
                   onChange={e => setAccessCode(e.target.value)} maxLength={6} />
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setShowJoinRef(false)}>{t("common.cancel")}</Button>
            <Button className="rounded-xl" onClick={handleJoinRef}>{t("common.confirm")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TourManagerPage;
