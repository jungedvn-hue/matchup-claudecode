import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Trophy, Crown, Check, Clock, Users,
  Calendar, MapPin, ChevronDown, ChevronUp, Minus, Plus, ExternalLink, Tv, Loader2
} from "lucide-react";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTournaments } from "@/context/TournamentContext";
import { useTournamentRealtime } from "@/hooks/useTournamentRealtime";
import { calculateStandings, getTournamentProgress, getWinnerId } from "@/lib/tournament/engine";
import { TournamentMatch } from "@/lib/tournament/types";

const tabs = ["Matches", "Leaderboard"];

const TournamentLivePage = () => {
  const { tournamentId } = useParams();
  const navigate = useNavigate();
  const { tournaments, loading } = useTournaments();
  const tournament = tournaments.find(t => t.id === tournamentId);

  // Scoped realtime: only this tournament's events arrive on this page.
  useTournamentRealtime(tournamentId ? [tournamentId] : []);
  const [activeTab, setActiveTab] = useState("Matches");
  const [activeCatId, setActiveCatId] = useState<string>("");

  const activeCat = tournament?.categories.find(c => c.id === activeCatId) || tournament?.categories[0];
  
  const entryMap = useMemo(() => {
    const map: Record<string, string> = {};
    activeCat?.entries.forEach(e => map[e.id] = e.name);
    return map;
  }, [activeCat]);

  const allMatches = useMemo(() => [
    ...(activeCat?.pools.flatMap(p => p.matches) || []),
    ...(activeCat?.bracketRounds.flatMap(r => r.matches) || [])
  ], [activeCat]);

  const progress = getTournamentProgress(allMatches);

  const refereeMap = useMemo(() => {
    const map: Record<string, string> = {};
    tournament?.referees?.forEach(r => map[r.id] = r.name);
    return map;
  }, [tournament]);

  const courtMap = useMemo(() => {
    const map: Record<string, string> = {};
    tournament?.courts?.forEach(c => map[c.id] = c.name);
    return map;
  }, [tournament]);

  const leaderboard = useMemo(() => {
    if (!activeCat) return [];
    // If it's pure knockout, we might not show a leaderboard or show a different view
    // For now, assume we calculate standings from pool matches if they exist
    const poolMatches = activeCat.pools.flatMap(p => p.matches);
    const poolEntryIds = activeCat.pools.flatMap(p => p.entryIds);
    
    if (poolMatches.length > 0) {
      return calculateStandings(poolMatches, poolEntryIds, entryMap, 0, tournament?.rankingPriority);
    }
    return [];
  }, [activeCat, entryMap, tournament?.rankingPriority]);

  const getRoundLabel = (roundName: string) => {
    return roundName;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground">Syncing Live Score...</p>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <p className="text-muted-foreground mb-4">Tournament not found</p>
        <Button onClick={() => navigate("/tournaments")}>Back to Discover</Button>
      </div>
    );
  }

  // Champion = winner of the bracket's last round Final (auto-detect across categories).
  // Falls back to leaderboard #1 only if tournament was manually marked completed.
  const bracketChampion = (() => {
    for (const cat of tournament.categories || []) {
      const rounds = cat.bracketRounds || [];
      if (rounds.length === 0) continue;
      const final = rounds[rounds.length - 1];
      const finalMatch = final.matches?.find(
        (m) => m.entryAName !== "BYE" && m.entryBName !== "BYE"
      );
      if (finalMatch?.status === "completed" && finalMatch.winner) {
        return finalMatch.winner === finalMatch.entryAId
          ? finalMatch.entryAName
          : finalMatch.entryBName;
      }
    }
    return null;
  })();
  const champion = bracketChampion || (tournament.status === "completed" ? leaderboard[0]?.entryName : null);

  return (
    <div className="pb-6 min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3 space-y-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/tournaments")} className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center">
            <ArrowLeft className="h-4 w-4 text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-display font-bold text-foreground">{tournament.name}</h1>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="capitalize">{tournament.format.replace("_", " ")}</span>
              <span>·</span>
              <span>{progress.completed}/{progress.total} matches</span>
            </div>
          </div>
          {tournament.status === "completed" || bracketChampion ? (
            <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded-lg">Complete</span>
          ) : (
            <span className="text-xs font-semibold text-sport-orange bg-sport-orange/10 px-2 py-1 rounded-lg">Live</span>
          )}
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress.pct}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground text-right">{progress.pct}% complete</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-secondary rounded-xl p-0.5">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                activeTab === tab ? "bg-card text-card-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Champion banner */}
      <AnimatePresence>
        {champion && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            className="mx-4 mt-4 rounded-xl bg-gradient-to-r from-primary to-accent p-4 text-center overflow-hidden"
          >
            <Trophy className="h-8 w-8 text-primary-foreground mx-auto mb-1" />
            <p className="text-xs text-primary-foreground/80 font-medium">Champion</p>
            <p className="text-lg font-display font-bold text-primary-foreground">{champion}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="px-4 pt-4 space-y-4">
        {/* MATCHES TAB */}
        {activeTab === "Matches" && (
          <div className="space-y-6">
            {/* Category Selector if multiple */}
            {tournament.categories.length > 1 && (
              <div className="flex gap-1 overflow-x-auto pb-1">
                {tournament.categories.map(c => (
                  <Button
                    key={c.id}
                    variant={activeCat?.id === c.id ? "default" : "outline"}
                    size="sm"
                    className="text-[10px] h-7 px-2"
                    onClick={() => setActiveCatId(c.id)}
                  >
                    {c.name}
                  </Button>
                ))}
              </div>
            )}

            {/* Live Courts Section */}
            {(() => {
              const liveMatches = allMatches.filter(m => m.status === "in_progress" && m.courtId);
              if (liveMatches.length === 0) return null;
              return (
                <div className="space-y-3 mb-6">
                  <h3 className="text-xs font-bold text-sport-orange uppercase flex items-center gap-2">
                    <Tv className="h-3 w-3 animate-pulse" /> Live Courts
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {liveMatches.map(match => (
                      <Card key={match.id} className="border-sport-orange/50 bg-sport-orange/5 overflow-hidden shadow-sm">
                        <div className="bg-sport-orange/10 px-3 py-1.5 flex justify-between items-center border-b border-sport-orange/20">
                          <span className="text-[10px] font-bold text-sport-orange uppercase whitespace-nowrap">📍 {courtMap?.[match.courtId!] || "Court"}</span>
                          <span className="text-[9px] font-semibold text-sport-orange uppercase animate-pulse flex items-center gap-1">
                            <div className="h-1.5 w-1.5 rounded-full bg-sport-orange"></div> Live
                          </span>
                        </div>
                        <div className="p-3">
                           <div className="flex justify-between items-center gap-2">
                             <span className="flex-1 text-sm font-semibold truncate text-right">{match.entryAName}</span>
                             <div className="bg-background rounded-lg px-3 py-1 font-display font-bold text-lg shadow-inner text-foreground">
                               {match.scoreA} <span className="text-muted-foreground opacity-50 mx-1">:</span> {match.scoreB}
                             </div>
                             <span className="flex-1 text-sm font-semibold truncate text-left">{match.entryBName}</span>
                           </div>
                           {match.refereeId && refereeMap?.[match.refereeId] && (
                             <p className="text-[10px] text-center text-muted-foreground mt-2 font-medium">
                               🏳️ Referee: {refereeMap[match.refereeId]}
                             </p>
                           )}
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })()}

            {activeCat?.bracketRounds && activeCat.bracketRounds.length > 0 && (
              <div className="space-y-6">
                <h3 className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">
                  <Trophy className="h-3 w-3" /> Knockout Stage
                </h3>
                <div className="pb-4">
                  <div className="flex flex-wrap gap-4">
                    {activeCat.bracketRounds.map(round => {
                      const realMatches = round.matches.filter(
                        m => m.entryAName !== "BYE" && m.entryBName !== "BYE"
                      );
                      return (
                        <div key={round.id} className="space-y-3 flex-1 min-w-[240px]">
                          <p className="text-[11px] font-bold text-primary bg-primary/5 py-1 rounded text-center border border-primary/10">
                            {round.name}
                            <span className="ml-2 font-normal text-muted-foreground">
                              ({realMatches.filter(m => m.status === "completed").length}/{realMatches.length})
                            </span>
                          </p>
                          {realMatches.map(match => (
                            <MatchCard
                              key={match.id}
                              match={match}
                              entryMap={entryMap}
                              refereeMap={refereeMap}
                              courtMap={courtMap}
                            />
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {activeCat?.pools && activeCat.pools.length > 0 && (
              <div className="space-y-6">
                <h3 className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">
                  <ExternalLink className="h-3 w-3" /> Group Stage
                </h3>
                {activeCat.pools.map(pool => (
                  <section key={pool.id} className="space-y-2">
                    <h4 className="text-xs font-semibold text-muted-foreground">Pool {pool.name}</h4>
                    <div className="grid grid-cols-1 gap-2">
                      {pool.matches.map(match => (
                        <MatchCard
                          key={match.id}
                          match={match}
                          entryMap={entryMap}
                          refereeMap={refereeMap}
                          courtMap={courtMap}
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        )}

        {/* LEADERBOARD TAB */}
        {activeTab === "Leaderboard" && (
          <div className="space-y-3">
            {/* Top 3 podium */}
            {leaderboard.length >= 3 && (
              <div className="flex items-end justify-center gap-3 pt-4 pb-2">
                {[1, 0, 2].map(idx => {
                  const p = leaderboard[idx];
                  if (!p) return null;
                  const heights = ["h-24", "h-20", "h-16"];
                  const medals = ["🥇", "🥈", "🥉"];
                  const sizes = idx === 0 ? "w-16" : "w-14";
                  return (
                    <motion.div
                      key={p.entryId}
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: idx * 0.1 }}
                      className={`flex flex-col items-center ${sizes}`}
                    >
                      <span className="text-xl mb-1">{medals[idx]}</span>
                      <div className={`w-full ${heights[idx]} rounded-t-lg ${
                        idx === 0 ? "bg-primary" : idx === 1 ? "bg-primary/60" : "bg-primary/30"
                      } flex items-end justify-center pb-2`}>
                        <span className="text-[10px] font-bold text-primary-foreground">{p.wins}W</span>
                      </div>
                      <p className="text-[10px] font-semibold text-card-foreground mt-1 text-center truncate w-full">{p.entryName.split(" ")[0]}</p>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Full table */}
            <Card className="shadow-card overflow-hidden">
              <div className="grid grid-cols-[40px_1fr_48px_48px_56px] gap-0 text-[10px] font-semibold text-muted-foreground bg-secondary px-3 py-2">
                <span>#</span>
                <span>Player</span>
                <span className="text-center">W</span>
                <span className="text-center">L</span>
                <span className="text-right">Diff</span>
              </div>
              {leaderboard.map((p, i) => (
                <motion.div
                  key={p.name}
                  layout
                  transition={{ duration: 0.3 }}
                  className={`grid grid-cols-[40px_1fr_48px_48px_56px] gap-0 items-center px-3 py-2.5 ${
                    i < leaderboard.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <span className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    i === 0 ? "bg-accent/20 text-accent-foreground"
                      : i === 1 ? "bg-primary/10 text-primary"
                      : i === 2 ? "bg-sport-orange/10 text-sport-orange"
                      : "bg-secondary text-secondary-foreground"
                  }`}>{i + 1}</span>
                  <div>
                    <p className="text-xs font-medium text-card-foreground">{p.entryName}</p>
                    <p className="text-[10px] text-muted-foreground">{p.played} played</p>
                  </div>
                  <span className="text-xs font-bold text-primary text-center">{p.wins}</span>
                  <span className="text-xs text-muted-foreground text-center">{p.losses}</span>
                  <span className={`text-xs font-semibold text-right ${
                    p.pointDiff > 0 ? "text-primary" : p.pointDiff < 0 ? "text-destructive" : "text-muted-foreground"
                  }`}>
                    {p.pointDiff > 0 ? "+" : ""}{p.pointDiff}
                  </span>
                </motion.div>
              ))}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

/* ---------- Match Score Card Component ---------- */

const MatchCard = ({ match, entryMap, refereeMap, courtMap }: {
  match: TournamentMatch;
  entryMap: Record<string, string>;
  refereeMap?: Record<string, string>;
  courtMap?: Record<string, string>;
}) => {
  const winner = getWinnerId(match);
  const isDraw = match.status === "completed" && match.scoreA === match.scoreB;

  return (
    <Card className={`shadow-sm overflow-hidden border ${
      match.status === "completed" ? "bg-muted/30 border-primary/10" : "bg-card border-border"
    }`}>
      <div className="p-3 space-y-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-bold uppercase text-muted-foreground">Match #{match.matchNo}</span>
            {match.courtId && courtMap?.[match.courtId] && (
              <span className="text-[8px] bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1 py-0.5 rounded font-medium">
                📍 {courtMap[match.courtId]}
              </span>
            )}
            {match.refereeId && refereeMap?.[match.refereeId] && (
              <span className="text-[8px] bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1 py-0.5 rounded font-medium">
                🏳️ {refereeMap[match.refereeId]}
              </span>
            )}
          </div>
          {match.status === "completed" ? (
            <Badge variant="secondary" className="text-[8px] h-4 px-1">Done</Badge>
          ) : match.status === "in_progress" ? (
            <Badge variant="default" className="text-[8px] h-4 px-1 bg-red-500 animate-pulse">Live</Badge>
          ) : null}
        </div>
        
        <div className="space-y-1.5">
          {/* Player A */}
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium line-clamp-2 break-words flex-1 leading-tight min-h-[2.5rem] flex items-center ${winner === match.entryAId ? "text-primary font-bold" : "text-card-foreground"}`}>
              {match.entryAName}
            </span>
            <span className={`text-sm font-display font-bold w-8 text-right ${winner === match.entryAId ? "text-primary" : "text-muted-foreground"}`}>
              {match.status === "not_started" ? "-" : match.scoreA}
            </span>
          </div>

          <div className="h-px bg-border/50" />

          {/* Player B */}
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium line-clamp-2 break-words flex-1 leading-tight min-h-[2.5rem] flex items-center ${winner === match.entryBId ? "text-primary font-bold" : "text-card-foreground"}`}>
              {match.entryBName}
            </span>
            <span className={`text-sm font-display font-bold w-8 text-right ${winner === match.entryBId ? "text-primary" : "text-muted-foreground"}`}>
              {match.status === "not_started" ? "-" : match.scoreB}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};

const Badge = ({ children, className, variant = "default" }: { children: React.ReactNode, className?: string, variant?: "default" | "secondary" }) => (
  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
    variant === "default" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
  } ${className}`}>
    {children}
  </span>
);

export default TournamentLivePage;
