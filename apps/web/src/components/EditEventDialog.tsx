import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Trash2, Lock } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useUpdateEvent, hasPaidTicket, type GroupEvent } from "@/hooks/useGroupEvents";
import EventPriceField from "@/components/EventPriceField";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  event: GroupEvent;
  onSaved?: () => void;
  onDeleted?: () => void;
}

const EditEventDialog = ({ open, onOpenChange, event, onSaved, onDeleted }: Props) => {
  const { t } = useLanguage();
  const { update, remove } = useUpdateEvent();

  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description ?? "");
  const [location, setLocation] = useState(event.location ?? "");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(event.duration_minutes);
  const [maxAttendees, setMaxAttendees] = useState<number | "">(event.max_attendees ?? "");
  const [priceCoins, setPriceCoins] = useState(event.price_coins);
  const [refundHours, setRefundHours] = useState(event.refund_deadline_hours);
  const [priceLocked, setPriceLocked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (open) {
      const d = new Date(event.event_date);
      const pad = (n: number) => String(n).padStart(2, "0");
      setDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
      setTime(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
      setTitle(event.title);
      setDescription(event.description ?? "");
      setLocation(event.location ?? "");
      setDuration(event.duration_minutes);
      setMaxAttendees(event.max_attendees ?? "");
      setPriceCoins(event.price_coins);
      setRefundHours(event.refund_deadline_hours);
      hasPaidTicket(event.id).then(setPriceLocked);
    }
  }, [open, event]);

  const handleSave = async () => {
    if (!title.trim() || !date || !time) { toast.error(t("events.fillRequired")); return; }
    setSaving(true);
    const eventDate = new Date(`${date}T${time}`).toISOString();
    const patch: any = {
      title: title.trim(),
      description: description || null,
      location: location || null,
      event_date: eventDate,
      duration_minutes: duration,
      max_attendees: maxAttendees === "" ? null : Number(maxAttendees),
    };
    if (!priceLocked) {
      patch.price_coins = priceCoins;
      patch.refund_deadline_hours = refundHours;
    }
    const { error } = await update(event.id, patch);
    setSaving(false);
    if (error) { toast.error(error); return; }
    toast.success(t("events.updated"));
    onSaved?.();
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!confirm(t("events.deleteConfirm"))) return;
    setDeleting(true);
    const { error } = await remove(event.id);
    setDeleting(false);
    if (error) { toast.error(error); return; }
    toast.success(t("events.deleted"));
    onDeleted?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">{t("events.editTitle")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">{t("events.titleLabel")} <span className="text-destructive">*</span></Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} />
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
            <Input value={location} onChange={e => setLocation(e.target.value)} />
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
            <Textarea rows={2} value={description} onChange={e => setDescription(e.target.value)} className="resize-none" />
          </div>

          {priceLocked ? (
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
              <Lock className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400">{t("events.priceLocked")}</p>
                <p className="text-[10.5px] text-muted-foreground mt-0.5 leading-relaxed">{t("events.priceLockedDesc")}</p>
              </div>
            </div>
          ) : (
            <EventPriceField
              priceCoins={priceCoins}
              onPriceChange={setPriceCoins}
              refundHours={refundHours}
              onRefundHoursChange={setRefundHours}
            />
          )}

          <div className="flex gap-2 pt-1">
            <Button variant="outline" size="icon" className="rounded-xl text-destructive hover:bg-destructive/10" onClick={handleDelete} disabled={saving || deleting}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </Button>
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => onOpenChange(false)} disabled={saving || deleting}>
              {t("common.cancel")}
            </Button>
            <Button className="flex-1 rounded-xl font-bold" onClick={handleSave} disabled={saving || deleting || !title.trim() || !date || !time}>
              {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              {t("common.save")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditEventDialog;
