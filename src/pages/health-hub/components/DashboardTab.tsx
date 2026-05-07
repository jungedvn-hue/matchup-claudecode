import { useEffect, useState } from "react";
import { Heart, Map, Activity, Wind } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useLanguage } from "@/i18n/LanguageContext";
import MetricCard from "./MetricCard";

const MATCH_INTENSITY = [
  { min: "0-5", value: 40 },
  { min: "5-10", value: 50 },
  { min: "10-15", value: 80 },
  { min: "15-20", value: 75 },
  { min: "20-25", value: 90 },
  { min: "25-30", value: 150 },
  { min: "30-35", value: 165 },
  { min: "35-40", value: 140 },
  { min: "40-45", value: 120 },
  { min: "45-50", value: 130 },
  { min: "50-55", value: 90 },
  { min: "55-60", value: 70 },
];

const DashboardTab = () => {
  const { t } = useLanguage();
  const [metrics, setMetrics] = useState({ hr: 72, breath: 14 });

  useEffect(() => {
    const id = setInterval(() => {
      setMetrics({
        hr: 70 + Math.floor(Math.random() * 10),
        breath: 12 + Math.floor(Math.random() * 4),
      });
    }, 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <MetricCard
          icon={Heart}
          label={t("health.metric.heartRate")}
          value={metrics.hr}
          unit="BPM"
          hint={t("health.sync.justNow")}
          accent="primary"
        />
        <MetricCard
          icon={Map}
          label={t("health.metric.distance")}
          value="4.2"
          unit="km"
          hint={`${t("health.goal.daily")}: 5km`}
          accent="accent"
        />
        <MetricCard
          icon={Activity}
          label={t("health.metric.stress")}
          value={t("health.stress.low")}
          hint="HRV: 65ms"
          accent="muted"
        />
        <MetricCard
          icon={Wind}
          label={t("health.metric.breathing")}
          value={metrics.breath}
          unit={t("health.unit.perMin")}
          hint={t("health.normal")}
          accent="accent"
        />
      </div>

      <Card className="p-4 shadow-card">
        <h3 className="text-sm font-display font-bold text-foreground mb-1">
          {t("health.dashboard.matchActivity")}
        </h3>
        <p className="text-[11px] text-muted-foreground mb-3">
          {t("health.dashboard.intensityHint")} · Semi-Final
        </p>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={MATCH_INTENSITY}>
            <XAxis dataKey="min" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
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
            <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
};

export default DashboardTab;
