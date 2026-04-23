import { useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Play, RotateCcw, Check, Trophy, Users, BarChart3, Brackets, Settings2, Tv, Plus, Minus, Shuffle, Download, FileText, PieChart, ExternalLink, Wand2, Trash2, MapPin, Gavel, Loader2, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useLanguage } from "@/i18n/LanguageContext";
import { useTournaments } from "@/context/TournamentContext";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  autoAllocatePools,
  suggestPoolCount,
  generateRoundRobinMatches,
  calculateStandings,
  generateBracket,
  getTournamentProgress,
  autoFillEmptyCourts,
  getAvailableResources,
  getWildcardEntries,
  nearestBracketSize,
} from "@/lib/tournament/engine";
import { Tournament, TournamentCategory, TournamentMatch, Pool, Standing } from "@/lib/tournament/types";
import { exportStandingsCSV, exportStandingsPDF } from "@/lib/tournament/export";
import { TournamentStats } from "@/components/TournamentStats";
import TourBudgetTab from "@/components/tour/TourBudgetTab";


const TourManagerControlPage = () => {
  const { tournamentId } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { tournaments, loading, updateTournament, deleteTournament, updateMatchScore: syncMatchScore } = useTournaments();
  const tournament = tournaments.find((t) => t.id === tournamentId);
  const [activeCatId, setActiveCatId] = useState<string>("");
  const [tab, setTab] = useState("matches");
  const [matchFilter, setMatchFilter] = useState<"all" | "not_started" | "in_progress" | "completed">("all");
  const [poolFilter, setPoolFilter] = useState("all");
  const [poolMode, setPoolMode] = useState<"auto" | "manual">("auto");
  const [manualPools, setManualPools] = useState<Record<string, string[]>>({});
  const [manualPoolCount, setManualPoolCount] = useState(2);
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useAuth();

  const isHost = tournament?.host_id === user?.id || !user; // Allow full access if no user (local dev)
  const isReferee = tournament?.referees?.some(r => r.userId === user?.id);
  const myRefereeId = tournament?.referees?.find(r => r.userId === user?.id)?.id;

  const allMatches = useMemo(() => {
    if (!tournament) return [];
    return (tournament.categories || []).flatMap((c) => [
      ...(c.pools || []).flatMap((p) => p.matches || []),
      ...(c.bracketRounds || []).flatMap((r) => r.matches || []),
    ]);
  }, [tournament]);

  const entryMap = useMemo(() => {
    const map: Record<string, string> = {};
    const activeCat = tournament?.categories.find((c) => c.id === activeCatId) || tournament?.categories[0];
    activeCat?.entries.forEach((e) => (map[e.id] = e.name));
    return map;
  }, [tournament, activeCatId]);

  const refereeMap = useMemo(() => {
    const map: Record<string, string> = {};
    tournament?.referees?.forEach((r) => (map[r.id] = r.name));
    return map;
  }, [tournament]);

  const courtMap = useMemo(() => {
    const map: Record<string, string> = {};
    tournament?.courts?.forEach((c) => (map[c.id] = c.name));
    return map;
  }, [tournament]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground">{t("tm.syncing") || "Syncing with Cloud..."}</p>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <p className="text-muted-foreground mb-4">{t("tm.notFound")}</p>
        <Button onClick={() => navigate("/tour-manager")}>{t("common.back")}</Button>
      </div>
    );
  }

  const activeCat = tournament?.categories.find((c) => c.id === activeCatId) || tournament?.categories[0];
  const progress = getTournamentProgress(allMatches);

  // ── Actions ──
  const save = async (updated: Tournament) => {
    setIsSaving(true);
    try {
      await updateTournament(updated);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!tournament) return;
    await deleteTournament(tournament.id);
    navigate("/tour-manager");
  };

  const generatePools = async () => {
    if (!activeCat || !tournament) return;
    const targetPlayersPerPool = parseInt(tournament.playersPerPool as string) || 4;
    const poolCount = Math.max(1, Math.ceil(activeCat.entries.length / targetPlayersPerPool));
    const pools = autoAllocatePools(activeCat.entries, poolCount);
    // Generate RR matches for each pool
    pools.forEach((pool) => {
      pool.matches = generateRoundRobinMatches(pool, activeCat.id, entryMap);
    });
    const updated = {
      ...tournament,
      status: "active" as const,
      categories: tournament.categories.map((c) =>
        c.id === activeCat.id ? { ...c, pools } : c
      ),
    };
    await save(updated);
    toast.success(t("tm.poolsGenerated"));
  };

  const confirmManualPools = async () => {
    if (!activeCat || !tournament) return;
    const poolNames = Object.keys(manualPools).sort();
    const unassigned = activeCat.entries.filter(
      (e) => !poolNames.some((pn) => manualPools[pn]?.includes(e.id))
    );
    if (unassigned.length > 0) {
      toast.error(t("tm.unassignedPlayers"));
      return;
    }
    const pools: Pool[] = poolNames.map((name) => {
      const pool: Pool = {
        id: `pool-${name}`,
        name,
        entryIds: manualPools[name] || [],
        matches: [],
      };
      pool.matches = generateRoundRobinMatches(pool, activeCat.id, entryMap);
      return pool;
    });
    const updated = {
      ...tournament,
      status: "active" as const,
      categories: tournament.categories.map((c) =>
        c.id === activeCat.id ? { ...c, pools, poolAllocationMode: "manual" as const } : c
      ),
    };
    await save(updated);
    toast.success(t("tm.poolsGenerated"));
  };

  const updateMatchScore = async (matchId: string, scoreA: number, scoreB: number) => {
    // Optimistic local update (optional, but good for UX)
    const updateMatch = (m: TournamentMatch): TournamentMatch =>
      m.id === matchId ? { ...m, scoreA, scoreB, status: "in_progress" } : m;

    // Sync to Supabase
    await syncMatchScore(matchId, scoreA, scoreB, "in_progress");
  };

  const completeMatch = async (matchId: string) => {
    const match = allMatches.find(m => m.id === matchId);
    if (!match) return;

    const winnerId = match.scoreA > match.scoreB ? match.entryAId : match.entryBId;
    
    // Sync to Supabase
    await syncMatchScore(matchId, match.scoreA, match.scoreB, "completed", winnerId);
    toast.success(t("tm.matchCompleted"));
  };

  const generateKnockout = () => {
    if (!activeCat || !tournament) return;
    
    // 1. Get Auto-Qualified entries (ranked 1..advancingPerPool)
    const standings = (activeCat.pools || []).flatMap((pool) =>
      calculateStandings(pool.matches || [], pool.entryIds || [], entryMap, activeCat.advancingPerPool, tournament.rankingPriority)
    );
    const autoQualified = standings.filter((s) => s.qualified);

    // 2. Get Wildcard entries (best 3rd place etc.)
    const autoQualifiedCount = autoQualified.length;
    let actualWildcardCount = activeCat.wildcardCount || 0;
    
    if (activeCat.wildcardCount === -1) {
      const targetBracketSize = nearestBracketSize(autoQualifiedCount);
      actualWildcardCount = targetBracketSize - autoQualifiedCount;
    }

    const wildcards = getWildcardEntries(
      activeCat.pools,
      entryMap,
      activeCat.advancingPerPool,
      actualWildcardCount,
      tournament.rankingPriority
    );

    // 3. Combine and Seed them fairly
    // We combine all qualified teams and sort them by their performance metrics
    // to determine their seeding in the bracket.
    const allQualifiedStats = [...autoQualified, ...wildcards.map(w => w.stats)];
    
    // Sort all qualified teams by the tournament's ranking priority
    allQualifiedStats.sort((a, b) => {
      // Re-use the ranking priority logic (simplified here as we already have stats)
      for (const criterion of tournament.rankingPriority) {
        if (criterion === "wins") if (b.wins !== a.wins) return b.wins - a.wins;
        if (criterion === "point_diff") if (b.pointDiff !== a.pointDiff) return b.pointDiff - a.pointDiff;
        if (criterion === "points_scored") if (b.pointsScored !== a.pointsScored) return b.pointsScored - a.pointsScored;
        if (criterion === "match_diff") {
          const diffA = a.wins - a.losses;
          const diffB = b.wins - b.losses;
          if (diffB !== diffA) return diffB - diffA;
        }
      }
      return 0;
    });

    const finalQualified = allQualifiedStats.map(s => ({ id: s.entryId, name: s.entryName }));

    if (finalQualified.length < 2) {
      toast.error(t("tm.notEnoughQualified"));
      return;
    }

    const bracketRounds = generateBracket(finalQualified, activeCat.id);
    const updated = {
      ...tournament,
      categories: tournament.categories.map((c) =>
        c.id === activeCat.id ? { ...c, bracketRounds } : c
      ),
    };
    save(updated);
    toast.success(t("tm.bracketGenerated"));
  };

  const handleAutoAssignResources = () => {
    if (!activeCat || !tournament) return;
    if ((tournament.referees || []).length === 0 && (tournament.courts || []).length === 0) {
      toast.error(t("tm.noResources"));
      return;
    }
    
    // Flatten all matches first to assign them across the entire category
    const allCatMatches = [
      ...(activeCat.pools || []).flatMap((p) => p.matches || []),
      ...(activeCat.bracketRounds || []).flatMap((r) => r.matches || [])
    ];

    const filledMatches = autoFillEmptyCourts(
      allCatMatches,
      tournament.referees || [],
      tournament.courts || []
    );

    // Helper to find match in filledMatches
    const getFilled = (matchId: string) => filledMatches.find(m => m.id === matchId) || undefined;

    const updated = {
      ...tournament,
      categories: tournament.categories.map((c) =>
        c.id === activeCat.id
          ? {
              ...c,
              pools: c.pools.map((p) => ({
                ...p,
                matches: p.matches.map(m => getFilled(m.id) || m),
              })),
              bracketRounds: c.bracketRounds.map((r) => ({
                ...r,
                matches: r.matches.map(m => getFilled(m.id) || m),
              })),
            }
          : c
      ),
    };
    save(updated);
    toast.success(t("tm.resourcesAssigned"));
  };

  const updateMatchResource = (matchId: string, field: "refereeId" | "courtId", value: string | undefined) => {
    const updateMatch = (m: TournamentMatch): TournamentMatch =>
      m.id === matchId ? { ...m, [field]: value } : m;

    const updated = {
      ...tournament,
      categories: tournament.categories.map((c) =>
        c.id === activeCat.id
          ? {
              ...c,
              pools: c.pools.map((p) => ({ ...p, matches: p.matches.map(updateMatch) })),
              bracketRounds: c.bracketRounds.map((r) => ({
                ...r,
                matches: r.matches.map(updateMatch),
              })),
            }
          : c
      ),
    };
    save(updated);
  };

  const filteredMatches = useMemo(() => {
    let matches = activeCat?.pools?.flatMap((p) => p.matches || []) || [];
    if (poolFilter !== "all") matches = matches.filter((m) => m.poolId === poolFilter);
    if (matchFilter !== "all") matches = matches.filter((m) => m.status === matchFilter);
    // If referee, only show their assigned matches
    if (!isHost && isReferee && myRefereeId) {
      matches = matches.filter((m) => m.refereeId === myRefereeId);
    }
    return matches;
  }, [activeCat, matchFilter, poolFilter, isHost, isReferee, myRefereeId]);

  if (!tournament) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <p className="text-muted-foreground mb-4">{t("tm.notFound")}</p>
        <Button onClick={() => navigate("/tour-manager")}>{t("common.back")}</Button>
      </div>
    );
  }

  // ── Render ──
  return (
    <div className="pb-24">
      {isSaving && (
        <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-bold animate-pulse">{t("tm.syncing") || "Syncing with Cloud..."}</p>
        </div>
      )}
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <Button variant="ghost" size="icon" onClick={() => navigate("/tour-manager")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-foreground truncate">{tournament.name}</h1>
            <p className="text-xs text-muted-foreground">{tournament.date} • {tournament.location}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                const url = window.location.origin + `/tournament-live/${tournament.id}`;
                navigator.clipboard.writeText(url);
                toast.success(t("tm.linkCopied"));
              }}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
            <Badge variant={tournament.status === "active" ? "default" : "secondary"}>
              {t(`tm.status.${tournament.status}`)}
            </Badge>

            {isHost && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("common.confirm")}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("tm.deleteConfirmDesc") || "Hành động này không thể hoàn tác. Toàn bộ dữ liệu về các trận đấu và bảng xếp hạng của giải này sẽ bị xóa vĩnh viễn."}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      {t("common.delete")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        {/* Dashboard strip */}
        <div className="flex gap-2 text-center">
          <div className="flex-1 bg-muted rounded-lg p-2">
            <p className="text-lg font-bold text-foreground">{progress.pct}%</p>
            <p className="text-[10px] text-muted-foreground">{t("tm.progress")}</p>
          </div>
          <div className="flex-1 bg-muted rounded-lg p-2">
            <p className="text-lg font-bold text-foreground">{progress.completed}/{progress.total}</p>
            <p className="text-[10px] text-muted-foreground">{t("tm.matchesDone")}</p>
          </div>
          <div className="flex-1 bg-muted rounded-lg p-2">
            <p className="text-lg font-bold text-foreground">{progress.inProgress}</p>
            <p className="text-[10px] text-muted-foreground">{t("tm.inProgress")}</p>
          </div>
        </div>

        {/* Category selector */}
        {tournament.categories.length > 1 && (
          <div className="flex gap-1 mt-2 overflow-x-auto">
            {tournament.categories.map((c) => (
              <Button
                key={c.id}
                variant={activeCat?.id === c.id ? "default" : "outline"}
                size="sm"
                className="text-xs whitespace-nowrap"
                onClick={() => setActiveCatId(c.id)}
              >
                {c.name}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Main Tabs */}
      <div className="px-4 pt-3">
        <Tabs value={tab} onValueChange={setTab}>
          <div className="overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
            <TabsList className="w-full flex justify-start min-w-max h-auto p-1 bg-secondary/50 backdrop-blur-sm">
              <TabsTrigger value="matches" className="text-[10px] py-1.5 px-3 data-[state=active]:bg-background">
                <Play className="h-3 w-3 mr-1" /> {t("tm.tab.matches")}
              </TabsTrigger>
              {(!isReferee || isHost) && (
                <>
                  <TabsTrigger value="standings" className="text-[10px] py-1.5 px-3 data-[state=active]:bg-background">
                    <BarChart3 className="h-3 w-3 mr-1" /> {t("tm.tab.standings")}
                  </TabsTrigger>
                  <TabsTrigger value="bracket" className="text-[10px] py-1.5 px-3 data-[state=active]:bg-background">
                    <Brackets className="h-3 w-3 mr-1" /> {t("tm.tab.bracket")}
                  </TabsTrigger>
                  <TabsTrigger value="stats" className="text-[10px] py-1.5 px-3 data-[state=active]:bg-background">
                    <PieChart className="h-3 w-3 mr-1" /> {t("tm.tab.stats")}
                  </TabsTrigger>
                  <TabsTrigger value="resources" className="text-[10px] py-1.5 px-3 data-[state=active]:bg-background">
                    <Settings2 className="h-3 w-3 mr-1" /> {t("tm.tab.resources")}
                  </TabsTrigger>
                  <TabsTrigger value="players" className="text-[10px] py-1.5 px-3 data-[state=active]:bg-background">
                    <Users className="h-3 w-3 mr-1" /> {t("tm.tab.players")}
                  </TabsTrigger>
                  <TabsTrigger value="budget" className="text-[10px] py-1.5 px-3 data-[state=active]:bg-background">
                    <Calculator className="h-3 w-3 mr-1" /> {t("tm.tab.budget") || "Budget"}
                  </TabsTrigger>
                </>
              )}
            </TabsList>
          </div>

          {/* ── Matches Tab ── */}
          <TabsContent value="matches" className="space-y-3 mt-3">
            {activeCat?.pools.length === 0 ? (
              <div className="space-y-4 py-4">
                <p className="text-sm text-muted-foreground text-center">{t("tm.noPools")}</p>

                {/* Mode toggle */}
                <div className="flex gap-2">
                  <Button
                    variant={poolMode === "auto" ? "default" : "outline"}
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => setPoolMode("auto")}
                  >
                    {t("tm.autoPool")}
                  </Button>
                  <Button
                    variant={poolMode === "manual" ? "default" : "outline"}
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => {
                      setPoolMode("manual");
                      // Initialize manual pools if empty
                      if (Object.keys(manualPools).length === 0) {
                        const init: Record<string, string[]> = {};
                        for (let i = 0; i < manualPoolCount; i++) {
                          init[String.fromCharCode(65 + i)] = [];
                        }
                        setManualPools(init);
                      }
                    }}
                  >
                    {t("tm.manualPool")}
                  </Button>
                </div>

                {poolMode === "auto" ? (
                  <div className="text-center">
                    <Button onClick={generatePools}>
                      <Play className="h-4 w-4 mr-1" /> {t("tm.generatePools")}
                    </Button>
                  </div>
                ) : (
                  <ManualPoolAllocation
                    entries={activeCat?.entries || []}
                    manualPools={manualPools}
                    setManualPools={setManualPools}
                    poolCount={manualPoolCount}
                    setPoolCount={setManualPoolCount}
                    onConfirm={confirmManualPools}
                    t={t}
                  />
                )}
              </div>
            ) : (
              <>
                {/* Filters */}
                <div className="flex gap-2">
                  <Select value={poolFilter} onValueChange={setPoolFilter}>
                    <SelectTrigger className="h-8 text-xs flex-1">
                      <SelectValue placeholder={t("tm.allPools")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("tm.allPools")}</SelectItem>
                      {activeCat?.pools.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{t("tm.pool")} {p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={matchFilter} onValueChange={(v) => setMatchFilter(v as any)}>
                    <SelectTrigger className="h-8 text-xs flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("common.all")}</SelectItem>
                      <SelectItem value="not_started">{t("tm.notStarted")}</SelectItem>
                      <SelectItem value="in_progress">{t("tm.inProgressLabel")}</SelectItem>
                      <SelectItem value="completed">{t("tm.completedLabel")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Bulk Assignments for Filtered Pool */}
                {poolFilter !== "all" && (
                  <div className="grid grid-cols-1 gap-2 bg-muted/30 p-2 rounded-lg border border-border/50">
                    {/* Assign Court */}
                    {tournament.courts && tournament.courts.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold whitespace-nowrap text-muted-foreground w-20 uppercase">📍 Court</span>
                        <Select onValueChange={(courtId) => {
                          const updated = {
                            ...tournament,
                            categories: tournament.categories.map(c => c.id === activeCat?.id ? {
                               ...c,
                               pools: c.pools.map(p => p.id === poolFilter ? {
                                  ...p,
                                  matches: p.matches.map(m => ({ ...m, courtId: courtId === "_none" ? undefined : courtId }))
                               } : p)
                            } : c)
                          };
                          save(updated);
                          toast.success(courtId === "_none" ? t("tm.unassignedCourt") : t("tm.assignedCourt"));
                        }}>
                           <SelectTrigger className="h-7 text-[10px] flex-1 bg-background">
                             <SelectValue placeholder={t("tm.assignCourt") || "Assign Court..."} />
                           </SelectTrigger>
                           <SelectContent>
                             <SelectItem value="_none">None</SelectItem>
                             {tournament.courts.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                           </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Assign Referee */}
                    {tournament.referees && tournament.referees.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold whitespace-nowrap text-muted-foreground w-20 uppercase">🏳️ Referee</span>
                        <Select onValueChange={(refId) => {
                          const updated = {
                            ...tournament,
                            categories: tournament.categories.map(c => c.id === activeCat?.id ? {
                               ...c,
                               pools: c.pools.map(p => p.id === poolFilter ? {
                                  ...p,
                                  matches: p.matches.map(m => ({ ...m, refereeId: refId === "_none" ? undefined : refId }))
                               } : p)
                            } : c)
                          };
                          save(updated);
                          toast.success(refId === "_none" ? t("tm.unassignedReferee") : t("tm.assignedReferee"));
                        }}>
                           <SelectTrigger className="h-7 text-[10px] flex-1 bg-background">
                             <SelectValue placeholder={t("tm.assignReferee") || "Assign Referee..."} />
                           </SelectTrigger>
                           <SelectContent>
                             <SelectItem value="_none">None</SelectItem>
                             {tournament.referees.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                           </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )}

                {/* Auto Assign Resources button */}
                {(tournament.referees?.length > 0 || tournament.courts?.length > 0) && (
                  <Button variant="outline" size="sm" className="w-full text-xs" onClick={handleAutoAssignResources}>
                    <Wand2 className="h-3 w-3 mr-1" /> {t("tm.autoAssignResources")}
                  </Button>
                )}

                {/* Match cards */}
                <div className="space-y-2">
                  {filteredMatches.map((match) => {
                    const isMyMatch = isReferee && match.refereeId === myRefereeId;
                    const readonly = !isHost && (!isMyMatch || match.status === "completed");
                    return (
                      <MatchCard
                        key={match.id}
                        match={match}
                        onScoreChange={updateMatchScore}
                        onComplete={completeMatch}
                        onResourceChange={isHost ? updateMatchResource : undefined}
                        referees={tournament.referees || []}
                        courts={tournament.courts || []}
                        refereeMap={refereeMap}
                        courtMap={courtMap}
                        t={t}
                        readonly={readonly}
                      />
                    );
                  })}
                  {filteredMatches.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-4">{t("tm.noMatches")}</p>
                  )}
                </div>
              </>
            )}
          </TabsContent>

          {/* ── Standings Tab ── */}
          <TabsContent value="standings" className="space-y-4 mt-3">
            {/* Export buttons */}
            {activeCat && activeCat.pools.length > 0 && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => exportStandingsCSV(tournament, activeCat, entryMap, t)}
                >
                  <Download className="h-3 w-3 mr-1" /> {t("tm.export.csv")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => exportStandingsPDF(tournament, activeCat, entryMap, t)}
                >
                  <FileText className="h-3 w-3 mr-1" /> {t("tm.export.pdf")}
                </Button>
              </div>
            )}
            {activeCat?.pools.map((pool) => {
              const standings = calculateStandings(
                pool.matches,
                pool.entryIds,
                entryMap,
                activeCat.advancingPerPool,
                tournament.rankingPriority
              );
              return (
                <Card key={pool.id}>
                  <CardHeader className="p-3 pb-1">
                    <CardTitle className="text-sm">{t("tm.pool")} {pool.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-muted">
                          <tr>
                            <th className="text-left p-2 font-medium">#</th>
                            <th className="text-left p-2 font-medium">{t("tm.player")}</th>
                            <th className="text-center p-2 font-medium">W</th>
                            <th className="text-center p-2 font-medium">L</th>
                            <th className="text-center p-2 font-medium">+/-</th>
                            <th className="text-center p-2 font-medium">PF</th>
                          </tr>
                        </thead>
                        <tbody>
                          {standings.map((s) => (
                            <tr
                              key={s.entryId}
                              className={`border-t border-border ${s.qualified ? "bg-primary/5" : ""}`}
                            >
                              <td className="p-2 font-medium">
                                {s.rank}
                                {s.qualified && <span className="text-primary ml-1">✓</span>}
                              </td>
                              <td className="p-2 font-medium text-foreground truncate max-w-[120px]">{s.entryName}</td>
                              <td className="p-2 text-center text-primary font-semibold">{s.wins}</td>
                              <td className="p-2 text-center text-destructive">{s.losses}</td>
                              <td className="p-2 text-center">{s.pointDiff > 0 ? `+${s.pointDiff}` : s.pointDiff}</td>
                              <td className="p-2 text-center text-muted-foreground">{s.pointsScored}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {(tournament.format === "hybrid" || tournament.format === "knockout") &&
              activeCat?.pools.length > 0 &&
              activeCat?.bracketRounds.length === 0 && (
                <Button className="w-full" onClick={generateKnockout}>
                  <Trophy className="h-4 w-4 mr-1" /> {t("tm.generateBracket")}
                </Button>
              )}
          </TabsContent>

          {/* ── Bracket Tab ── */}
          <TabsContent value="bracket" className="space-y-3 mt-3">
            {activeCat?.bracketRounds.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Brackets className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p>{t("tm.noBracket")}</p>
                {(tournament.format === "hybrid" || tournament.format === "knockout") && (
                  <Button variant="outline" size="sm" className="mt-3" onClick={generateKnockout}>
                    {t("tm.generateBracket")}
                  </Button>
                )}
              </div>
            ) : (
              activeCat?.bracketRounds.map((round) => (
                <Card key={round.id}>
                  <CardHeader className="p-3 pb-1">
                    <CardTitle className="text-sm">{round.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-2 space-y-2">
                    {round.matches
                      .filter((m) => m.entryAName !== "BYE" && m.entryBName !== "BYE")
                      .map((match) => (
                        <MatchCard
                          key={match.id}
                          match={match}
                          onScoreChange={updateMatchScore}
                          onComplete={completeMatch}
                          onResourceChange={updateMatchResource}
                          referees={tournament.referees || []}
                          courts={tournament.courts || []}
                          refereeMap={refereeMap}
                          courtMap={courtMap}
                          t={t}
                          compact
                        />
                      ))}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* ── Stats Tab ── */}
          <TabsContent value="stats" className="mt-3">
            {activeCat && (
              <TournamentStats category={activeCat} entryMap={entryMap} t={t} />
            )}
          </TabsContent>

          {/* ── Resources Tab ── */}
          <TabsContent value="resources" className="space-y-4 mt-3">
            {/* Call Next Match Action */}
            {activeCat?.pools.length > 0 && tournament.courts && tournament.courts.length > 0 && (
              <Button className="w-full shadow-sm" size="sm" onClick={handleAutoAssignResources}>
                <Wand2 className="h-4 w-4 mr-1" /> {t("tm.autoAssignResources") || "Auto-fill Empty Courts"}
              </Button>
            )}

            {/* Court Dashboard */}
            {tournament.courts && tournament.courts.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {tournament.courts.map(court => {
                  const currentMatch = allMatches.find(m => m.courtId === court.id && m.status === "in_progress");
                  return (
                    <Card key={court.id} className={`border-2 ${currentMatch ? 'border-primary/50 bg-primary/5' : 'border-dashed border-border/50'}`}>
                      <CardContent className="p-3 text-center flex flex-col items-center justify-center min-h-[90px]">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">📍 {court.name}</p>
                        {currentMatch ? (
                          <>
                            <div className="flex flex-col justify-center items-center gap-0 w-full mb-1">
                              <span className="truncate w-full text-xs font-semibold">{currentMatch.entryAName}</span>
                              <span className="text-primary font-display text-sm font-bold">{currentMatch.scoreA} - {currentMatch.scoreB}</span>
                              <span className="truncate w-full text-xs font-semibold">{currentMatch.entryBName}</span>
                            </div>
                            {currentMatch.refereeId && refereeMap?.[currentMatch.refereeId] && (
                              <Badge variant="secondary" className="text-[9px] mt-1 py-0 px-1 font-medium">🏳️ {refereeMap[currentMatch.refereeId]}</Badge>
                            )}
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-semibold text-muted-foreground opacity-50 mb-1">Idle</p>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Courts Setup */}
            <Card>
              <CardHeader className="p-3 pb-1">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-primary" /> {t("tm.courts")} ({tournament.courts?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-2">
                {(tournament.courts || []).map((court, i) => (
                  <div key={court.id} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
                    <Input
                      className="h-7 text-xs flex-1"
                      value={court.name}
                      onChange={(e) => {
                        const updated = {
                          ...tournament,
                          courts: tournament.courts.map((c) =>
                            c.id === court.id ? { ...c, name: e.target.value } : c
                          ),
                        };
                        save(updated);
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => {
                        save({ ...tournament, courts: tournament.courts.filter((c) => c.id !== court.id) });
                      }}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => {
                    const id = `court-${Date.now()}`;
                    const name = `Court ${(tournament.courts?.length || 0) + 1}`;
                    save({ ...tournament, courts: [...(tournament.courts || []), { id, name }] });
                  }}
                >
                  <Plus className="h-3 w-3 mr-1" /> {t("tm.addCourt")}
                </Button>
              </CardContent>
            </Card>

            {/* Referees */}
            <Card>
              <CardHeader className="p-3 pb-1">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <Gavel className="h-4 w-4 text-primary" /> {t("tm.referees")} ({tournament.referees?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-2">
                {(tournament.referees || []).map((ref, i) => (
                  <div key={ref.id} className="space-y-1 bg-secondary/20 p-2 rounded-lg border border-border/50">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
                      <Input
                        className="h-7 text-xs flex-1"
                        value={ref.name}
                        onChange={(e) => {
                          const updated = {
                            ...tournament,
                            referees: tournament.referees.map((r) =>
                              r.id === ref.id ? { ...r, name: e.target.value } : r
                            ),
                          };
                          save(updated);
                        }}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => {
                          save({ ...tournament, referees: tournament.referees.filter((r) => r.id !== ref.id) });
                        }}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                    {ref.accessCode && (
                      <div className="flex justify-between items-center pl-7 pr-1 text-[10px]">
                        <span className="text-muted-foreground">Access Code: <strong className="font-mono text-primary bg-primary/10 px-1 py-0.5 rounded select-all">{ref.accessCode}</strong></span>
                        {ref.userId ? <span className="text-emerald-500 font-bold">✓ Đã tham gia</span> : <span className="text-amber-500">Chờ tham gia</span>}
                      </div>
                    )}
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => {
                    const id = `ref-${Date.now()}`;
                    const name = `Referee ${(tournament.referees?.length || 0) + 1}`;
                    const accessCode = Math.random().toString(36).substring(2, 8).toUpperCase();
                    save({ ...tournament, referees: [...(tournament.referees || []), { id, name, accessCode }] });
                  }}
                >
                  <Plus className="h-3 w-3 mr-1" /> {t("tm.addReferee")}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Players Tab ── */}
          <TabsContent value="players" className="space-y-2 mt-3">
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm font-medium text-foreground">
                {activeCat?.entries.length} {t("tm.players")}
              </p>
            </div>
            {activeCat?.entries.map((entry, i) => (
              <Card key={entry.id}>
                <CardContent className="p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm text-foreground">{entry.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-[10px] text-muted-foreground whitespace-nowrap">Seed #</Label>
                    <Input
                      type="number"
                      className="h-7 w-16 text-xs"
                      value={entry.seed || ""}
                      onChange={(e) => {
                        const seed = parseInt(e.target.value) || undefined;
                        const updated = {
                          ...tournament,
                          categories: tournament.categories.map((c) =>
                            c.id === activeCat.id
                              ? {
                                  ...c,
                                  entries: c.entries.map((ent) =>
                                    ent.id === entry.id ? { ...ent, seed } : ent
                                  ),
                                }
                              : c
                          ),
                        };
                        updateTournament(updated);
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* ── Budget Tab ── */}
          <TabsContent value="budget" className="mt-3">
            <TourBudgetTab tournament={tournament} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// ── Match Card Component ──
function MatchCard({
  match,
  onScoreChange,
  onComplete,
  onResourceChange,
  referees,
  courts,
  refereeMap,
  courtMap,
  t,
  compact,
  readonly,
}: {
  match: TournamentMatch;
  onScoreChange: (id: string, a: number, b: number) => void;
  onComplete: (id: string) => void;
  onResourceChange?: (id: string, field: "refereeId" | "courtId", value: string | undefined) => void;
  referees?: { id: string; name: string }[];
  courts?: { id: string; name: string }[];
  refereeMap?: Record<string, string>;
  courtMap?: Record<string, string>;
  t: (key: string) => string;
  compact?: boolean;
  readonly?: boolean;
}) {
  const statusBg = {
    not_started: "bg-muted",
    in_progress: "bg-primary/5 border-primary/30",
    completed: "bg-muted/50",
  };

  const hasResources = (referees && referees.length > 0) || (courts && courts.length > 0);

  return (
    <Card className={`${statusBg[match.status]} border`}>
      <CardContent className={compact ? "p-2" : "p-3"}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-muted-foreground">
            {match.poolId && `${t("tm.pool")} ${match.poolId.split("-").pop()?.toUpperCase()} • `}
            #{match.matchNo}
          </span>
          <div className="flex items-center gap-1">
            {/* Court badge */}
            {match.courtId && courtMap?.[match.courtId] && (
              <span className="text-[9px] bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded font-medium">
                📍 {courtMap[match.courtId]}
              </span>
            )}
            {/* Referee badge */}
            {match.refereeId && refereeMap?.[match.refereeId] && (
              <span className="text-[9px] bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded font-medium">
                🏳️ {refereeMap[match.refereeId]}
              </span>
            )}
            <Badge
              variant={match.status === "completed" ? "default" : match.status === "in_progress" ? "outline" : "secondary"}
              className="text-[10px]"
            >
              {match.status === "completed" ? "✓" : match.status === "in_progress" ? "LIVE" : "—"}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className={`flex-1 text-right min-w-0 ${match.winner === match.entryAId ? "font-bold text-primary" : "text-foreground"}`}>
            <p className="text-sm font-semibold line-clamp-2 break-words leading-tight min-h-[2.5rem] flex items-center justify-end">
              {match.entryAName}
            </p>
            <p className="text-[10px] text-muted-foreground">Team A</p>
          </div>

          {/* Score Controls */}
          <div className="flex items-center gap-1.5 bg-secondary/50 rounded-xl p-1 shadow-inner">
            {!readonly && match.status !== "completed" ? (
              <>
                <div className="flex flex-col items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 bg-card text-primary shadow-sm hover:bg-primary/10"
                    onClick={() => onScoreChange(match.id, match.scoreA + 1, match.scoreB)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <input
                    type="number"
                    value={match.scoreA}
                    onChange={(e) => onScoreChange(match.id, parseInt(e.target.value) || 0, match.scoreB)}
                    className="text-xl font-display font-black w-10 text-center bg-transparent focus:outline-none focus:ring-0 select-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-foreground tabular-nums"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 bg-card text-muted-foreground shadow-sm hover:bg-destructive/10"
                    onClick={() => onScoreChange(match.id, Math.max(0, match.scoreA - 1), match.scoreB)}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="h-10 w-[2px] bg-border/50 mx-1" />

                <div className="flex flex-col items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 bg-card text-primary shadow-sm hover:bg-primary/10"
                    onClick={() => onScoreChange(match.id, match.scoreA, match.scoreB + 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <input
                    type="number"
                    value={match.scoreB}
                    onChange={(e) => onScoreChange(match.id, match.scoreA, parseInt(e.target.value) || 0)}
                    className="text-xl font-display font-black w-10 text-center bg-transparent focus:outline-none focus:ring-0 select-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-foreground tabular-nums"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 bg-card text-muted-foreground shadow-sm hover:bg-destructive/10"
                    onClick={() => onScoreChange(match.id, match.scoreA, Math.max(0, match.scoreB - 1))}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="px-4 py-2 flex items-center gap-3">
                <span className="text-2xl font-display font-black text-foreground">{match.scoreA}</span>
                <span className="text-muted-foreground font-bold">:</span>
                <span className="text-2xl font-display font-black text-foreground">{match.scoreB}</span>
              </div>
            )}
          </div>

          <div className={`flex-1 min-w-0 ${match.winner === match.entryBId ? "font-bold text-primary" : "text-foreground"}`}>
            <p className="text-sm font-semibold line-clamp-2 break-words leading-tight min-h-[2.5rem] flex items-center">
              {match.entryBName}
            </p>
            <p className="text-[10px] text-muted-foreground">Team B</p>
          </div>
        </div>

        {/* Resource selectors (manual mode) */}
        {hasResources && onResourceChange && match.status !== "completed" && (
          <div className="flex gap-2 mt-2">
            {courts && courts.length > 0 && (
              <Select
                value={match.courtId || "_none"}
                onValueChange={(v) => onResourceChange(match.id, "courtId", v === "_none" ? undefined : v)}
              >
                <SelectTrigger className="h-7 text-[10px] flex-1">
                  <SelectValue placeholder={t("tm.noCourt")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">{t("tm.noCourt")}</SelectItem>
                  {courts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {referees && referees.length > 0 && (
              <Select
                value={match.refereeId || "_none"}
                onValueChange={(v) => onResourceChange(match.id, "refereeId", v === "_none" ? undefined : v)}
              >
                <SelectTrigger className="h-7 text-[10px] flex-1">
                  <SelectValue placeholder={t("tm.noReferee")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">{t("tm.noReferee")}</SelectItem>
                  {referees.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        {/* Complete button */}
        {match.status !== "completed" && (match.scoreA > 0 || match.scoreB > 0) && (
          <Button
            size="sm"
            className="w-full mt-3 h-10 text-sm font-bold shadow-md active:scale-95 transition-transform"
            onClick={() => onComplete(match.id)}
            disabled={match.scoreA === match.scoreB}
          >
            <Check className="h-4 w-4 mr-2" /> {t("tm.completeMatch")}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ── Manual Pool Allocation Component ──
function ManualPoolAllocation({
  entries,
  manualPools,
  setManualPools,
  poolCount,
  setPoolCount,
  onConfirm,
  t,
}: {
  entries: { id: string; name: string }[];
  manualPools: Record<string, string[]>;
  setManualPools: (p: Record<string, string[]>) => void;
  poolCount: number;
  setPoolCount: (n: number) => void;
  onConfirm: () => void;
  t: (key: string) => string;
}) {
  const poolNames = Array.from({ length: poolCount }, (_, i) => String.fromCharCode(65 + i));

  // Ensure pool keys exist
  const pools = { ...manualPools };
  poolNames.forEach((n) => { if (!pools[n]) pools[n] = []; });

  const assignedIds = new Set(Object.values(pools).flat());
  const unassigned = entries.filter((e) => !assignedIds.has(e.id));

  const assignPlayer = (playerId: string, poolName: string) => {
    const updated = { ...pools };
    // Remove from any current pool
    Object.keys(updated).forEach((k) => {
      updated[k] = updated[k].filter((id) => id !== playerId);
    });
    updated[poolName] = [...(updated[poolName] || []), playerId];
    setManualPools(updated);
  };

  const removePlayer = (playerId: string) => {
    const updated = { ...pools };
    Object.keys(updated).forEach((k) => {
      updated[k] = updated[k].filter((id) => id !== playerId);
    });
    setManualPools(updated);
  };

  const handlePoolCountChange = (n: number) => {
    if (n < 2 || n > 8) return;
    setPoolCount(n);
    const newPools: Record<string, string[]> = {};
    for (let i = 0; i < n; i++) {
      const name = String.fromCharCode(65 + i);
      newPools[name] = pools[name] || [];
    }
    setManualPools(newPools);
  };

  const entryMap: Record<string, string> = {};
  entries.forEach((e) => (entryMap[e.id] = e.name));

  return (
    <div className="space-y-3">
      {/* Pool count control */}
      <div className="flex items-center gap-2">
        <Label className="text-xs">{t("tm.poolCount")}</Label>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handlePoolCountChange(poolCount - 1)}>
            <Minus className="h-3 w-3" />
          </Button>
          <span className="w-8 text-center text-sm font-bold text-foreground">{poolCount}</span>
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handlePoolCountChange(poolCount + 1)}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Unassigned players */}
      {unassigned.length > 0 && (
        <Card>
          <CardHeader className="p-2 pb-1 flex flex-row items-center justify-between">
            <CardTitle className="text-xs text-muted-foreground">
              {t("tm.unassigned")} ({unassigned.length})
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => {
                const updated = { ...pools };
                // Snake-distribute unassigned into pools sorted by current size (smallest first)
                const remaining = [...unassigned];
                remaining.forEach((e, idx) => {
                  // Find pool with fewest players
                  const sorted = [...poolNames].sort(
                    (a, b) => (updated[a]?.length || 0) - (updated[b]?.length || 0)
                  );
                  const target = sorted[0];
                  updated[target] = [...(updated[target] || []), e.id];
                });
                setManualPools(updated);
              }}
            >
              <Shuffle className="h-3 w-3" />
              {t("tm.autoBalanceRemaining")}
            </Button>
          </CardHeader>
          <CardContent className="p-2 flex flex-wrap gap-1">
            {unassigned.map((e) => (
              <div key={e.id} className="group relative">
                <Badge variant="secondary" className="text-xs cursor-pointer pr-1">
                  {e.name}
                  <Select onValueChange={(v) => assignPlayer(e.id, v)}>
                    <SelectTrigger className="h-4 w-4 ml-1 p-0 border-0 bg-transparent [&>svg]:h-3 [&>svg]:w-3">
                      <Plus className="h-3 w-3" />
                    </SelectTrigger>
                    <SelectContent>
                      {poolNames.map((pn) => (
                        <SelectItem key={pn} value={pn}>{t("tm.pool")} {pn}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Pool cards */}
      {poolNames.map((pn) => (
        <Card key={pn} className="border-primary/20">
          <CardHeader className="p-2 pb-1">
            <CardTitle className="text-xs flex justify-between items-center">
              <span>{t("tm.pool")} {pn}</span>
              <Badge variant="outline" className="text-[10px]">{(pools[pn] || []).length} {t("tm.players")}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 flex flex-wrap gap-1 min-h-[32px]">
            {(pools[pn] || []).map((id) => (
              <Badge key={id} variant="default" className="text-xs gap-1">
                {entryMap[id] || id}
                <button onClick={() => removePlayer(id)} className="ml-0.5 hover:text-destructive">×</button>
              </Badge>
            ))}
            {(pools[pn] || []).length === 0 && (
              <span className="text-[10px] text-muted-foreground">{t("tm.dragHere")}</span>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Confirm */}
      <Button
        className="w-full"
        onClick={onConfirm}
        disabled={unassigned.length > 0}
      >
        <Check className="h-4 w-4 mr-1" /> {t("tm.confirmPools")}
      </Button>
      {unassigned.length > 0 && (
        <p className="text-[10px] text-destructive text-center">{t("tm.assignAllFirst")}</p>
      )}
    </div>
  );
}

export default TourManagerControlPage;
