import { useState } from "react";
import { Heart, Map, Activity, Wind, Plus, Pencil, Footprints, Moon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/i18n/LanguageContext";
import { useHealthData } from "@/hooks/useHealthData";
import { useAuth } from "@/context/AuthContext";
import MetricCard from "./MetricCard";
import LogHealthDialog from "./LogHealthDialog";

const STRESS_LABEL_KEY: Record<string, string> = {
  low: "health.stress.low",
  medium: "health.stress.medium",
  high: "health.stress.high",
};

const DashboardTab = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { today, goals, loading, upsertToday } = useHealthData();
  const [logOpen, setLogOpen] = useState(false);

  if (!user) {
    return (
      <Card className="p-6 text-center shadow-card">
        <p className="text-sm text-muted-foreground">{t("health.empty.signInRequired")}</p>
      </Card>
    );
  }

  if (loading) {
    return <div className="text-center text-xs text-muted-foreground py-12">{t("common.loading")}</div>;
  }

  const hasData = today && (today.steps != null || today.distance_km != null || today.avg_hr != null);

  if (!hasData) {
    return (
      <>
        <Card className="p-6 text-center space-y-3 shadow-card">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Activity className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h3 className="text-base font-display font-bold text-foreground">{t("health.empty.noData")}</h3>
            <p className="text-xs text-muted-foreground mt-1">{t("health.empty.noDataDesc")}</p>
          </div>
          <Button onClick={() => setLogOpen(true)} className="w-full">
            <Plus className="h-4 w-4 mr-1.5" /> {t("health.empty.logNow")}
          </Button>
        </Card>
        <LogHealthDialog open={logOpen} onOpenChange={setLogOpen} initial={today} onSave={upsertToday} />
      </>
    );
  }

  const stepsPct = goals.daily_steps ? Math.min(100, ((today.steps ?? 0) / goals.daily_steps) * 100) : 0;
  const distPct = goals.daily_distance_km
    ? Math.min(100, ((today.distance_km ?? 0) / goals.daily_distance_km) * 100)
    : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] text-muted-foreground">{t("health.dashboard.todayHeader")}</p>
          <p className="text-sm font-display font-bold text-foreground">
            {new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "short" })}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setLogOpen(true)}>
          <Pencil className="h-3.5 w-3.5 mr-1" /> {t("common.edit")}
        </Button>
      </div>

      <Card className="p-4 shadow-card space-y-3">
        <GoalRow
          icon={Footprints}
          label={t("health.metric.steps")}
          value={`${(today.steps ?? 0).toLocaleString()} / ${goals.daily_steps.toLocaleString()}`}
          pct={stepsPct}
        />
        <GoalRow
          icon={Map}
          label={t("health.metric.distance")}
          value={`${today.distance_km ?? 0} / ${goals.daily_distance_km} km`}
          pct={distPct}
        />
      </Card>

      <div className="grid grid-cols-2 gap-2">
        {today.avg_hr != null && (
          <MetricCard
            icon={Heart}
            label={t("health.metric.heartRate")}
            value={today.avg_hr}
            unit="BPM"
            accent="primary"
          />
        )}
        {today.hrv_ms != null && (
          <MetricCard icon={Activity} label="HRV" value={today.hrv_ms} unit="ms" accent="accent" />
        )}
        {today.stress_level && (
          <MetricCard
            icon={Wind}
            label={t("health.metric.stress")}
            value={t(STRESS_LABEL_KEY[today.stress_level])}
            accent={today.stress_level === "high" ? "destructive" : "muted"}
          />
        )}
        {today.sleep_hours != null && (
          <MetricCard
            icon={Moon}
            label={t("health.metric.sleep")}
            value={today.sleep_hours}
            unit="h"
            accent="accent"
          />
        )}
      </div>

      <LogHealthDialog open={logOpen} onOpenChange={setLogOpen} initial={today} onSave={upsertToday} />
    </div>
  );
};

const GoalRow = ({
  icon: Icon,
  label,
  value,
  pct,
}: {
  icon: typeof Footprints;
  label: string;
  value: string;
  pct: number;
}) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-medium text-foreground">{label}</span>
      </div>
      <span className="text-xs text-muted-foreground">{value}</span>
    </div>
    <Progress value={pct} className="h-1.5" />
  </div>
);

export default DashboardTab;
