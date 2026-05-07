import { useState } from "react";
import { Droplets, Zap, Utensils, Activity, LucideIcon, Apple, Beef } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/i18n/LanguageContext";

type Mode = "preMatch" | "postMatch" | "recovery";

interface Recommendation {
  icon: LucideIcon;
  titleKey: string;
  detailKey: string;
}

const RECS: Record<Mode, Recommendation[]> = {
  preMatch: [
    { icon: Utensils, titleKey: "health.nutrition.carbLoading", detailKey: "health.nutrition.carbLoadingDesc" },
    { icon: Droplets, titleKey: "health.nutrition.hydration", detailKey: "health.nutrition.hydrationDesc" },
    { icon: Apple, titleKey: "health.nutrition.preFruit", detailKey: "health.nutrition.preFruitDesc" },
  ],
  postMatch: [
    { icon: Beef, titleKey: "health.nutrition.protein", detailKey: "health.nutrition.proteinDesc" },
    { icon: Droplets, titleKey: "health.nutrition.electrolytes", detailKey: "health.nutrition.electrolytesDesc" },
    { icon: Apple, titleKey: "health.nutrition.recoverCarb", detailKey: "health.nutrition.recoverCarbDesc" },
  ],
  recovery: [
    { icon: Zap, titleKey: "health.nutrition.magnesium", detailKey: "health.nutrition.magnesiumDesc" },
    { icon: Apple, titleKey: "health.nutrition.antiInflam", detailKey: "health.nutrition.antiInflamDesc" },
    { icon: Activity, titleKey: "health.nutrition.omega3", detailKey: "health.nutrition.omega3Desc" },
  ],
};

const MODE_META: Record<Mode, { labelKey: string; tipKey: string; tone: string }> = {
  preMatch: { labelKey: "health.nutrition.preMatch", tipKey: "health.nutrition.preMatchTip", tone: "from-accent/10" },
  postMatch: { labelKey: "health.nutrition.postMatch", tipKey: "health.nutrition.postMatchTip", tone: "from-primary/10" },
  recovery: { labelKey: "health.nutrition.recovery", tipKey: "health.nutrition.recoveryTip", tone: "from-muted/40" },
};

const NutritionTab = () => {
  const { t } = useLanguage();
  const [mode, setMode] = useState<Mode>("preMatch");
  const meta = MODE_META[mode];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-1.5 bg-secondary p-1 rounded-xl">
        {(Object.keys(MODE_META) as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`py-2 text-[11px] font-medium rounded-lg transition-colors ${
              mode === m ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            {t(MODE_META[m].labelKey)}
          </button>
        ))}
      </div>

      <Card className={`p-4 shadow-card bg-gradient-to-br ${meta.tone} to-transparent border-border`}>
        <h2 className="text-base font-display font-bold text-foreground mb-1">{t(meta.labelKey)}</h2>
        <p className="text-xs text-muted-foreground leading-relaxed">{t(meta.tipKey)}</p>
      </Card>

      {RECS[mode].map((item, i) => (
        <Card key={i} className="p-3 shadow-card">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <item.icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-display font-bold text-foreground">{t(item.titleKey)}</h4>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{t(item.detailKey)}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default NutritionTab;
