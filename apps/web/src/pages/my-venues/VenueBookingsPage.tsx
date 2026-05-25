import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Building2, Loader2, Check, X, Clock, CheckCircle2, DollarSign, TrendingUp, Calendar, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/i18n/LanguageContext";
import { useVenue } from "@/hooks/useVenues";
import { useVenueBookings, confirmBooking, cancelBooking, markBookingPaid, checkInBooking, type CourtBooking, type BookingStatus } from "@/hooks/useBookings";
import { toast } from "sonner";

type TabKey = "pending" | "today" | "upcoming" | "past";

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const fmtMoney = (n: number) => `${Math.round(n).toLocaleString("vi-VN")}đ`;
const fmtTime = (iso: string) => new Date(iso).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

const STATUS_CLS: Record<BookingStatus, string> = {
  pending:   "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  confirmed: "bg-primary/10 text-primary border-primary/20",
  cancelled: "bg-muted text-muted-foreground border-border",
  completed: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  no_show:   "bg-destructive/10 text-destructive border-destructive/20",
};

const VenueBookingsPage = () => {
  const { venueId } = useParams<{ venueId: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { data: venue, loading: vLoading } = useVenue(venueId);
  // Fetch from 30 days ago to capture recent past
  const fromISO = useMemo(() => new Date(Date.now() - 30 * 86400000).toISOString(), []);
  const { items, loading, refetch } = useVenueBookings(venueId, fromISO);
  const [tab, setTab] = useState<TabKey>("pending");
  const [busyId, setBusyId] = useState<string | null>(null);

  const now = new Date();
  const buckets = useMemo(() => {
    const pending: CourtBooking[] = [];
    const today: CourtBooking[]   = [];
    const upcoming: CourtBooking[]= [];
    const past: CourtBooking[]    = [];
    for (const b of items) {
      if (b.status === "pending") pending.push(b);
      const start = new Date(b.start_at);
      if (b.status === "cancelled" || b.status === "completed" || b.status === "no_show" || start < now) {
        past.push(b);
      } else if (sameDay(start, now)) {
        today.push(b);
      } else {
        upcoming.push(b);
      }
    }
    return { pending, today, upcoming, past };
  }, [items, now]);

  const list = buckets[tab];

  // Revenue stats — from paid bookings, broken down gross / commission / net
  const stats = useMemo(() => {
    const startMonth = new Date(); startMonth.setHours(0, 0, 0, 0); startMonth.setDate(1);
    let monthGross = 0, monthCommission = 0;
    const startToday = new Date(); startToday.setHours(0, 0, 0, 0);
    const startWeek = new Date(startToday); startWeek.setDate(startWeek.getDate() - 6);
    let todaySum = 0, weekSum = 0;
    for (const b of items) {
      if (b.payment_status !== "paid") continue;
      const s = new Date(b.start_at);
      if (s >= startToday) todaySum += (b.price_vnd - b.commission_vnd);
      if (s >= startWeek)  weekSum  += (b.price_vnd - b.commission_vnd);
      if (s >= startMonth) {
        monthGross += b.price_vnd;
        monthCommission += b.commission_vnd;
      }
    }
    return { todaySum, weekSum, monthGross, monthCommission, monthNet: monthGross - monthCommission };
  }, [items]);

  const act = async (id: string, fn: () => Promise<{ error: unknown }>) => {
    setBusyId(id);
    const { error } = await fn();
    setBusyId(null);
    if (error) toast.error((error as any)?.message ?? t("booking.actionError"));
    else { toast.success(t("booking.actionDone")); refetch(); }
  };

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "pending",  label: t("booking.tab.pending"),  count: buckets.pending.length },
    { key: "today",    label: t("booking.tab.today"),    count: buckets.today.length },
    { key: "upcoming", label: t("booking.tab.upcoming"), count: buckets.upcoming.length },
    { key: "past",     label: t("booking.tab.past"),     count: buckets.past.length },
  ];

  if (vLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground/40" /></div>;
  if (!venue) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 text-center">
      <Building2 className="h-10 w-10 text-muted-foreground/30" />
      <p className="text-sm text-muted-foreground">{t("venue.notFound")}</p>
    </div>
  );

  return (
    <div className="pb-24 min-h-screen">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button onClick={() => navigate(-1)} className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-display font-bold text-foreground flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" /> {t("booking.manage.title")}
            </h1>
            <p className="text-xs text-muted-foreground truncate">{venue.name}</p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 max-w-2xl mx-auto space-y-4">
        {/* Revenue stats */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { icon: DollarSign, value: stats.todaySum, label: t("booking.revenue.today"),  tone: "primary" },
            { icon: Calendar,   value: stats.weekSum,  label: t("booking.revenue.week7d"), tone: "blue" },
          ].map((s, i) => (
            <Card key={i} className="p-2.5 shadow-card text-center">
              <s.icon className={`h-3.5 w-3.5 mx-auto mb-1 ${s.tone === "primary" ? "text-primary" : "text-blue-600 dark:text-blue-400"}`} />
              <p className="text-sm font-stat font-bold text-foreground tabular-nums leading-none">{fmtMoney(s.value)}</p>
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold mt-1">{s.label} · {t("booking.revenue.netLabel")}</p>
            </Card>
          ))}
        </div>

        {/* Month breakdown */}
        <Card className="p-3 shadow-card space-y-2">
          <h3 className="text-[10px] uppercase tracking-[0.12em] font-semibold text-muted-foreground inline-flex items-center gap-1.5">
            <TrendingUp className="h-3 w-3" /> {t("booking.revenue.month")}
          </h3>
          <div className="grid grid-cols-3 divide-x divide-border">
            <div className="text-center px-2">
              <p className="text-sm font-stat font-bold text-foreground tabular-nums">{fmtMoney(stats.monthGross)}</p>
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground mt-0.5">{t("booking.revenue.gross")}</p>
            </div>
            <div className="text-center px-2">
              <p className="text-sm font-stat font-bold text-amber-600 dark:text-amber-400 tabular-nums">-{fmtMoney(stats.monthCommission)}</p>
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground mt-0.5">{t("booking.revenue.commission")}</p>
            </div>
            <div className="text-center px-2">
              <p className="text-sm font-stat font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{fmtMoney(stats.monthNet)}</p>
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground mt-0.5">{t("booking.revenue.net")}</p>
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <div className="flex gap-1 bg-secondary/60 rounded-xl p-0.5">
          {tabs.map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
                tab === key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
              {count > 0 && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                  tab === key ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"
                }`}>{count}</span>
              )}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="py-12 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground/50" /></div>
        ) : list.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground space-y-2">
            <Calendar className="h-7 w-7 mx-auto text-muted-foreground/30" />
            <p>{t("booking.emptyList")}</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {list.map(b => (
              <Card key={b.id} className="p-3 shadow-card space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-display font-bold text-foreground tabular-nums">
                      {fmtTime(b.start_at)} – {new Date(b.end_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <p className="text-[11px] text-muted-foreground tabular-nums mt-0.5">
                      {t("booking.court")} {b.court_index} · {fmtMoney(b.price_vnd)}
                      {b.commission_vnd > 0 && <span className="text-amber-600 dark:text-amber-400"> (−{fmtMoney(b.commission_vnd)} {t("booking.revenue.commissionShort")})</span>}
                      <span> · {t(`booking.payment.${b.payment_status}`)}</span>
                    </p>
                    {b.note && <p className="text-[11px] text-foreground/80 mt-1 italic">"{b.note}"</p>}
                  </div>
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${STATUS_CLS[b.status]}`}>
                    {t(`booking.status.${b.status}`)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 pt-1 border-t border-border/50">
                  {b.status === "pending" && (
                    <>
                      <button onClick={() => act(b.id, () => confirmBooking(b.id))} disabled={busyId === b.id}
                        className="flex-1 h-8 rounded-lg bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center gap-1 hover:bg-primary/90 transition-colors">
                        {busyId === b.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3.5 w-3.5" />} {t("booking.confirm")}
                      </button>
                      <button onClick={() => act(b.id, () => cancelBooking(b.id))} disabled={busyId === b.id}
                        className="h-8 px-3 rounded-lg bg-secondary text-muted-foreground text-[11px] font-bold flex items-center gap-1 hover:text-destructive transition-colors">
                        <X className="h-3.5 w-3.5" /> {t("booking.decline")}
                      </button>
                    </>
                  )}
                  {b.status === "confirmed" && (
                    <>
                      <button onClick={() => act(b.id, () => checkInBooking(b.id))} disabled={busyId === b.id}
                        className="flex-1 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold flex items-center justify-center gap-1 hover:bg-emerald-500/15 transition-colors">
                        <CheckCircle2 className="h-3.5 w-3.5" /> {t("booking.checkIn")}
                      </button>
                      {b.payment_status === "unpaid" ? (
                        <button onClick={() => act(b.id, () => markBookingPaid(b.id, true))} disabled={busyId === b.id}
                          className="h-8 px-3 rounded-lg bg-primary/10 text-primary text-[11px] font-bold flex items-center gap-1 hover:bg-primary/15 transition-colors">
                          <DollarSign className="h-3.5 w-3.5" /> {t("booking.markPaid")}
                        </button>
                      ) : (
                        <button onClick={() => act(b.id, () => markBookingPaid(b.id, false))} disabled={busyId === b.id}
                          className="h-8 px-3 rounded-lg bg-muted text-muted-foreground text-[11px] font-bold hover:text-foreground transition-colors">
                          {t("booking.unmarkPaid")}
                        </button>
                      )}
                      <button onClick={() => act(b.id, () => cancelBooking(b.id))} disabled={busyId === b.id}
                        className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex items-center justify-center">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                  {(b.status === "completed" || b.status === "cancelled" || b.status === "no_show") && (
                    <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {new Date(b.updated_at).toLocaleString("vi-VN")}
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VenueBookingsPage;
