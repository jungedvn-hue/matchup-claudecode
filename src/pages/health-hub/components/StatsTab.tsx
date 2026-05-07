import { useMemo, useState } from "react";
import { Zap, Map, Footprints } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useLanguage } from "@/i18n/LanguageContext";
import { useHealthData, HealthDailyLog } from "@/hooks/useHealthData";

const VN_DOW = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

const StatsTab = () => {
  const { t } = useLanguage();
  const [view, setView] = useState<"week" | "month">("week");
  const { recent, loading } = useHealthData(view === "week" ? 7 : 30);

  const chartData = useMemo(() => {
    const days = view === "week" ? 7 : 30;
    const map = new Map(recent.map((l) => [l.date, l]));
    return Array.from({ length: days }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      const iso = d.toISOString().slice(0, 10);
      const log = map.get(iso);
      return {
        d: view === "week" ? VN_DOW[d.getDay()] : `${d.getDate()}`,
        steps: log?.steps ?? 0,
        distance: log?.distance_km ? Number(log.distance_km) : 0,
      };
    });
  }, [recent, view]);

  const totals = useMemo(() => sumTotals(recent), [recent]);

  return (
    <div className="space-y-4">
      <div className="flex bg-secondary rounded-xl p-1">
        {(["week", "month"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${
              view === v ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            {t(v === "week" ? "health.stats.week" : "health.stats.month")}
          </button>
        ))}
      </div>

      {loading ? (
        <Card className="p-6 text-center text-xs text-muted-foreground shadow-card">{t("common.loading")}</Card>
      ) : recent.length === 0 ? (
        <Card className="p-6 text-center text-xs text-muted-foreground shadow-card">
          {t("health.empty.noLogsRange")}
        </Card>
      ) : (
        <>
          <Card className="p-4 shadow-card">
            <h3 className="text-sm font-display font-bold text-foreground mb-3">{t("health.stats.stepsChart")}</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData}>
                <XAxis dataKey="d" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                  labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                />
                <Bar dataKey="steps" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

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

const SummaryRow = ({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Zap;
  label: string;
  value: string;
}) => (
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

export default StatsTab;
