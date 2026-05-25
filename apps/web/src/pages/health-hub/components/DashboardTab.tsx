import { useState } from "react";
import { Heart, Map, Activity, Wind, Plus, Pencil, Footprints, Moon, Target } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { useHealthData } from "@/hooks/useHealthData";
import { useAuth } from "@/context/AuthContext";
import MetricCard from "./MetricCard";
import LogHealthDialog from "./LogHealthDialog";
import GoalsDialog from "./GoalsDialog";
import RingProgress from "./RingProgress";
import RecoveryScoreCard from "./RecoveryScoreCard";
import InsightsCard from "./InsightsCard";

const STRESS_LABEL_KEY: Record<string, string> = {
  low: "health.stress.low",
  medium: "health.stress.medium",
  high: "health.stress.high",
};

const DashboardTab = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { today, goals, loading, upsertToday, saveGoals } = useHealthData();
  const [logOpen, setLogOpen] = useState(false);
  const [goalsOpen, setGoalsOpen] = useState(false);

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

  const stepsPct = goals.daily_steps ? ((today.steps ?? 0) / goals.daily_steps) * 100 : 0;
  const distPct = goals.daily_distance_km
    ? ((today.distance_km ?? 0) / goals.daily_distance_km) * 100
    : 0;
  const calPct = goals.daily_calories ? ((today.calories_burned ?? 0) / goals.daily_calories) * 100 : 0;

  return (
    <div className="space-y-4">
      <InsightsCard />
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] text-muted-foreground">{t("health.dashboard.todayHeader")}</p>
          <p className="text-sm font-display font-bold text-foreground">
            {new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "short" })}
          </p>
        </div>
        <div className="flex gap-1.5">
          <Button size="sm" variant="ghost" onClick={() => setGoalsOpen(true)}>
            <Target className="h-3.5 w-3.5 mr-1" /> {t("health.goals.short")}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setLogOpen(true)}>
            <Pencil className="h-3.5 w-3.5 mr-1" /> {t("common.edit")}
          </Button>
        </div>
      </div>

      <RecoveryScoreCard hrv={today.hrv_ms} sleepHours={today.sleep_hours} />

      <Card className="p-4 shadow-card">
        <h3 className="text-xs font-display font-bold text-muted-foreground uppercase tracking-wider mb-3">
          {t("health.goal.daily")}
        </h3>
        <div className="grid grid-cols-3 gap-2">
          <RingItem
            pct={stepsPct}
            color="hsl(var(--primary))"
            icon={Footprints}
            label={t("health.metric.steps")}
            valueText={`${(today.steps ?? 0).toLocaleString()}`}
            goalText={`/ ${goals.daily_steps.toLocaleString()}`}
          />
          <RingItem
            pct={distPct}
            color="hsl(var(--accent))"
            icon={Map}
            label={t("health.metric.distance")}
            valueText={`${today.distance_km ?? 0}`}
            goalText={`/ ${goals.daily_distance_km} km`}
          />
          <RingItem
            pct={calPct}
            color="hsl(var(--destructive))"
            icon={Activity}
            label={t("health.metric.calories")}
            valueText={`${today.calories_burned ?? 0}`}
            goalText={`/ ${goals.daily_calories}`}
          />
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-2">
        {today.avg_hr != null && (
          <MetricCard icon={Heart} label={t("health.metric.heartRate")} value={today.avg_hr} unit="BPM" accent="primary" />
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
          <MetricCard icon={Moon} label={t("health.metric.sleep")} value={today.sleep_hours} unit="h" accent="accent" />
        )}
      </div>

      <LogHealthDialog open={logOpen} onOpenChange={setLogOpen} initial={today} onSave={upsertToday} />
      <GoalsDialog open={goalsOpen} onOpenChange={setGoalsOpen} initial={goals} onSave={saveGoals} />
    </div>
  );
};

const RingItem = ({
  pct,
  color,
  icon: Icon,
  label,
  valueText,
  goalText,
}: {
  pct: number;
  color: string;
  icon: typeof Footprints;
  label: string;
  valueText: string;
  goalText: string;
}) => (
  <div className="flex flex-col items-center text-center gap-1.5">
    <RingProgress pct={pct} size={70} stroke={7} color={color}>
      <Icon className="h-5 w-5" style={{ color }} />
    </RingProgress>
    <div>
      <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">{label}</p>
      <p className="text-xs font-display font-bold text-foreground">
        {valueText} <span className="text-[10px] text-muted-foreground font-normal">{goalText}</span>
      </p>
    </div>
  </div>
);

export default DashboardTab;
