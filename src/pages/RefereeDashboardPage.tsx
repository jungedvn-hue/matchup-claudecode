import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Gavel, MapPin, Calendar, Trophy, Clock, CheckCircle2, PlayCircle, ChevronRight, ShieldCheck, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/i18n/LanguageContext";
import { useTournaments } from "@/context/TournamentContext";
import { useTournamentRealtime } from "@/hooks/useTournamentRealtime";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import ApplyRoleDialog from "@/components/ApplyRoleDialog";
import { Tournament, TournamentMatch } from "@/lib/tournament/types";
import { toast } from "sonner";

type EnrichedMatch = TournamentMatch & {
  tournamentId: string;
  tournamentName: string;
  categoryName: string;
};

const RefereeDashboardPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { tournaments, updateTournament } = useTournaments();
  const { user, roles, isMaster } = useAuth();

  const [showJoinRef, setShowJoinRef] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [applyOpen, setApplyOpen] = useState(false);
  const [refStatus, setRefStatus] = useState<"none" | "pending" | "rejected">("none");

  const isVerifiedReferee = isMaster || roles.includes("referee");

  const fetchRefereeApplication = useCallback(async () => {
    if (!user || isVerifiedReferee) return;
    const { data } = await supabase
      .from("role_applications")
      .select("status")
      .eq("user_id", user.id)
      .eq("requested_role", "referee")
      .order("created_at", { ascending: false })
      .limit(1);
    const s = data?.[0]?.status as "pending" | "rejected" | undefined;
    setRefStatus(s ?? "none");
  }, [user, isVerifiedReferee]);

  useEffect(() => { fetchRefereeApplication(); }, [fetchRefereeApplication]);

  // Tournaments where current user is a referee
  const myTournaments = useMemo(() => {
    if (!user) return [] as Tournament[];
    return tournaments.filter((t) => t.referees?.some((r) => r.userId === user.id));
  }, [tournaments, user]);

  // Scoped realtime: only the tournaments I referee for
  useTournamentRealtime(myTournaments.map((t) => t.id));

  const myMatches = useMemo<EnrichedMatch[]>(() => {
    if (!user) return [];
    const list: EnrichedMatch[] = [];
    myTournaments.forEach((t) => {
      const myRef = t.referees?.find((r) => r.userId === user.id);
      if (!myRef) return;
      t.categories?.forEach((c) => {
        const all = [
          ...(c.pools || []).flatMap((p) => p.matches || []),
          ...(c.bracketRounds || []).flatMap((r) => r.matches || []),
        ];
        all
          .filter((m) => m.refereeId === myRef.id && m.entryAName !== "BYE" && m.entryBName !== "BYE")
          .forEach((m) => {
            list.push({
              ...m,
              tournamentId: t.id,
              tournamentName: t.name,
              categoryName: c.name,
            });
          });
      });
    });
    return list;
  }, [myTournaments, user]);

  const live = myMatches.filter((m) => m.status === "in_progress");
  const upcoming = myMatches.filter((m) => m.status === "not_started");
  const done = myMatches.filter((m) => m.status === "completed");

  // Notify on new match assignment. Skip the very first render so the user
  // doesn't get spammed with one toast per existing match on page load.
  const seenMatchIds = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);
  useEffect(() => {
    if (!initializedRef.current) {
      myMatches.forEach((m) => seenMatchIds.current.add(m.id));
      initializedRef.current = true;
      return;
    }
    myMatches.forEach((m) => {
      if (!seenMatchIds.current.has(m.id)) {
        seenMatchIds.current.add(m.id);
        toast.message(t("ref.newAssignment") || "Bạn được gán trận mới", {
          description: `${m.tournamentName} · ${m.entryAName} vs ${m.entryBName}`,
        });
      }
    });
  }, [myMatches, t]);

  const handleJoin = () => {
    if (!user) {
      toast.error(t("auth.loginRequired") || "Vui lòng đăng nhập!");
      return;
    }
    const code = accessCode.trim().toUpperCase();
    if (!code) return;
    const target = tournaments.find((t) => t.referees?.some((r) => r.accessCode === code));
    if (!target) {
      toast.error(t("tm.invalidAccessCode") || "Không tìm thấy giải đấu!");
      return;
    }
    const ref = target.referees?.find((r) => r.accessCode === code);
    if (ref?.userId === user.id) {
      toast.success(t("tm.alreadyJoined") || "Bạn đã tham gia giải này rồi!");
      setShowJoinRef(false);
      return;
    }
    if (ref?.userId) {
      toast.error(t("tm.codeAlreadyUsed") || "Mã này đã được người khác sử dụng!");
      return;
    }
    const updated: Tournament = {
      ...target,
      referees: target.referees?.map((r) => (r.id === ref?.id ? { ...r, userId: user.id } : r)) || [],
    };
    updateTournament(updated);
    toast.success(t("tm.joinSuccess") || "Tham gia thành công!");
    setShowJoinRef(false);
    setAccessCode("");
  };

  const MatchRow = ({ m }: { m: EnrichedMatch }) => {
    const statusBadge =
      m.status === "completed" ? (
        <Badge variant="secondary" className="text-[10px] h-5">{t("ref.done") || "Done"}</Badge>
      ) : m.status === "in_progress" ? (
        <Badge className="text-[10px] h-5 bg-red-500 hover:bg-red-500 animate-pulse">{t("ref.live") || "Live"}</Badge>
      ) : (
        <Badge variant="outline" className="text-[10px] h-5">{t("ref.upcoming") || "Sắp đấu"}</Badge>
      );

    return (
      <button
        onClick={() => navigate(`/tour-manager/${m.tournamentId}`)}
        className="w-full text-left bg-card border border-border rounded-lg p-3 hover:bg-muted/50 transition-colors space-y-2"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] text-muted-foreground truncate">
              {m.tournamentName} · {m.categoryName}
            </p>
          </div>
          {statusBadge}
        </div>
        <div className="flex items-center gap-2">
          <span className={`flex-1 text-sm font-medium truncate ${m.winner === m.entryAId ? "text-primary font-bold" : ""}`}>
            {m.entryAName}
          </span>
          <span className="font-display font-bold text-base text-foreground bg-muted rounded px-2 py-0.5 min-w-[3rem] text-center">
            {m.status === "not_started" ? "—" : `${m.scoreA} : ${m.scoreB}`}
          </span>
          <span className={`flex-1 text-sm font-medium truncate text-right ${m.winner === m.entryBId ? "text-primary font-bold" : ""}`}>
            {m.entryBName}
          </span>
        </div>
        {m.courtId && (
          <p className="text-[10px] text-muted-foreground">📍 {m.courtId}</p>
        )}
      </button>
    );
  };

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-lg border-b border-border px-4 py-3 space-y-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold flex items-center gap-2 flex-1 min-w-0 truncate">
            <Gavel className="h-5 w-5 text-primary shrink-0" />
            <span className="truncate">{t("ref.title") || "Trọng tài"}</span>
          </h1>
          <Button size="sm" className="h-9 gap-1.5 shrink-0" onClick={() => setShowJoinRef(true)}>
            <Gavel className="h-4 w-4" />
            <span className="hidden sm:inline">{t("tm.joinReferee")}</span>
          </Button>
        </div>

        {/* Stats summary */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-2 text-center">
            <p className="text-[10px] text-red-600 dark:text-red-400 font-medium uppercase">{t("ref.live") || "Live"}</p>
            <p className="text-lg font-bold text-red-600 dark:text-red-400">{live.length}</p>
          </div>
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2 text-center">
            <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium uppercase">{t("ref.upcoming") || "Sắp đấu"}</p>
            <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{upcoming.length}</p>
          </div>
          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2 text-center">
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium uppercase">{t("ref.done") || "Done"}</p>
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{done.length}</p>
          </div>
        </div>
      </div>

      {/* Verified Referee status banner */}
      <div className="px-4 pt-3">
        {isVerifiedReferee ? (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Verified Referee — đang trong pool hệ thống</p>
          </div>
        ) : refStatus === "pending" ? (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">Đơn Verified Referee đang chờ duyệt</p>
          </div>
        ) : (
          <button
            onClick={() => setApplyOpen(true)}
            className="w-full flex items-center gap-2 p-2.5 rounded-lg bg-primary/10 border border-primary/30 hover:bg-primary/15 transition-colors text-left"
          >
            <ShieldAlert className="h-4 w-4 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-primary">Trở thành Verified Referee</p>
              <p className="text-[11px] text-muted-foreground">{refStatus === "rejected" ? "Đơn trước bị từ chối — gửi lại?" : "Được host mời từ pool, ưu tiên xét chọn"}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-primary shrink-0" />
          </button>
        )}
      </div>

      <div className="px-4 pt-4">
        {/* No tournaments empty state */}
        {myTournaments.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground space-y-3">
            <div className="h-16 w-16 rounded-full bg-muted mx-auto flex items-center justify-center">
              <Gavel className="h-8 w-8 opacity-40" />
            </div>
            <p className="text-sm">{t("ref.noTournaments") || "Bạn chưa tham gia giải nào với vai trò trọng tài"}</p>
            <Button size="sm" onClick={() => setShowJoinRef(true)}>
              <Gavel className="h-4 w-4 mr-1.5" /> {t("tm.joinReferee")}
            </Button>
          </div>
        ) : (
          <Tabs defaultValue="matches" className="space-y-3">
            <TabsList className="w-full">
              <TabsTrigger value="matches" className="flex-1 gap-1">
                <PlayCircle className="h-3.5 w-3.5" /> {t("ref.matches") || "Trận đấu"}
              </TabsTrigger>
              <TabsTrigger value="tournaments" className="flex-1 gap-1">
                <Trophy className="h-3.5 w-3.5" /> {t("ref.tournaments") || "Giải"}
              </TabsTrigger>
            </TabsList>

            {/* MATCHES TAB */}
            <TabsContent value="matches" className="space-y-4 mt-3">
              {/* Live first */}
              {live.length > 0 && (
                <section className="space-y-2">
                  <h3 className="text-xs font-bold uppercase text-red-600 dark:text-red-400 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse"></span>
                    {t("ref.liveSection") || "Đang đấu"} ({live.length})
                  </h3>
                  <div className="space-y-2">
                    {live.map((m) => <MatchRow key={m.id} m={m} />)}
                  </div>
                </section>
              )}

              {upcoming.length > 0 && (
                <section className="space-y-2">
                  <h3 className="text-xs font-bold uppercase text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    {t("ref.upcomingSection") || "Sắp đấu"} ({upcoming.length})
                  </h3>
                  <div className="space-y-2">
                    {upcoming.map((m) => <MatchRow key={m.id} m={m} />)}
                  </div>
                </section>
              )}

              {done.length > 0 && (
                <section className="space-y-2">
                  <h3 className="text-xs font-bold uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3" />
                    {t("ref.doneSection") || "Đã xong"} ({done.length})
                  </h3>
                  <div className="space-y-2">
                    {done.map((m) => <MatchRow key={m.id} m={m} />)}
                  </div>
                </section>
              )}

              {myMatches.length === 0 && (
                <div className="text-center py-10 text-sm text-muted-foreground">
                  {t("ref.noMatchesAssigned") || "Chưa có trận nào được gán cho bạn"}
                </div>
              )}
            </TabsContent>

            {/* TOURNAMENTS TAB */}
            <TabsContent value="tournaments" className="space-y-3 mt-3">
              {myTournaments.map((tour) => {
                const myRef = tour.referees?.find((r) => r.userId === user?.id);
                const tourMatches = myMatches.filter((m) => m.tournamentId === tour.id);
                const tourLive = tourMatches.filter((m) => m.status === "in_progress").length;
                const tourUpcoming = tourMatches.filter((m) => m.status === "not_started").length;
                const tourDone = tourMatches.filter((m) => m.status === "completed").length;
                return (
                  <Card
                    key={tour.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => navigate(`/tour-manager/${tour.id}`)}
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-foreground truncate">{tour.name}</h3>
                          <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
                            <span className="flex items-center gap-1 truncate">
                              <MapPin className="h-3 w-3 shrink-0" /> {tour.location}
                            </span>
                            <span className="flex items-center gap-1 shrink-0">
                              <Calendar className="h-3 w-3" /> {tour.date}
                            </span>
                          </div>
                          {myRef && (
                            <p className="text-[10px] text-muted-foreground mt-1">
                              <Gavel className="h-2.5 w-2.5 inline mr-0.5" /> {myRef.name}
                            </p>
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                      </div>
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="bg-red-500/10 text-red-600 dark:text-red-400 px-2 py-0.5 rounded font-medium">
                          {tourLive} {t("ref.live") || "Live"}
                        </span>
                        <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded font-medium">
                          {tourUpcoming} {t("ref.upcoming") || "Sắp"}
                        </span>
                        <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded font-medium">
                          {tourDone} {t("ref.done") || "Xong"}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Join Referee Dialog */}
      <Dialog open={showJoinRef} onOpenChange={setShowJoinRef}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("tm.joinReferee")}</DialogTitle>
            <DialogDescription>
              {t("ref.joinDesc") || "Nhập mã trọng tài (6 ký tự) mà host gửi cho bạn."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-xs">{t("ref.accessCode") || "Mã tham gia"}</Label>
            <Input
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              className="font-mono uppercase tracking-widest text-center"
              maxLength={8}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowJoinRef(false)}>
              {t("common.cancel") || "Hủy"}
            </Button>
            <Button onClick={handleJoin} disabled={!accessCode.trim()}>
              <Gavel className="h-4 w-4 mr-1.5" /> {t("ref.joinAction") || "Tham gia"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ApplyRoleDialog
        role="referee"
        open={applyOpen}
        onOpenChange={setApplyOpen}
        onSubmitted={fetchRefereeApplication}
      />
    </div>
  );
};

export default RefereeDashboardPage;
