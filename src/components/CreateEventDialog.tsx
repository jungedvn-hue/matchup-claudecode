import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useCreateEvent } from "@/hooks/useGroupEvents";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  groupId: string;
  onCreated?: () => void;
}

const CreateEventDialog = ({ open, onOpenChange, groupId, onCreated }: Props) => {
  const { t } = useLanguage();
  const { create } = useCreateEvent();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(90);
  const [maxAttendees, setMaxAttendees] = useState<number | "">("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setTitle(""); setDescription(""); setLocation("");
    setDate(""); setTime(""); setDuration(90); setMaxAttendees("");
  };

  const handleCreate = async () => {
    if (!title.trim() || !date || !time) {
      toast.error(t("events.fillRequired"));
      return;
    }
    setSaving(true);
    const eventDate = new Date(`${date}T${time}`).toISOString();
    const { error } = await create({
      group_id: groupId,
      title: title.trim(),
      description: description || undefined,
      location: location || undefined,
      event_date: eventDate,
      duration_minutes: duration,
      max_attendees: maxAttendees === "" ? undefined : Number(maxAttendees),
    });
    setSaving(false);
    if (error) { toast.error(error); return; }
    toast.success(t("events.created"));
    reset();
    onOpenChange(false);
    onCreated?.();
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display">{t("events.newEvent")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">{t("events.titleLabel")} <span className="text-destructive">*</span></Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={t("events.titlePh")} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">{t("events.date")} <span className="text-destructive">*</span></Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">{t("events.time")} <span className="text-destructive">*</span></Label>
              <Input type="time" value={time} onChange={e => setTime(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">{t("store.address")}</Label>
            <Input value={location} onChange={e => setLocation(e.target.value)} placeholder={t("events.locationPh")} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">{t("events.duration")}</Label>
              <Input type="number" min={15} max={480} step={15} value={duration} onChange={e => setDuration(parseInt(e.target.value) || 90)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">{t("events.maxAttendees")}</Label>
              <Input type="number" min={1} value={maxAttendees} onChange={e => setMaxAttendees(e.target.value === "" ? "" : parseInt(e.target.value))} placeholder="—" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">{t("groups.descLabel")}</Label>
            <Textarea rows={2} value={description} onChange={e => setDescription(e.target.value)} placeholder={t("events.descPh")} className="resize-none" />
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => { reset(); onOpenChange(false); }} disabled={saving}>
              {t("common.cancel")}
            </Button>
            <Button className="flex-1 rounded-xl font-bold" onClick={handleCreate} disabled={saving || !title.trim() || !date || !time}>
              {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              {t("events.create")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateEventDialog;
