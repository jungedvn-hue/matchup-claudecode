import { useMemo } from "react";
import { CalendarX2, Loader2, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { useLanguage } from "@/i18n/LanguageContext";
import { useRefereeBlockedDates } from "@/hooks/useReferee";
import { toast } from "sonner";

// Local-time YYYY-MM-DD (avoids UTC shift from toISOString).
const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const fromISO = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

interface Props {
  userId: string;
  isOwn: boolean;
}

const RefereeAvailabilityCalendar = ({ userId, isOwn }: Props) => {
  const { t, language } = useLanguage();
  const { items, loading, addBlockedDate, removeBlockedDate } = useRefereeBlockedDates(userId);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const blockedSet = useMemo(() => new Set(items.map(i => i.blocked_date)), [items]);
  const blockedDates = useMemo(() => items.map(i => fromISO(i.blocked_date)), [items]);

  const handleDayClick = async (day: Date) => {
    if (!isOwn) return;
    if (day < today) return;
    const iso = toISO(day);
    if (blockedSet.has(iso)) {
      const { error } = await removeBlockedDate(iso);
      if (error) toast.error(t("ref.calendar.errRemove"));
    } else {
      const { error } = await addBlockedDate(iso);
      if (error) toast.error(t("ref.calendar.errAdd"));
      else toast.success(t("ref.calendar.blocked"));
    }
  };

  // Public viewer with no blocked dates → hide the card entirely.
  if (!isOwn && !loading && items.length === 0) return null;

  const locale = language === "vi" ? "vi-VN" : "en-US";

  return (
    <Card className="p-4 shadow-card">
      <h3 className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1.5 mb-1.5">
        <CalendarX2 className="h-3 w-3" /> {t("ref.calendar.title")}
      </h3>
      <p className="text-[11px] text-muted-foreground leading-relaxed mb-2">
        {isOwn ? t("ref.calendar.hintOwn") : t("ref.calendar.hintPublic")}
      </p>

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/40" />
        </div>
      ) : (
        <>
          <div className="flex justify-center">
            <Calendar
              mode="default"
              onDayClick={handleDayClick}
              disabled={{ before: today }}
              modifiers={{ blocked: blockedDates }}
              modifiersClassNames={{
                blocked:
                  "bg-destructive/15 text-destructive font-bold line-through hover:bg-destructive/25",
              }}
            />
          </div>

          {items.length > 0 && (
            <div className="mt-2 space-y-1.5">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                {t("ref.calendar.upcomingBlocked")} ({items.length})
              </p>
              {items.map(b => (
                <div
                  key={b.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card p-2"
                >
                  <span className="text-xs font-medium text-foreground">
                    {fromISO(b.blocked_date).toLocaleDateString(locale, {
                      weekday: "short",
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  {isOwn && (
                    <button
                      onClick={async () => {
                        const { error } = await removeBlockedDate(b.blocked_date);
                        if (error) toast.error(t("ref.calendar.errRemove"));
                      }}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                      aria-label={t("ref.calendar.unblock")}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Card>
  );
};

export default RefereeAvailabilityCalendar;
