import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { HealthGoals } from "@/hooks/useHealthData";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: HealthGoals;
  onSave: (goals: HealthGoals) => Promise<{ error: Error | null }>;
}

const GoalsDialog = ({ open, onOpenChange, initial, onSave }: Props) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [steps, setSteps] = useState("8000");
  const [distance, setDistance] = useState("5");
  const [calories, setCalories] = useState("500");
  const [matches, setMatches] = useState("3");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSteps(String(initial.daily_steps));
    setDistance(String(initial.daily_distance_km));
    setCalories(String(initial.daily_calories));
    setMatches(String(initial.weekly_matches));
  }, [open, initial]);

  const submit = async () => {
    setSubmitting(true);
    const { error } = await onSave({
      daily_steps: Number(steps) || 0,
      daily_distance_km: Number(distance) || 0,
      daily_calories: Number(calories) || 0,
      weekly_matches: Number(matches) || 0,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: t("health.log.error"), description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: t("health.goals.saved") });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("health.goals.title")}</DialogTitle>
          <DialogDescription>{t("health.goals.subtitle")}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 py-2">
          <Field id="g-steps" label={t("health.goals.dailySteps")} value={steps} onChange={setSteps} />
          <Field id="g-dist" label={`${t("health.goals.dailyDistance")} (km)`} value={distance} onChange={setDistance} />
          <Field id="g-cal" label={`${t("health.goals.dailyCalories")} (kcal)`} value={calories} onChange={setCalories} />
          <Field id="g-match" label={t("health.goals.weeklyMatches")} value={matches} onChange={setMatches} />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            {t("common.cancel")}
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const Field = ({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) => (
  <div className="space-y-1.5">
    <Label htmlFor={id} className="text-xs">{label}</Label>
    <Input id={id} type="number" inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} className="h-9" />
  </div>
);

export default GoalsDialog;
