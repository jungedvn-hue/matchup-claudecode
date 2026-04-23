import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, Radar } from "recharts";
import { TournamentCategory, TournamentMatch } from "@/lib/tournament/types";
import { Trophy, Target, TrendingUp, Award } from "lucide-react";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--destructive))",
  "#f59e0b",
  "#10b981",
  "#6366f1",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];

interface TournamentStatsProps {
  category: TournamentCategory;
  entryMap: Record<string, string>;
  t: (key: string) => string;
}

interface PlayerStats {
  id: string;
  name: string;
  wins: number;
  losses: number;
  played: number;
  winRate: number;
  pointsScored: number;
  pointsConceded: number;
  pointDiff: number;
  avgScore: number;
}

export function TournamentStats({ category, entryMap, t }: TournamentStatsProps) {
  const allMatches = useMemo(
    () => (category.pools || []).flatMap((p) => p.matches || []),
    [category]
  );

  const completedMatches = useMemo(
    () => allMatches.filter((m) => m.status === "completed"),
    [allMatches]
  );

  const playerStats = useMemo(() => {
    const stats: Record<string, PlayerStats> = {};

    category.entries.forEach((e) => {
      stats[e.id] = {
        id: e.id,
        name: entryMap[e.id] || e.id,
        wins: 0, losses: 0, played: 0, winRate: 0,
        pointsScored: 0, pointsConceded: 0, pointDiff: 0, avgScore: 0,
      };
    });

    completedMatches.forEach((m) => {
      const a = stats[m.entryAId];
      const b = stats[m.entryBId];
      if (!a || !b) return;

      a.played++; b.played++;
      a.pointsScored += m.scoreA; a.pointsConceded += m.scoreB;
      b.pointsScored += m.scoreB; b.pointsConceded += m.scoreA;

      if (m.winner === m.entryAId) { a.wins++; b.losses++; }
      else if (m.winner === m.entryBId) { b.wins++; a.losses++; }
    });

    return Object.values(stats).map((s) => ({
      ...s,
      winRate: s.played > 0 ? Math.round((s.wins / s.played) * 100) : 0,
      pointDiff: s.pointsScored - s.pointsConceded,
      avgScore: s.played > 0 ? Math.round((s.pointsScored / s.played) * 10) / 10 : 0,
    }));
  }, [category, completedMatches, entryMap]);

  const topScorers = useMemo(
    () => [...playerStats].sort((a, b) => b.pointsScored - a.pointsScored).slice(0, 8),
    [playerStats]
  );

  const winRateData = useMemo(
    () => [...playerStats].filter((p) => p.played > 0).sort((a, b) => b.winRate - a.winRate).slice(0, 8),
    [playerStats]
  );

  const matchStatusData = useMemo(() => {
    const completed = allMatches.filter((m) => m.status === "completed").length;
    const inProgress = allMatches.filter((m) => m.status === "in_progress").length;
    const notStarted = allMatches.filter((m) => m.status === "not_started").length;
    return [
      { name: t("tm.completedLabel"), value: completed, color: "hsl(var(--primary))" },
      { name: t("tm.inProgressLabel"), value: inProgress, color: "#f59e0b" },
      { name: t("tm.notStarted"), value: notStarted, color: "hsl(var(--muted-foreground))" },
    ].filter((d) => d.value > 0);
  }, [allMatches, t]);

  // Top 5 radar chart data
  const radarData = useMemo(() => {
    const top5 = [...playerStats].sort((a, b) => b.wins - a.wins).slice(0, 5);
    if (top5.length === 0) return [];

    const maxPts = Math.max(...top5.map((p) => p.pointsScored), 1);
    const maxAvg = Math.max(...top5.map((p) => p.avgScore), 1);
    const maxPlayed = Math.max(...top5.map((p) => p.played), 1);

    return top5.map((p) => ({
      name: p.name.length > 8 ? p.name.substring(0, 8) + "…" : p.name,
      [t("tm.stats.winRate")]: p.winRate,
      [t("tm.stats.avgScore")]: Math.round((p.avgScore / maxAvg) * 100),
      [t("tm.stats.totalPts")]: Math.round((p.pointsScored / maxPts) * 100),
      [t("tm.stats.matches")]: Math.round((p.played / maxPlayed) * 100),
    }));
  }, [playerStats, t]);

  if (completedMatches.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <BarChart className="h-10 w-10 mx-auto mb-2 opacity-30" />
        <p className="text-sm">{t("tm.stats.noData")}</p>
      </div>
    );
  }

  // Summary cards
  const totalPoints = completedMatches.reduce((s, m) => s + m.scoreA + m.scoreB, 0);
  const avgPointsPerMatch = completedMatches.length > 0
    ? Math.round((totalPoints / completedMatches.length) * 10) / 10
    : 0;
  const closestMatch = completedMatches.reduce(
    (best, m) => {
      const diff = Math.abs(m.scoreA - m.scoreB);
      return diff < best.diff ? { diff, match: m } : best;
    },
    { diff: Infinity, match: null as TournamentMatch | null }
  );
  const topPlayer = [...playerStats].sort((a, b) => b.wins - a.wins)[0];

  return (
    <div className="space-y-4">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 gap-2">
        <Card>
          <CardContent className="p-3 flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Trophy className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{topPlayer?.name || "—"}</p>
              <p className="text-[10px] text-muted-foreground">{t("tm.stats.topPlayer")}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Target className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{totalPoints}</p>
              <p className="text-[10px] text-muted-foreground">{t("tm.stats.totalPts")}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{avgPointsPerMatch}</p>
              <p className="text-[10px] text-muted-foreground">{t("tm.stats.avgPerMatch")}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Award className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">
                {closestMatch.match
                  ? `${closestMatch.match.scoreA}-${closestMatch.match.scoreB}`
                  : "—"}
              </p>
              <p className="text-[10px] text-muted-foreground">{t("tm.stats.closestMatch")}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Scorers Bar Chart */}
      <Card>
        <CardHeader className="p-3 pb-1">
          <CardTitle className="text-sm">{t("tm.stats.topScorers")}</CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={topScorers} layout="vertical" margin={{ left: 0, right: 12, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis
                type="category"
                dataKey="name"
                width={80}
                tick={{ fontSize: 10 }}
                tickFormatter={(v: string) => v.length > 10 ? v.substring(0, 10) + "…" : v}
              />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
                formatter={(value: number) => [value, t("tm.stats.totalPts")]}
              />
              <Bar dataKey="pointsScored" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Win Rate Bar Chart */}
      <Card>
        <CardHeader className="p-3 pb-1">
          <CardTitle className="text-sm">{t("tm.stats.winRate")}</CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={winRateData} layout="vertical" margin={{ left: 0, right: 12, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
              <YAxis
                type="category"
                dataKey="name"
                width={80}
                tick={{ fontSize: 10 }}
                tickFormatter={(v: string) => v.length > 10 ? v.substring(0, 10) + "…" : v}
              />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
                formatter={(value: number) => [`${value}%`, t("tm.stats.winRate")]}
              />
              <Bar dataKey="winRate" radius={[0, 4, 4, 0]}>
                {winRateData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Match Status Pie */}
      <Card>
        <CardHeader className="p-3 pb-1">
          <CardTitle className="text-sm">{t("tm.stats.matchOverview")}</CardTitle>
        </CardHeader>
        <CardContent className="p-2 flex items-center justify-center">
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={matchStatusData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={4}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
              >
                {matchStatusData.map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Player Leaderboard */}
      <Card>
        <CardHeader className="p-3 pb-1">
          <CardTitle className="text-sm">{t("tm.stats.leaderboard")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-2">#</th>
                  <th className="text-left p-2">{t("tm.player")}</th>
                  <th className="text-center p-2">W</th>
                  <th className="text-center p-2">L</th>
                  <th className="text-center p-2">%</th>
                  <th className="text-center p-2">PF</th>
                  <th className="text-center p-2">+/-</th>
                </tr>
              </thead>
              <tbody>
                {[...playerStats]
                  .sort((a, b) => b.winRate - a.winRate || b.pointDiff - a.pointDiff)
                  .map((p, i) => (
                    <tr key={p.id} className="border-t border-border">
                      <td className="p-2 font-bold text-primary">{i + 1}</td>
                      <td className="p-2 font-medium text-foreground truncate max-w-[100px]">{p.name}</td>
                      <td className="p-2 text-center text-primary font-semibold">{p.wins}</td>
                      <td className="p-2 text-center text-destructive">{p.losses}</td>
                      <td className="p-2 text-center font-semibold">{p.winRate}%</td>
                      <td className="p-2 text-center text-muted-foreground">{p.pointsScored}</td>
                      <td className="p-2 text-center">{p.pointDiff > 0 ? `+${p.pointDiff}` : p.pointDiff}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
