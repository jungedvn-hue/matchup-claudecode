import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Calendar, Trophy, Clock, CheckCircle2, PlayCircle, ChevronRight, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/i18n/LanguageContext";
import { useTournaments } from "@/context/TournamentContext";
import { useAuth } from "@/context/AuthContext";
import { useTournamentRealtime } from "@/hooks/useTournamentRealtime";
import { Tournament, TournamentMatch } from "@/lib/tournament/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type EnrichedMatch = TournamentMatch & {
  tournamentId: string;
  tournamentName: string;
  categoryName: string;
};

type MyTour = { id: string; name: string; location: string; date: string; courts?: any[] };

const MyMatchesPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { refreshTournaments } = useTournaments();
  const { user } = useAuth();

  const [showClaim, setShowClaim] = useState(false);
  const [claimQuery, setClaimQuery] = useState("");
  const [claiming, setClaiming] = useState(false);

  // Self-managed scoped data: avoids dependency on the global tournaments[]
  // state (which can be empty if RLS blocks reads of tournaments user doesn't own).
  const [myEntryIds, setMyEntryIds] = useState<Set<string>>(new Set());
  const [myTournaments, setMyTournaments] = useState<MyTour[]>([]);
  const [myMatches, setMyMatches] = useState<EnrichedMatch[]>([]);
  const [loadingScope, setLoadingScope] = useState(true);

  const refetchScoped = async () => {
    if (!user) return;
    setLoadingScope(true);
    try {
      // 1) Find every entry this user has claimed
      const { data: parts, error: pErr } = await supabase
        .from("tour_participants")
        .select("id, name, category_id")
        .eq("user_id", user.id);
      if (pErr) throw pErr;
      const entries = parts || [];
      const entryIds = entries.map((p) => p.id);
      const categoryIds = Array.from(new Set(entries.map((p) => p.category_id)));

      if (entryIds.length === 0) {
        setMyEntryIds(new Set());
        setMyTournaments([]);
        setMyMatches([]);
        return;
      }

      // 2) Find matches involving any of my entries — split into two `.in` queries
      // to avoid nested-comma ambiguity that `.or()` has with `.in.(...)`.
      const [resA, resB] = await Promise.all([
        supabase.from("tour_matches").select("*").in("entry_a_id", entryIds),
        supabase.from("tour_matches").select("*").in("entry_b_id", entryIds),
      ]);
      if (resA.error) throw resA.error;
      if (resB.error) throw resB.error;
      const dedupe = new Map<string, any>();
      [...(resA.data || []), ...(resB.data || [])].forEach((m: any) => dedupe.set(m.id, m));
      const matchRows = Array.from(dedupe.values());

      // 3) Find the categories + their tournaments to label rows
      const { data: cats, error: cErr } = await supabase
        .from("tour_categories")
        .select("id, name, tournament_id, tournaments:tournament_id (id, name, location, date, courts)")
        .in("id", categoryIds);
      if (cErr) throw cErr;

      const catMap = new Map<string, { name: string; tour: MyTour }>();
      const tourMap = new Map<string, MyTour>();
      (cats || []).forEach((c: any) => {
        const tour: MyTour = c.tournaments
          ? { id: c.tournaments.id, name: c.tournaments.name, location: c.tournaments.location, date: c.tournaments.date, courts: c.tournaments.courts }
          : { id: c.tournament_id, name: "Tournament", location: "", date: "" };
        catMap.set(c.id, { name: c.name, tour });
        tourMap.set(tour.id, tour);
      });

      const enriched: EnrichedMatch[] = (matchRows || [])
        .filter((m: any) => m.entry_a_name !== "BYE" && m.entry_b_name !== "BYE")
        .map((m: any) => {
          const cat = catMap.get(m.category_id);
          return {
            id: m.id,
            categoryId: m.category_id,
            poolId: m.pool_id,
            bracketRoundId: m.bracket_round_id,
            matchNo: m.match_no,
            entryAId: m.entry_a_id || "",
            entryBId: m.entry_b_id || "",
            entryAName: m.entry_a_name,
            entryBName: m.entry_b_name,
            scoreA: m.score_a,
            scoreB: m.score_b,
            winner: m.winner_id,
            status: m.status as any,
            courtId: m.court_id,
            refereeId: m.referee_id,
            timeSlot: m.time_slot,
            tournamentId: m.tournament_id,
            tournamentName: cat?.tour.name || "",
            categoryName: cat?.name || "",
          } as EnrichedMatch;
        });

      setMyEntryIds(new Set(entryIds));
      setMyTournaments(Array.from(tourMap.values()));
      setMyMatches(enriched);
    } catch (e: any) {
      console.error("[MyMatches] scoped fetch failed:", e);
      toast.error(e.message || t("mm.toast.loadError"));
    } finally {
      setLoadingScope(false);
    }
  };

  useEffect(() => {
    refetchScoped();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useTournamentRealtime(myTournaments.map((t) => t.id));

  const live = myMatches.filter((m) => m.status === "in_progress");
  const upcoming = myMatches.filter((m) => m.status === "not_started");
  const done = myMatches.filter((m) => m.status === "completed");

  const courtsLookup = useMemo(() => {
    const map: Record<string, string> = {};
    myTournaments.forEach((t) => t.courts?.forEach((c) => (map[c.id] = c.name)));
    return map;
  }, [myTournaments]);

  // Claim flow: find unclaimed participants by name (case-insensitive) across all tournaments,
  // link to current user_id. Lets a player attach themselves to entries the host created.
  const handleClaim = async () => {
    if (!user) {
      toast.error(t("auth.loginRequired"));
      return;
    }
    const q = claimQuery.trim().toLowerCase();
    if (q.length < 2) return;
    setClaiming(true);
    try {
      const { data, error } = await supabase
        .from("tour_participants")
        .select("id, name, user_id")
        .is("user_id", null);
      if (error) throw error;
      const matches = (data || []).filter((p) => p.name.toLowerCase().includes(q));
      if (matches.length === 0) {
        toast.error(t("mm.noMatchFound"));
        return;
      }
      const ids = matches.map((m) => m.id);
      const { error: updErr } = await supabase
        .from("tour_participants")
        .update({ user_id: user.id })
        .in("id", ids);
      if (updErr) throw updErr;
      toast.success(`${t("mm.claimedCount")} ${ids.length} ${t("mm.entries")}`);
      setShowClaim(false);
      setClaimQuery("");
      await refetchScoped();
      // Best-effort refresh of global tournaments cache too (no-op if RLS blocks)
      refreshTournaments?.().catch(() => {});
    } catch (e: any) {
      toast.error(e.message || "Claim failed");
    } finally {
      setClaiming(false);
    }
  };

  const MatchRow = ({ m }: { m: EnrichedMatch }) => {
    const meIsA = myEntryIds.has(m.entryAId);
    const meIsB = myEntryIds.has(m.entryBId);
    const opponentName = meIsA ? m.entryBName : m.entryAName;
    const myName = meIsA ? m.entryAName : m.entryBName;
    const myScore = meIsA ? m.scoreA : m.scoreB;
    const oppScore = meIsA ? m.scoreB : m.scoreA;
    const iWon = m.winner && ((meIsA && m.winner === m.entryAId) || (meIsB && m.winner === m.entryBId));

    const statusBadge =
      m.status === "completed" ? (
        iWon ? (
          <Badge className="bg-primary/15 text-primary dark:text-primary border-primary/30 text-[10px] h-5">
            🏆 {t("mm.won")}
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-[10px] h-5">{t("mm.lost") || "Thua"}</Badge>
        )
      ) : m.status === "in_progress" ? (
        <Badge className="text-[10px] h-5 bg-red-500 hover:bg-red-500 animate-pulse">{t("ref.live") || "Live"}</Badge>
      ) : (
        <Badge variant="outline" className="text-[10px] h-5">{t("ref.upcoming")}</Badge>
      );

    return (
      <button
        onClick={() => navigate(`/tournament-live/${m.tournamentId}`)}
        className="w-full text-left bg-card border border-border rounded-lg p-3 hover:bg-muted/50 transition-colors space-y-2"
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] text-muted-foreground truncate">
            {m.tournamentName} · {m.categoryName}
          </p>
          {statusBadge}
        </div>
        <div className="flex items-center gap-2">
          <span className="flex-1 text-sm font-medium truncate text-primary">{myName}</span>
          <span className="font-display font-bold text-base bg-muted rounded px-2 py-0.5 min-w-[3.5rem] text-center">
            {m.status === "not_started" ? "—" : `${myScore} : ${oppScore}`}
          </span>
          <span className="flex-1 text-sm font-medium truncate text-right text-muted-foreground">{opponentName}</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          {m.courtId && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {courtsLookup[m.courtId] || m.courtId}
            </span>
          )}
          {m.timeSlot && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> {m.timeSlot}
            </span>
          )}
          <span className="ml-auto">#{m.matchNo}</span>
        </div>
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
            <PlayCircle className="h-5 w-5 text-primary shrink-0" />
            <span className="truncate">{t("mm.title")}</span>
          </h1>
          <Button size="sm" variant="outline" className="h-9 gap-1.5 shrink-0" onClick={() => setShowClaim(true)}>
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline">{t("mm.claim")}</span>
          </Button>
        </div>

        {/* Stats summary */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-2 text-center">
            <p className="text-[10px] text-red-600 dark:text-red-400 font-medium uppercase">{t("ref.live") || "Live"}</p>
            <p className="text-lg font-bold text-red-600 dark:text-red-400">{live.length}</p>
          </div>
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2 text-center">
            <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium uppercase">{t("ref.upcoming")}</p>
            <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{upcoming.length}</p>
          </div>
          <div className="rounded-lg bg-primary/10 border border-primary/20 p-2 text-center">
            <p className="text-[10px] text-primary dark:text-primary font-medium uppercase">{t("ref.done") || "Done"}</p>
            <p className="text-lg font-bold text-primary dark:text-primary">{done.length}</p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4">
        {myTournaments.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground space-y-3">
            <div className="h-16 w-16 rounded-full bg-muted mx-auto flex items-center justify-center">
              <PlayCircle className="h-8 w-8 opacity-40" />
            </div>
            <p className="text-sm">{t("mm.empty")}</p>
            <p className="text-xs text-muted-foreground">{t("mm.emptyHint")}</p>
            <Button size="sm" onClick={() => setShowClaim(true)}>
              <UserPlus className="h-4 w-4 mr-1.5" /> {t("mm.claim")}
            </Button>
          </div>
        ) : (
          <Tabs defaultValue="matches" className="space-y-3">
            <TabsList className="w-full">
              <TabsTrigger value="matches" className="flex-1 gap-1">
                <PlayCircle className="h-3.5 w-3.5" /> {t("mm.matches")}
              </TabsTrigger>
              <TabsTrigger value="tournaments" className="flex-1 gap-1">
                <Trophy className="h-3.5 w-3.5" /> {t("mm.tournaments")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="matches" className="space-y-4 mt-3">
              {live.length > 0 && (
                <section className="space-y-2">
                  <h3 className="text-xs font-bold uppercase text-red-600 dark:text-red-400 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse"></span>
                    {t("ref.liveSection")} ({live.length})
                  </h3>
                  <div className="space-y-2">{live.map((m) => <MatchRow key={m.id} m={m} />)}</div>
                </section>
              )}
              {upcoming.length > 0 && (
                <section className="space-y-2">
                  <h3 className="text-xs font-bold uppercase text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <Clock className="h-3 w-3" /> {t("ref.upcomingSection")} ({upcoming.length})
                  </h3>
                  <div className="space-y-2">{upcoming.map((m) => <MatchRow key={m.id} m={m} />)}</div>
                </section>
              )}
              {done.length > 0 && (
                <section className="space-y-2">
                  <h3 className="text-xs font-bold uppercase text-primary dark:text-primary flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3" /> {t("ref.doneSection")} ({done.length})
                  </h3>
                  <div className="space-y-2">{done.map((m) => <MatchRow key={m.id} m={m} />)}</div>
                </section>
              )}
              {myMatches.length === 0 && (
                <div className="text-center py-10 text-sm text-muted-foreground">
                  {t("mm.noMatchesScheduled")}
                </div>
              )}
            </TabsContent>

            <TabsContent value="tournaments" className="space-y-3 mt-3">
              {myTournaments.map((tour) => {
                const tourMatches = myMatches.filter((m) => m.tournamentId === tour.id);
                return (
                  <Card
                    key={tour.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => navigate(`/tournament-live/${tour.id}`)}
                  >
                    <CardContent className="p-4 space-y-2">
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
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {tourMatches.length} {t("mm.myMatches")}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Claim Dialog */}
      <Dialog open={showClaim} onOpenChange={setShowClaim}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("mm.claimTitle")}</DialogTitle>
            <DialogDescription>
              {t("mm.claimDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-xs">{t("mm.yourName")}</Label>
            <Input
              value={claimQuery}
              onChange={(e) => setClaimQuery(e.target.value)}
              placeholder={t("mm.claimPh")}
            />
            <p className="text-[10px] text-muted-foreground">
              {t("mm.claimHint")}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClaim(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleClaim} disabled={claiming || claimQuery.trim().length < 2}>
              <UserPlus className="h-4 w-4 mr-1.5" /> {claiming ? "..." : (t("mm.claimAction"))}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyMatchesPage;
