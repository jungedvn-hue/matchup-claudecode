import { useEffect, useMemo, useState } from "react";
import { Droplets, Zap, Utensils, Activity, LucideIcon, Apple, Beef, Calendar, Target, User } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/i18n/LanguageContext";
import { useBodyProfile } from "@/hooks/useHealthExtras";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import BodyProfileDialog from "./BodyProfileDialog";

const sb = supabase as unknown as { from: (t: string) => any };

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
  preMatch: { labelKey: "health.nutrition.preMatch", tipKey: "health.nutrition.preMatchTip", tone: "from-amber-500/10" },
  postMatch: { labelKey: "health.nutrition.postMatch", tipKey: "health.nutrition.postMatchTip", tone: "from-primary/10" },
  recovery: { labelKey: "health.nutrition.recovery", tipKey: "health.nutrition.recoveryTip", tone: "from-blue-500/10" },
};

interface UpcomingMatch {
  event_id: string;
  event_date: string;
  title: string;
  group_name: string;
  hoursUntil: number;
}

const NutritionTab = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { profile, refetch } = useBodyProfile();
  const [mode, setMode] = useState<Mode>("preMatch");
  const [upcoming, setUpcoming] = useState<UpcomingMatch | null>(null);
  const [autoMode, setAutoMode] = useState(true);
  const [bodyOpen, setBodyOpen] = useState(false);
  const meta = MODE_META[mode];

  // Detect upcoming match (within next 36h)
  useEffect(() => {
    if (!user) return;
    (async () => {
      const now = new Date();
      const cutoff = new Date(now.getTime() + 36 * 3600 * 1000);
      const { data } = await sb.from("group_event_attendees")
        .select("event_id, status, group_events!inner(id, title, event_date, group_id, social_groups!inner(name))")
        .eq("user_id", user.id).eq("status", "going")
        .gte("group_events.event_date", now.toISOString())
        .lte("group_events.event_date", cutoff.toISOString())
        .order("group_events(event_date)", { ascending: true })
        .limit(1);

      const row: any = data?.[0];
      if (row?.group_events) {
        const ed = new Date(row.group_events.event_date);
        const hoursUntil = (ed.getTime() - now.getTime()) / 3600_000;
        setUpcoming({
          event_id: row.event_id,
          event_date: row.group_events.event_date,
          title: row.group_events.title,
          group_name: row.group_events.social_groups?.name ?? "",
          hoursUntil,
        });
      } else {
        // Check past 6h (post-match window)
        const pastCutoff = new Date(now.getTime() - 6 * 3600 * 1000);
        const { data: past } = await sb.from("group_event_attendees")
          .select("event_id, status, group_events!inner(id, title, event_date, group_id, social_groups!inner(name))")
          .eq("user_id", user.id).eq("status", "going")
          .gte("group_events.event_date", pastCutoff.toISOString())
          .lte("group_events.event_date", now.toISOString())
          .order("group_events(event_date)", { ascending: false })
          .limit(1);
        const pastRow: any = past?.[0];
        if (pastRow?.group_events) {
          const ed = new Date(pastRow.group_events.event_date);
          const hoursUntil = (ed.getTime() - now.getTime()) / 3600_000;
          setUpcoming({
            event_id: pastRow.event_id,
            event_date: pastRow.group_events.event_date,
            title: pastRow.group_events.title,
            group_name: pastRow.group_events.social_groups?.name ?? "",
            hoursUntil,
          });
        } else {
          setUpcoming(null);
        }
      }
    })();
  }, [user]);

  // Auto-set mode based on upcoming match
  useEffect(() => {
    if (!autoMode || !upcoming) return;
    if (upcoming.hoursUntil > 0 && upcoming.hoursUntil <= 36) setMode("preMatch");
    else if (upcoming.hoursUntil < 0 && upcoming.hoursUntil >= -6) setMode("postMatch");
    else setMode("recovery");
  }, [upcoming, autoMode]);

  // Macros estimate (Mifflin-St Jeor BMR + activity factor)
  const macros = useMemo(() => {
    if (!profile?.weight_kg || !profile?.height_cm || !profile?.age || !profile?.gender) return null;
    const bmr = profile.gender === "female"
      ? 10 * profile.weight_kg + 6.25 * profile.height_cm - 5 * profile.age - 161
      : 10 * profile.weight_kg + 6.25 * profile.height_cm - 5 * profile.age + 5;
    const tdee = Math.round(bmr * 1.55); // moderately active
    const protein = Math.round(profile.weight_kg * 1.8); // g/kg for athletes
    const fat = Math.round((tdee * 0.25) / 9);
    const carbs = Math.round((tdee - protein * 4 - fat * 9) / 4);
    return { tdee, protein, carbs, fat };
  }, [profile]);

  return (
    <div className="space-y-3">
      {/* Upcoming match banner */}
      {upcoming && (
        <Card className="p-3 shadow-card bg-gradient-to-r from-amber-500/15 to-amber-500/5 border-amber-500/20 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
            <Calendar className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-amber-700 dark:text-amber-400">
              {upcoming.hoursUntil > 0 ? t("health.nutrition.upcomingMatch") : t("health.nutrition.recentMatch")}
            </p>
            <p className="text-sm font-display font-bold text-foreground truncate">{upcoming.title}</p>
            <p className="text-[10px] text-muted-foreground">
              {upcoming.hoursUntil > 0
                ? `${t("health.nutrition.in")} ${Math.round(upcoming.hoursUntil)}h`
                : `${Math.round(-upcoming.hoursUntil)}h ${t("health.nutrition.ago")}`}
            </p>
          </div>
        </Card>
      )}

      {/* Mode selector */}
      <div className="grid grid-cols-3 gap-1.5 bg-secondary p-1 rounded-xl">
        {(Object.keys(MODE_META) as Mode[]).map(m => (
          <button key={m} onClick={() => { setMode(m); setAutoMode(false); }}
            className={`py-2 text-[11px] font-medium rounded-lg transition-colors ${
              mode === m ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}>
            {t(MODE_META[m].labelKey)}
          </button>
        ))}
      </div>

      <Card className={`p-4 shadow-card bg-gradient-to-br ${meta.tone} to-transparent border-border`}>
        <h2 className="text-base font-display font-bold text-foreground mb-1">{t(meta.labelKey)}</h2>
        <p className="text-xs text-muted-foreground leading-relaxed">{t(meta.tipKey)}</p>
      </Card>

      {/* Personalized macros */}
      {macros ? (
        <Card className="p-4 shadow-card">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-display font-bold text-foreground flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5 text-primary" /> {t("health.nutrition.dailyMacros")}
            </h3>
            <button onClick={() => setBodyOpen(true)} className="text-[10px] text-primary font-bold">
              {t("common.edit")}
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <MacroStat label={t("health.nutrition.kcal")} value={`${macros.tdee}`} tone="primary" />
            <MacroStat label={t("health.nutrition.protein")} value={`${macros.protein}g`} tone="rose" />
            <MacroStat label={t("health.nutrition.carbs")} value={`${macros.carbs}g`} tone="amber" />
            <MacroStat label={t("health.nutrition.fat")} value={`${macros.fat}g`} tone="emerald" />
          </div>
        </Card>
      ) : (
        <Card className="p-4 shadow-card border-dashed border-2">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <User className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-display font-bold text-foreground">{t("health.nutrition.setupPersonalized")}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{t("health.nutrition.setupHint")}</p>
            </div>
            <button onClick={() => setBodyOpen(true)} className="h-9 px-3 rounded-xl bg-primary text-primary-foreground text-xs font-bold">
              {t("common.setup")}
            </button>
          </div>
        </Card>
      )}

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

      <BodyProfileDialog open={bodyOpen} onOpenChange={setBodyOpen} onSaved={refetch} />
    </div>
  );
};

const MacroStat = ({ label, value, tone }: { label: string; value: string; tone: string }) => {
  const toneClass =
    tone === "primary" ? "bg-primary/10 text-primary" :
    tone === "rose" ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" :
    tone === "amber" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" :
    "bg-primary/10 text-primary dark:text-primary";
  return (
    <div className={`text-center p-2 rounded-xl ${toneClass}`}>
      <p className="text-base font-display font-bold tabular-nums">{value}</p>
      <p className="text-[9px] uppercase tracking-wider font-semibold mt-0.5 opacity-80">{label}</p>
    </div>
  );
};

export default NutritionTab;
