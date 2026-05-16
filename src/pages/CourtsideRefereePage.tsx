import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Plus, Minus, Undo2, Check, AlertCircle, Pause, Play,
  RotateCcw, Trophy, Gavel, Sun,
} from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useTournaments } from "@/context/TournamentContext";
import { validateScore, formatScoringRule, type ScoringConfig } from "@/lib/pickleballScoring";
import { toast } from "sonner";

interface ScoreEvent { side: "a" | "b"; setIdx: number; }

const CourtsideRefereePage = () => {
  const { tournamentId, matchId } = useParams<{ tournamentId: string; matchId: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { tournaments, updateTournament } = useTournaments();

  const tournament = tournaments.find(x => x.id === tournamentId);
  const match = useMemo(() => {
    if (!tournament) return null;
    for (const cat of tournament.categories) {
      for (const p of cat.pools) {
        for (const m of p.matches) if (m.id === matchId) return { ...m, category: cat, pool: p };
      }
    }
    return null;
  }, [tournament, matchId]);

  const config: ScoringConfig | null = tournament ? {
    pointsPerGame: tournament.pointsPerGame ?? 11,
    winByTwo: tournament.winByTwo ?? true,
    maxPoints: tournament.maxPoints ?? undefined,
  } : null;
  const numSets = tournament?.numSets ?? 3;

  const [sets, setSets] = useState<Array<{ a: number; b: number }>>(() => Array.from({ length: 1 }, () => ({ a: 0, b: 0 })));
  const [currentSet, setCurrentSet] = useState(0);
  const [history, setHistory] = useState<ScoreEvent[]>([]);
  const [paused, setPaused] = useState(false);
  const [seconds, setSeconds] = useState(0);

  // Wake lock to keep screen on
  useEffect(() => {
    let lock: any = null;
    if ("wakeLock" in navigator) {
      (navigator as any).wakeLock.request("screen").then((l: any) => { lock = l; }).catch(() => {});
    }
    return () => { if (lock) lock.release().catch(() => {}); };
  }, []);

  // Match timer
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [paused]);

  if (!tournament || !match || !config) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-6 gap-3">
        <AlertCircle className="h-12 w-12 opacity-40" />
        <p>{t("ref.courtside.notFound")}</p>
        <button onClick={() => navigate(-1)} className="px-4 py-2 rounded-xl bg-white/10">{t("common.goBack")}</button>
      </div>
    );
  }

  const pA = match.teamA?.players?.[0]?.name ?? "Team A";
  const pB = match.teamB?.players?.[0]?.name ?? "Team B";

  const cur = sets[currentSet];
  const validation = validateScore(config, cur.a, cur.b);
  const setComplete = validation.valid && validation.status === "complete";

  // Compute set wins
  let setsA = 0, setsB = 0;
  sets.forEach((s, i) => {
    if (i > currentSet) return;
    const v = validateScore(config, s.a, s.b);
    if (v.valid && v.status === "complete") {
      if (v.winner === "a") setsA++; else setsB++;
    }
  });
  const setsToWin = Math.ceil(numSets / 2);
  const matchWinner = setsA >= setsToWin ? "a" : setsB >= setsToWin ? "b" : null;

  const score = (side: "a" | "b", delta: 1 | -1) => {
    setSets(prev => {
      const next = prev.map((s, i) => i === currentSet
        ? { ...s, [side]: Math.max(0, s[side] + delta) }
        : s);
      return next;
    });
    if (delta > 0) setHistory(h => [...h, { side, setIdx: currentSet }]);
  };

  const undo = () => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    setSets(prev => prev.map((s, i) => i === last.setIdx
      ? { ...s, [last.side]: Math.max(0, s[last.side] - 1) }
      : s));
  };

  const nextSet = () => {
    if (sets.length < numSets) {
      setSets(prev => [...prev, { a: 0, b: 0 }]);
      setCurrentSet(currentSet + 1);
      toast.success(t("ref.courtside.nextSet"));
    }
  };

  const reset = () => {
    if (!confirm(t("ref.courtside.confirmReset"))) return;
    setSets([{ a: 0, b: 0 }]); setCurrentSet(0); setHistory([]); setSeconds(0);
  };

  const finishMatch = () => {
    if (!matchWinner) { toast.error(t("ref.courtside.notFinished")); return; }
    if (!confirm(t("ref.courtside.confirmFinish"))) return;
    // Update tournament match with sets data
    const updatedTournament = { ...tournament };
    let found = false;
    updatedTournament.categories = updatedTournament.categories.map(cat => ({
      ...cat,
      pools: cat.pools.map(pool => ({
        ...pool,
        matches: pool.matches.map(m => {
          if (m.id !== matchId) return m;
          found = true;
          return {
            ...m,
            scoreA: setsA, scoreB: setsB,
            sets: sets.map(s => ({ a: s.a, b: s.b })),
            status: "completed" as const,
            winner: matchWinner === "a" ? "A" as const : "B" as const,
            completedAt: new Date().toISOString(),
            durationSec: seconds,
          };
        }),
      })),
    }));
    if (!found) { toast.error("Match not found in tournament"); return; }
    updateTournament(tournament.id, updatedTournament);
    toast.success(t("ref.courtside.finished"));
    setTimeout(() => navigate(`/referee?tournament=${tournament.id}`), 1500);
  };

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60); const r = s % 60;
    return `${m.toString().padStart(2, "0")}:${r.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-black text-white flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-white/10">
        <button onClick={() => navigate(-1)} className="h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-widest opacity-60 flex items-center justify-center gap-1.5">
            <Gavel className="h-3 w-3" /> {tournament.name}
          </div>
          <div className="text-[11px] mt-0.5 opacity-80">{match.category.name} · Set {currentSet + 1}/{numSets}</div>
        </div>
        <button onClick={() => setPaused(p => !p)} className="h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center">
          {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
        </button>
      </div>

      {/* Timer + rule */}
      <div className="px-4 py-2 text-center">
        <div className="text-2xl font-mono tabular-nums opacity-90">{fmtTime(seconds)}</div>
        <div className="text-[10px] opacity-50 mt-0.5">{t("ref.courtside.rule")}: {formatScoringRule(config)}</div>
      </div>

      {/* Set scoreboard */}
      {sets.length > 1 && (
        <div className="px-4 py-2 flex justify-center gap-1.5">
          {sets.map((s, i) => (
            <div key={i} className={`px-2 py-0.5 rounded text-[10px] font-mono ${
              i === currentSet ? "bg-amber-500 text-black" : "bg-white/10"
            }`}>
              S{i + 1} {s.a}-{s.b}
            </div>
          ))}
        </div>
      )}

      {/* Score panels */}
      <div className="flex-1 grid grid-cols-2 gap-1 p-1">
        <ScorePanel
          name={pA} score={cur.a} setsWon={setsA} highlight={cur.a > cur.b}
          onUp={() => score("a", 1)} onDown={() => score("a", -1)}
        />
        <ScorePanel
          name={pB} score={cur.b} setsWon={setsB} highlight={cur.b > cur.a}
          onUp={() => score("b", 1)} onDown={() => score("b", -1)}
        />
      </div>

      {/* Status / actions */}
      <div className="px-3 py-3 border-t border-white/10 space-y-2">
        {!validation.valid && (
          <div className="rounded-lg bg-rose-500/15 border border-rose-500/30 px-3 py-2 text-xs text-rose-200 flex items-center gap-2">
            <AlertCircle className="h-3.5 w-3.5" /> {validation.reason}
          </div>
        )}
        {setComplete && !matchWinner && (
          <button onClick={nextSet} className="w-full h-12 rounded-xl bg-amber-500 text-black font-bold flex items-center justify-center gap-2">
            <Plus className="h-4 w-4" /> {t("ref.courtside.startNextSet")}
          </button>
        )}
        {matchWinner && (
          <button onClick={finishMatch} className="w-full h-12 rounded-xl bg-primary text-white font-bold flex items-center justify-center gap-2">
            <Trophy className="h-4 w-4" /> {t("ref.courtside.finishMatch")}
          </button>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button onClick={undo} disabled={history.length === 0}
            className="h-10 rounded-xl bg-white/10 flex items-center justify-center gap-1.5 text-xs font-semibold disabled:opacity-30">
            <Undo2 className="h-3.5 w-3.5" /> {t("ref.courtside.undo")}
          </button>
          <button onClick={reset}
            className="h-10 rounded-xl bg-white/10 flex items-center justify-center gap-1.5 text-xs font-semibold">
            <RotateCcw className="h-3.5 w-3.5" /> {t("ref.courtside.reset")}
          </button>
        </div>
      </div>
    </div>
  );
};

const ScorePanel = ({ name, score, setsWon, highlight, onUp, onDown }: {
  name: string; score: number; setsWon: number; highlight: boolean;
  onUp: () => void; onDown: () => void;
}) => (
  <div className={`rounded-2xl p-3 flex flex-col ${highlight ? "bg-primary/10 border border-primary/30" : "bg-white/5"}`}>
    <div className="text-center">
      <p className="text-xs font-bold opacity-90 truncate px-2">{name}</p>
      <p className="text-[9px] uppercase tracking-wider opacity-50 mt-0.5">{setsWon} sets</p>
    </div>
    <button onClick={onUp} className="flex-1 flex items-center justify-center text-[100px] font-display font-extrabold tabular-nums leading-none active:scale-95 transition-transform">
      {score}
    </button>
    <button onClick={onDown} className="h-12 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center">
      <Minus className="h-5 w-5" />
    </button>
  </div>
);

export default CourtsideRefereePage;
