import { Droplets, Zap, Utensils, Activity, LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/i18n/LanguageContext";

interface Recommendation {
  icon: LucideIcon;
  titleKey: string;
  detailKey: string;
}

const RECOMMENDATIONS: Recommendation[] = [
  { icon: Droplets, titleKey: "health.nutrition.hydration", detailKey: "health.nutrition.hydrationDesc" },
  { icon: Zap, titleKey: "health.nutrition.magnesium", detailKey: "health.nutrition.magnesiumDesc" },
  { icon: Utensils, titleKey: "health.nutrition.carbLoading", detailKey: "health.nutrition.carbLoadingDesc" },
  { icon: Activity, titleKey: "health.nutrition.protein", detailKey: "health.nutrition.proteinDesc" },
];

const NutritionTab = () => {
  const { t } = useLanguage();

  return (
    <div className="space-y-3">
      <Card className="p-4 shadow-card bg-gradient-to-br from-accent/10 to-transparent border-accent/30">
        <h2 className="text-base font-display font-bold text-accent mb-1">
          {t("health.nutrition.title")}
        </h2>
        <p className="text-xs text-muted-foreground">{t("health.nutrition.subtitle")}</p>
      </Card>

      {RECOMMENDATIONS.map((item, i) => (
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
