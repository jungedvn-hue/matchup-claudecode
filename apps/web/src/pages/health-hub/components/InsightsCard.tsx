import { useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, X, AlertTriangle, AlertOctagon, ThumbsUp, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/i18n/LanguageContext";
import { useHealthInsights, type InsightSeverity } from "@/hooks/useHealthExtras";

const severityClass = (s: InsightSeverity) => ({
  positive: { bg: "from-primary/15 to-primary/5", border: "border-primary/20", icon: ThumbsUp, color: "text-primary dark:text-primary" },
  warning:  { bg: "from-amber-500/15 to-amber-500/5",     border: "border-amber-500/20",   icon: AlertTriangle, color: "text-amber-600 dark:text-amber-400" },
  urgent:   { bg: "from-rose-500/15 to-rose-500/5",       border: "border-rose-500/20",    icon: AlertOctagon, color: "text-rose-600 dark:text-rose-400" },
  info:     { bg: "from-blue-500/15 to-blue-500/5",       border: "border-blue-500/20",    icon: Info, color: "text-blue-600 dark:text-blue-400" },
}[s]);

const InsightsCard = () => {
  const { t } = useLanguage();
  const { insights, loading, generate, dismiss } = useHealthInsights();

  // Auto-generate insights on mount (cached server-side via UNIQUE constraint)
  useEffect(() => { generate(); /* eslint-disable-next-line */ }, []);

  if (loading || insights.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-display font-bold text-foreground flex items-center gap-1.5 px-1">
        <Sparkles className="h-3.5 w-3.5 text-primary" /> {t("health.insights.title")}
      </h3>
      {insights.slice(0, 3).map((i, idx) => {
        const s = severityClass(i.severity);
        const Icon = s.icon;
        return (
          <motion.div key={i.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
            <Card className={`p-3.5 shadow-card bg-gradient-to-br ${s.bg} ${s.border} relative`}>
              <button onClick={() => dismiss(i.id)}
                className="absolute top-2 right-2 h-6 w-6 rounded-md text-muted-foreground hover:bg-card/50 flex items-center justify-center"
                aria-label="Dismiss">
                <X className="h-3 w-3" />
              </button>
              <div className="flex items-start gap-2.5 pr-6">
                <div className={`h-8 w-8 rounded-lg bg-card flex items-center justify-center shrink-0 ${s.color}`}>
                  {i.emoji ? <span className="text-base">{i.emoji}</span> : <Icon className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-display font-bold text-foreground">{i.title}</p>
                  <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">{i.body}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
};

export default InsightsCard;
