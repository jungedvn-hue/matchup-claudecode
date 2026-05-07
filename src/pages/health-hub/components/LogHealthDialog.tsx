import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { HealthDailyLog } from "@/hooks/useHealthData";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: HealthDailyLog | null;
  onSave: (patch: Partial<HealthDailyLog>) => Promise<{ error: Error | null }>;
}

const LogHealthDialog = ({ open, onOpenChange, initial, onSave }: Props) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [steps, setSteps] = useState("");
  const [distance, setDistance] = useState("");
  const [avgHr, setAvgHr] = useState("");
  const [hrv, setHrv] = useState("");
  const [stress, setStress] = useState<"low" | "medium" | "high" | "">("");
  const [sleepHours, setSleepHours] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSteps(initial?.steps?.toString() ?? "");
    setDistance(initial?.distance_km?.toString() ?? "");
    setAvgHr(initial?.avg_hr?.toString() ?? "");
    setHrv(initial?.hrv_ms?.toString() ?? "");
    setStress((initial?.stress_level as any) ?? "");
    setSleepHours(initial?.sleep_hours?.toString() ?? "");
  }, [open, initial]);

  const numOrNull = (v: string) => (v.trim() === "" ? null : Number(v));

  const submit = async () => {
    setSubmitting(true);
    const { error } = await onSave({
      steps: numOrNull(steps),
      distance_km: numOrNull(distance),
      avg_hr: numOrNull(avgHr),
      hrv_ms: numOrNull(hrv),
      stress_level: stress === "" ? null : stress,
      sleep_hours: numOrNull(sleepHours),
    });
    setSubmitting(false);
    if (error) {
      toast({ title: t("health.log.error"), description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: t("health.log.success") });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("health.log.title")}</DialogTitle>
          <DialogDescription>{t("health.log.subtitle")}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 py-2">
          <Field id="steps" label={t("health.metric.steps")} value={steps} onChange={setSteps} placeholder="8000" />
          <Field id="distance" label={`${t("health.metric.distance")} (km)`} value={distance} onChange={setDistance} placeholder="5.0" />
          <Field id="hr" label={`${t("health.metric.heartRate")} (BPM)`} value={avgHr} onChange={setAvgHr} placeholder="72" />
          <Field id="hrv" label="HRV (ms)" value={hrv} onChange={setHrv} placeholder="65" />
          <Field id="sleep" label={`${t("health.metric.sleep")} (h)`} value={sleepHours} onChange={setSleepHours} placeholder="7.5" />
          <div className="space-y-1.5">
            <Label htmlFor="stress" className="text-xs">{t("health.metric.stress")}</Label>
            <Select value={stress} onValueChange={(v) => setStress(v as any)}>
              <SelectTrigger id="stress" className="h-9">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">{t("health.stress.low")}</SelectItem>
                <SelectItem value="medium">{t("health.stress.medium")}</SelectItem>
                <SelectItem value="high">{t("health.stress.high")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) => (
  <div className="space-y-1.5">
    <Label htmlFor={id} className="text-xs">{label}</Label>
    <Input
      id={id}
      type="number"
      inputMode="decimal"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-9"
    />
  </div>
);

export default LogHealthDialog;
