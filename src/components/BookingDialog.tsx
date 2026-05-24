import { useMemo, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar as CalendarIcon, Clock, Coins, MapPin } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { useVenueBookings, createBooking, computeSlotConflicts } from "@/hooks/useBookings";
import type { Venue } from "@/hooks/useVenues";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  venue: Venue;
  onBooked?: () => void;
}

const SLOT_HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 06:00 - 22:00 starts

const todayISO = () => new Date().toISOString().slice(0, 10);

const BookingDialog = ({ open, onOpenChange, venue, onBooked }: Props) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [date, setDate] = useState(todayISO());
  const [court, setCourt] = useState(1);
  const [startHour, setStartHour] = useState<number | null>(null);
  const [durationHours, setDurationHours] = useState(1);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const { items: bookings, refetch } = useVenueBookings(venue.id, new Date(`${date}T00:00:00`).toISOString());

  useEffect(() => { if (open) { setStartHour(null); setNote(""); setCourt(1); setDurationHours(1); setDate(todayISO()); } }, [open]);

  const blocked = useMemo(() => computeSlotConflicts(bookings, date, court), [bookings, date, court]);

  const isWeekend = useMemo(() => {
    const day = new Date(`${date}T00:00:00`).getDay();
    return day === 0 || day === 6;
  }, [date]);

  const hourlyRate = isWeekend
    ? (venue.pricing?.weekend_hour ?? venue.pricing?.weekday_hour ?? 0)
    : (venue.pricing?.weekday_hour ?? 0);

  const totalPrice = hourlyRate * durationHours;

  const canSubmit = startHour != null && durationHours > 0 && !!user;

  const submit = async () => {
    if (!canSubmit || !user || startHour == null) return;
    // Check overlap with current selection
    for (let h = startHour; h < startHour + durationHours; h++) {
      if (blocked.has(`${String(h).padStart(2, "0")}:00`)) {
        toast.error(t("booking.slotConflict"));
        return;
      }
    }
    const start = new Date(`${date}T${String(startHour).padStart(2, "0")}:00:00`);
    const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);
    setSaving(true);
    const { error } = await createBooking({
      venue_id: venue.id,
      court_index: court,
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      price_vnd: totalPrice,
      note: note.trim() || null,
    }, user.id);
    setSaving(false);
    if (error) { toast.error((error as any).message ?? t("booking.createError")); return; }
    toast.success(t("booking.created"));
    await refetch();
    onBooked?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("booking.title")}</DialogTitle>
          <DialogDescription>{venue.name} · {venue.court_count} {t("venue.courts")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Date */}
          <div className="space-y-1">
            <label className="text-[11px] text-muted-foreground inline-flex items-center gap-1.5">
              <CalendarIcon className="h-3 w-3" /> {t("booking.date")}
            </label>
            <input
              type="date"
              value={date}
              min={todayISO()}
              onChange={(e) => { setDate(e.target.value); setStartHour(null); }}
              className="w-full h-10 px-3 rounded-xl bg-secondary text-sm tabular-nums outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Court picker */}
          <div className="space-y-1">
            <label className="text-[11px] text-muted-foreground inline-flex items-center gap-1.5">
              <MapPin className="h-3 w-3" /> {t("booking.court")}
            </label>
            <div className="flex gap-1.5 flex-wrap">
              {Array.from({ length: Math.max(1, venue.court_count) }, (_, i) => i + 1).map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => { setCourt(n); setStartHour(null); }}
                  className={`h-9 min-w-[2.5rem] px-3 rounded-lg text-[12px] font-bold tabular-nums transition-colors ${
                    court === n ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-secondary/80"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Time slot picker */}
          <div className="space-y-1">
            <label className="text-[11px] text-muted-foreground inline-flex items-center gap-1.5">
              <Clock className="h-3 w-3" /> {t("booking.startTime")}
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {SLOT_HOURS.map(h => {
                const key = `${String(h).padStart(2, "0")}:00`;
                const isBlocked = blocked.has(key);
                const isPast = (() => {
                  if (date !== todayISO()) return false;
                  return h <= new Date().getHours();
                })();
                const disabled = isBlocked || isPast;
                const active = startHour === h;
                return (
                  <button
                    key={h}
                    type="button"
                    disabled={disabled}
                    onClick={() => setStartHour(h)}
                    className={`h-9 rounded-lg text-[11px] font-semibold tabular-nums transition-colors border ${
                      active ? "bg-primary text-primary-foreground border-primary"
                        : disabled ? "bg-muted text-muted-foreground border-border opacity-50 cursor-not-allowed line-through"
                        : "bg-card text-foreground border-border hover:border-primary/40"
                    }`}
                  >
                    {key}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-1">
            <label className="text-[11px] text-muted-foreground">{t("booking.duration")}</label>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4].map(h => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setDurationHours(h)}
                  className={`flex-1 h-9 rounded-lg text-[12px] font-bold tabular-nums transition-colors ${
                    durationHours === h ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-secondary/80"
                  }`}
                >
                  {h}h
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div className="space-y-1">
            <label className="text-[11px] text-muted-foreground">{t("booking.note")}</label>
            <input
              type="text" value={note} onChange={(e) => setNote(e.target.value)}
              placeholder={t("booking.notePh")}
              className="w-full h-10 px-3 rounded-xl bg-secondary text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Summary */}
          <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>{t("booking.summary.rate")}</span>
              <span className="tabular-nums">{hourlyRate.toLocaleString("vi-VN")}đ × {durationHours}h</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground inline-flex items-center gap-1">
                <Coins className="h-3 w-3" /> {t("booking.summary.total")}
              </span>
              <span className="text-base font-stat font-bold text-primary tabular-nums">{totalPrice.toLocaleString("vi-VN")}đ</span>
            </div>
            <p className="text-[10px] text-muted-foreground pt-1 border-t border-border/40">
              {t("booking.summary.offAppPay")}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button onClick={submit} disabled={!canSubmit || saving}>
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
            {t("booking.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BookingDialog;
