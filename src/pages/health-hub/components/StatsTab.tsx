import { useState } from "react";
import { Zap, Map } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useLanguage } from "@/i18n/LanguageContext";

const WEEK = [
  { d: "T2", v: 65 },
  { d: "T3", v: 82 },
  { d: "T4", v: 110 },
  { d: "T5", v: 75 },
  { d: "T6", v: 95 },
  { d: "T7", v: 120 },
  { d: "CN", v: 88 },
];

const MONTH = Array.from({ length: 30 }, (_, i) => ({
  d: `${i + 1}`,
  v: Math.floor(Math.random() * 60) + 40,
}));

const StatsTab = () => {
  const { t } = useLanguage();
  const [view, setView] = useState<"week" | "month">("week");
  const data = view === "week" ? WEEK : MONTH;

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

      <Card className="p-4 shadow-card">
        <h3 className="text-sm font-display font-bold text-foreground mb-3">
          {t("health.stats.energyTrend")}
        </h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={data}>
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
            <Bar dataKey="v" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card className="p-4 shadow-card space-y-3">
        <SummaryRow icon={Zap} label={t("health.metric.calories")} value="12,450 kcal" />
        <SummaryRow icon={Map} label={t("health.stats.totalDistance")} value="32.5 km" />
      </Card>
    </div>
  );
};

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
