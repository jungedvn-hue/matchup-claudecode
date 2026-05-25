import { Battery, BatteryLow, BatteryWarning } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/i18n/LanguageContext";
import RingProgress from "./RingProgress";

interface Props {
  hrv?: number | null;
  sleepHours?: number | null;
}

// Recovery score 0–100 derived from HRV (heart-rate variability) and sleep duration.
// HRV >= 70 → 60pt, scaled linearly down to 0 below 30. Sleep >= 8h → 40pt, scaled below.
// Tunable; intentionally simple so we can validate against user-reported feeling later.
const computeRecoveryScore = (hrv?: number | null, sleep?: number | null): number | null => {
  if (hrv == null && sleep == null) return null;
  const hrvScore = hrv == null ? 30 : Math.max(0, Math.min(60, ((hrv - 30) / (70 - 30)) * 60));
  const sleepScore = sleep == null ? 20 : Math.max(0, Math.min(40, (sleep / 8) * 40));
  return Math.round(hrvScore + sleepScore);
};

const RecoveryScoreCard = ({ hrv, sleepHours }: Props) => {
  const { t } = useLanguage();
  const score = computeRecoveryScore(hrv, sleepHours);

  if (score == null) return null;

  const tier =
    score >= 70
      ? { color: "hsl(var(--primary))", icon: Battery, labelKey: "health.recovery.ready", tipKey: "health.recovery.readyTip" }
      : score >= 45
      ? { color: "hsl(var(--accent))", icon: BatteryWarning, labelKey: "health.recovery.light", tipKey: "health.recovery.lightTip" }
      : { color: "hsl(var(--destructive))", icon: BatteryLow, labelKey: "health.recovery.rest", tipKey: "health.recovery.restTip" };

  const Icon = tier.icon;

  return (
    <Card className="p-4 shadow-card">
      <div className="flex items-center gap-4">
        <RingProgress pct={score} size={84} stroke={9} color={tier.color}>
          <div>
            <div className="text-xl font-display font-bold leading-none" style={{ color: tier.color }}>
              {score}
            </div>
            <div className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">
              {t("health.recovery.score")}
            </div>
          </div>
        </RingProgress>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <Icon className="h-4 w-4" style={{ color: tier.color }} />
            <p className="text-sm font-display font-bold" style={{ color: tier.color }}>
              {t(tier.labelKey)}
            </p>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{t(tier.tipKey)}</p>
        </div>
      </div>
    </Card>
  );
};

export default RecoveryScoreCard;
