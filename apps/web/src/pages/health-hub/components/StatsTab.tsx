import { useEffect, useMemo, useState } from "react";
import { Zap, Map, Footprints, Heart, Activity, Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
  Line, LineChart, Area, AreaChart, ReferenceLine, Legend,
} from "recharts";
import { useLanguage } from "@/i18n/LanguageContext";
import { useHealthData, HealthDailyLog } from "@/hooks/useHealthData";
import { useTrainingLoad } from "@/hooks/useHealthExtras";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

const sb = supabase as unknown as { from: (t: string) => any };

const VN_DOW = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

const StatsTab = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [view, setView] = useState<"week" | "month">("week");
  const days = view === "week" ? 7 : 30;
  const { recent, loading } = useHealthData(days);
  const { load } = useTrainingLoad();

  // Match days from group_event_attendees (status=going) within range
  const [matchDates, setMatchDates] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!user) return;
    const since = new Date(); since.setDate(since.getDate() - days);
    const sinceISO = since.toISOString().slice(0, 10);
    (async () => {
      const { data } = await sb.from("group_event_attendees")
        .select("event_id, status, group_events!inner(event_date)")
        .eq("user_id", user.id).eq("status", "going")
        .gte("group_events.event_date", sinceISO);
      const set = new Set<string>();
      (data ?? []).forEach((row: any) => {
        const d = row.group_events?.event_date;
        if (d) set.add(d.slice(0, 10));
      });
      setMatchDates(set);
    })();
  }, [user, days]);

  const chartData = useMemo(() => {
    const map = new Map(recent.map(l => [l.date, l]));
    return Array.from({ length: days }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      const iso = d.toISOString().slice(0, 10);
      const log = map.get(iso);
      return {
        d: view === "week" ? VN_DOW[d.getDay()] : `${d.getDate()}`,
        iso,
        steps: log?.steps ?? 0,
        distance: log?.distance_km ? Number(log.distance_km) : 0,
        hrv: log?.hrv_ms ?? null,
        avgHr: log?.avg_hr ?? null,
        restingHr: log?.resting_hr ?? null,
        calories: log?.calories_burned ?? 0,
        match: matchDates.has(iso) ? 1 : 0,
      };
    });
  }, [recent, view, days, matchDates]);

  const totals = useMemo(() => sumTotals(recent), [recent]);

  // HRV baseline (rolling avg of last 7 entries)
  const hrvBaseline = useMemo(() => {
    const vals = recent.map(l => l.hrv_ms).filter((v): v is number => typeof v === "number" && v > 0);
    if (vals.length === 0) return null;
    return Math.round(vals.reduce((s, n) => s + n, 0) / vals.length);
  }, [recent]);

  return (
    <div className="space-y-4">
      <div className="flex bg-secondary rounded-xl p-1">
        {(["week", "month"] as const).map(v => (
          <button key={v} onClick={() => setView(v)}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${
              view === v ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}>
            {t(v === "week" ? "health.stats.week" : "health.stats.month")}
          </button>
        ))}
      </div>

      {loading ? (
        <Card className="p-6 text-center text-xs text-muted-foreground shadow-card">{t("common.loading")}</Card>
      ) : recent.length === 0 ? (
        <Card className="p-6 text-center text-xs text-muted-foreground shadow-card">{t("health.empty.noLogsRange")}</Card>
      ) : (
        <>
          {/* Steps + match markers */}
          <Card className="p-4 shadow-card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-display font-bold text-foreground">{t("health.stats.stepsChart")}</h3>
              {matchDates.size > 0 && (
                <span className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                  <Trophy className="h-3 w-3" /> {matchDates.size} {t("health.stats.matchDays")}
                </span>
              )}
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData}>
                <XAxis dataKey="d" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }}
                  formatter={(v: any, n: any) => n === "match" ? null : v}
                />
                <Bar dataKey="steps" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                {chartData.map((d, i) => d.match ? (
                  <ReferenceLine key={i} x={d.d} stroke="#f59e0b" strokeDasharray="2 2" strokeWidth={1} />
                ) : null)}
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* HRV trend with baseline band */}
          {chartData.some(d => d.hrv != null) && (
            <Card className="p-4 shadow-card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-display font-bold text-foreground flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-primary" /> {t("health.stats.hrvTrend")}
                </h3>
                {hrvBaseline && (
                  <span className="text-[10px] text-muted-foreground">
                    {t("health.stats.baseline")} <span className="font-stat font-bold text-foreground tabular-nums">{hrvBaseline}ms</span>
                  </span>
                )}
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={chartData}>
                  <XAxis dataKey="d" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }}
                  />
                  {hrvBaseline && (
                    <>
                      <ReferenceLine y={hrvBaseline} stroke="#10b981" strokeDasharray="3 3" />
                      <ReferenceLine y={hrvBaseline * 1.1} stroke="#10b981" strokeDasharray="2 4" strokeOpacity={0.3} />
                      <ReferenceLine y={hrvBaseline * 0.9} stroke="#ef4444" strokeDasharray="2 4" strokeOpacity={0.3} />
                    </>
                  )}
                  <Line type="monotone" dataKey="hrv" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Heart rate (avg + resting) */}
          {chartData.some(d => d.avgHr != null || d.restingHr != null) && (
            <Card className="p-4 shadow-card">
              <h3 className="text-sm font-display font-bold text-foreground mb-3 flex items-center gap-1.5">
                <Heart className="h-3.5 w-3.5 text-rose-500" /> {t("health.stats.heartRate")}
              </h3>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={chartData}>
                  <XAxis dataKey="d" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Line type="monotone" dataKey="avgHr" name={t("health.stats.avgHr")} stroke="#f43f5e" strokeWidth={2} dot={{ r: 2 }} connectNulls />
                  <Line type="monotone" dataKey="restingHr" name={t("health.stats.restingHr")} stroke="#94a3b8" strokeWidth={2} dot={{ r: 2 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Training load */}
          {(load.acute != null || load.chronic != null) && (
            <Card className="p-4 shadow-card">
              <h3 className="text-sm font-display font-bold text-foreground mb-3 flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-violet-500" /> {t("health.stats.trainingLoad")}
              </h3>
              <div className="grid grid-cols-3 gap-2">
                <LoadStat label={t("health.stats.acute")} value={load.acute?.toFixed(1) ?? "—"} hint="7d" />
                <LoadStat label={t("health.stats.chronic")} value={load.chronic?.toFixed(1) ?? "—"} hint="28d" />
                <LoadStat
                  label={t("health.stats.ratio")}
                  value={load.ratio?.toFixed(2) ?? "—"}
                  hint={
                    load.ratio == null ? "—" :
                    load.ratio > 1.5 ? t("health.stats.overload") :
                    load.ratio >= 0.95 && load.ratio <= 1.25 ? t("health.stats.optimal") :
                    load.ratio < 0.8 ? t("health.stats.detraining") :
                    t("health.stats.moderate")
                  }
                  highlight={load.ratio != null && (load.ratio > 1.5 || load.ratio < 0.8)}
                />
              </div>
            </Card>
          )}

          <Card className="p-4 shadow-card space-y-3">
            <SummaryRow icon={Footprints} label={t("health.stats.totalSteps")} value={totals.steps.toLocaleString()} />
            <SummaryRow icon={Map} label={t("health.stats.totalDistance")} value={`${totals.distance.toFixed(1)} km`} />
            <SummaryRow icon={Zap} label={t("health.metric.calories")} value={`${totals.calories.toLocaleString()} kcal`} />
          </Card>
        </>
      )}
    </div>
  );
};

const sumTotals = (logs: HealthDailyLog[]) =>
  logs.reduce(
    (acc, l) => ({
      steps: acc.steps + (l.steps ?? 0),
      distance: acc.distance + (l.distance_km ? Number(l.distance_km) : 0),
      calories: acc.calories + (l.calories_burned ?? 0),
    }),
    { steps: 0, distance: 0, calories: 0 }
  );

const SummaryRow = ({ icon: Icon, label, value }: { icon: typeof Zap; label: string; value: string }) => (
  <div className="flex items-center gap-3">
    <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
      <Icon className="h-4 w-4" />
    </div>
    <div className="flex-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-display font-bold text-foreground">{value}</p>
    </div>
  </div>
);

const LoadStat = ({ label, value, hint, highlight }: { label: string; value: string; hint: string; highlight?: boolean }) => (
  <div className={`text-center p-2 rounded-xl ${highlight ? "bg-amber-500/10" : "bg-secondary/50"}`}>
    <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">{label}</p>
    <p className={`text-xl font-display font-bold tabular-nums ${highlight ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`}>{value}</p>
    <p className="text-[9px] text-muted-foreground mt-0.5">{hint}</p>
  </div>
);

export default StatsTab;
