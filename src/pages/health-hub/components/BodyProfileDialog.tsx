import { useEffect, useState } from "react";
import { Loader2, User } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/i18n/LanguageContext";
import { useBodyProfile, calculateMaxHr, type BodyProfile } from "@/hooks/useHealthExtras";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved?: () => void;
}

const GOALS: BodyProfile["fitness_goal"][] = ["weight_loss", "endurance", "muscle", "recovery", "general"];
const GENDERS: BodyProfile["gender"][] = ["male", "female", "other"];

const BodyProfileDialog = ({ open, onOpenChange, onSaved }: Props) => {
  const { t } = useLanguage();
  const { profile, save } = useBodyProfile();
  const [age, setAge] = useState<string>("");
  const [weight, setWeight] = useState<string>("");
  const [height, setHeight] = useState<string>("");
  const [gender, setGender] = useState<BodyProfile["gender"]>(null);
  const [restingHr, setRestingHr] = useState<string>("");
  const [goal, setGoal] = useState<BodyProfile["fitness_goal"]>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !profile) return;
    setAge(profile.age?.toString() ?? "");
    setWeight(profile.weight_kg?.toString() ?? "");
    setHeight(profile.height_cm?.toString() ?? "");
    setGender(profile.gender ?? null);
    setRestingHr(profile.resting_hr?.toString() ?? "");
    setGoal(profile.fitness_goal ?? null);
  }, [open, profile]);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await save({
      age: age ? Number(age) : null,
      weight_kg: weight ? Number(weight) : null,
      height_cm: height ? Number(height) : null,
      gender,
      resting_hr: restingHr ? Number(restingHr) : null,
      fitness_goal: goal,
    });
    setSaving(false);
    if (error) { toast.error(error); return; }
    toast.success(t("body.saved"));
    onSaved?.();
    onOpenChange(false);
  };

  const computedMaxHr = age ? calculateMaxHr(Number(age)) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-center flex items-center justify-center gap-2">
            <User className="h-4 w-4 text-primary" /> {t("body.title")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          <div className="grid grid-cols-3 gap-2">
            <Field label={t("body.age")}>
              <input value={age} onChange={e => setAge(e.target.value)} type="number" min="5" max="120"
                className="w-full h-10 px-3 rounded-xl border border-border bg-secondary/30 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </Field>
            <Field label={t("body.weight")}>
              <input value={weight} onChange={e => setWeight(e.target.value)} type="number" step="0.1" min="20" max="300" placeholder="kg"
                className="w-full h-10 px-3 rounded-xl border border-border bg-secondary/30 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </Field>
            <Field label={t("body.height")}>
              <input value={height} onChange={e => setHeight(e.target.value)} type="number" min="100" max="250" placeholder="cm"
                className="w-full h-10 px-3 rounded-xl border border-border bg-secondary/30 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </Field>
          </div>

          <Field label={t("body.gender")}>
            <div className="grid grid-cols-3 gap-1.5">
              {GENDERS.map(g => (
                <button key={g} onClick={() => setGender(g)}
                  className={`h-10 rounded-xl text-sm font-semibold transition-all ${
                    gender === g ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-foreground hover:bg-secondary"
                  }`}>
                  {t(`body.gender.${g}`)}
                </button>
              ))}
            </div>
          </Field>

          <Field label={t("body.restingHr")}>
            <input value={restingHr} onChange={e => setRestingHr(e.target.value)} type="number" min="30" max="120" placeholder="bpm"
              className="w-full h-10 px-3 rounded-xl border border-border bg-secondary/30 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/30" />
            <p className="text-[10px] text-muted-foreground mt-1">{t("body.restingHrHint")}</p>
          </Field>

          {computedMaxHr && (
            <div className="rounded-xl bg-primary/5 border border-primary/10 p-2.5 text-center">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">{t("body.maxHr")}</p>
              <p className="text-lg font-display font-bold text-primary tabular-nums">{computedMaxHr} bpm</p>
              <p className="text-[10px] text-muted-foreground">{t("body.maxHrFormula")}</p>
            </div>
          )}

          <Field label={t("body.goal")}>
            <div className="grid grid-cols-2 gap-1.5">
              {GOALS.map(g => (
                <button key={g} onClick={() => setGoal(g)}
                  className={`h-10 rounded-xl text-xs font-semibold transition-all ${
                    goal === g ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-foreground hover:bg-secondary"
                  }`}>
                  {t(`body.goal.${g}`)}
                </button>
              ))}
            </div>
          </Field>

          <div className="flex gap-2 pt-1">
            <button onClick={() => onOpenChange(false)} className="flex-1 h-11 rounded-xl border border-border font-semibold">
              {t("common.cancel")}
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground font-bold flex items-center justify-center gap-1.5 disabled:opacity-50">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("common.save")}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1 block">{label}</label>
    {children}
  </div>
);

export default BodyProfileDialog;
