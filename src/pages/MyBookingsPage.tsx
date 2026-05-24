import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Building2, Loader2, X, QrCode, MapPin, Banknote } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useMyBookings, cancelBooking, type CourtBooking, type BookingStatus } from "@/hooks/useBookings";
import type { Venue } from "@/hooks/useVenues";
import BookingPaymentDialog from "@/components/BookingPaymentDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const sb = supabase as unknown as { from: (t: string) => any };

type TabKey = "upcoming" | "past";

const STATUS_CLS: Record<BookingStatus, string> = {
  pending:   "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  confirmed: "bg-primary/10 text-primary border-primary/20",
  cancelled: "bg-muted text-muted-foreground border-border",
  completed: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  no_show:   "bg-destructive/10 text-destructive border-destructive/20",
};

const fmtMoney = (n: number) => `${Math.round(n).toLocaleString("vi-VN")}đ`;
const fmtRange = (s: string, e: string) => {
  const sd = new Date(s), ed = new Date(e);
  return `${sd.toLocaleDateString("vi-VN")} · ${sd.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} – ${ed.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`;
};

const MyBookingsPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { items, loading, refetch } = useMyBookings();
  const [tab, setTab] = useState<TabKey>("upcoming");
  const [qrFor, setQrFor] = useState<CourtBooking | null>(null);
  const [payFor, setPayFor] = useState<CourtBooking | null>(null);
  const [venues, setVenues] = useState<Record<string, Venue>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  useMemo(() => {
    const ids = Array.from(new Set(items.map(i => i.venue_id))).filter(id => !venues[id]);
    if (ids.length === 0) return;
    sb.from("venues").select("*").in("id", ids).then(({ data }: any) => {
      const map: Record<string, Venue> = {};
      (data ?? []).forEach((v: Venue) => { map[v.id] = v; });
      setVenues(prev => ({ ...prev, ...map }));
    });
  }, [items]);

  const venueNames: Record<string, string> = Object.fromEntries(
    Object.entries(venues).map(([k, v]) => [k, v.name])
  );

  const now = Date.now();
  const { upcoming, past } = useMemo(() => {
    const up: CourtBooking[] = [], pa: CourtBooking[] = [];
    for (const b of items) {
      if (b.status === "cancelled" || b.status === "completed" || b.status === "no_show" || new Date(b.start_at).getTime() < now) pa.push(b);
      else up.push(b);
    }
    up.sort((a, b) => +new Date(a.start_at) - +new Date(b.start_at));
    return { upcoming: up, past: pa };
  }, [items, now]);

  const list = tab === "upcoming" ? upcoming : past;

  const handleCancel = async (id: string) => {
    setBusyId(id);
    const { error } = await cancelBooking(id);
    setBusyId(null);
    if (error) toast.error(t("booking.actionError"));
    else { toast.success(t("booking.cancelled")); refetch(); }
  };

  return (
    <div className="pb-24 min-h-screen">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button onClick={() => navigate(-1)} className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-lg font-display font-bold text-foreground flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" /> {t("myBookings.title")}
          </h1>
        </div>
      </div>

      <div className="px-4 pt-4 max-w-2xl mx-auto space-y-3">
        <div className="flex gap-1 bg-secondary/60 rounded-xl p-0.5">
          {(["upcoming", "past"] as TabKey[]).map(k => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
                tab === k ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t(`myBookings.tab.${k}`)} ({k === "upcoming" ? upcoming.length : past.length})
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-12 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground/50" /></div>
        ) : list.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground space-y-2">
            <Calendar className="h-7 w-7 mx-auto text-muted-foreground/30" />
            <p>{t("myBookings.empty")}</p>
          </Card>
        ) : (
          list.map(b => (
            <Card key={b.id} className="p-3 shadow-card space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <button
                  onClick={() => navigate(`/venue/${b.venue_id}`)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="text-sm font-display font-bold text-foreground inline-flex items-center gap-1.5 truncate">
                    <Building2 className="h-3.5 w-3.5 text-primary/70 shrink-0" /> {venueNames[b.venue_id] ?? "—"}
                  </p>
                  <p className="text-[11px] text-muted-foreground tabular-nums mt-0.5">{fmtRange(b.start_at, b.end_at)}</p>
                  <p className="text-[11px] text-muted-foreground tabular-nums mt-0.5">
                    <MapPin className="h-2.5 w-2.5 inline" /> {t("booking.court")} {b.court_index} · {fmtMoney(b.price_vnd)} · {t(`booking.payment.${b.payment_status}`)}
                  </p>
                  {b.note && <p className="text-[11px] text-foreground/80 italic mt-1">"{b.note}"</p>}
                </button>
                <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0 ${STATUS_CLS[b.status]}`}>
                  {t(`booking.status.${b.status}`)}
                </span>
              </div>
              <div className="flex items-center gap-1.5 pt-1 border-t border-border/50">
                {(b.status === "pending" || b.status === "confirmed") && new Date(b.start_at).getTime() > now && (
                  <button onClick={() => handleCancel(b.id)} disabled={busyId === b.id}
                    className="h-8 px-3 rounded-lg bg-secondary text-muted-foreground hover:text-destructive text-[11px] font-bold flex items-center gap-1 transition-colors">
                    {busyId === b.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />} {t("booking.cancel")}
                  </button>
                )}
                {b.payment_status === "unpaid" && (b.status === "pending" || b.status === "confirmed") && (
                  <button onClick={() => setPayFor(b)}
                    className="flex-1 h-8 rounded-lg bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center gap-1.5 hover:bg-primary/90 transition-colors">
                    <Banknote className="h-3.5 w-3.5" /> {t("payment.cta")}
                  </button>
                )}
                {b.status === "confirmed" && (
                  <button onClick={() => setQrFor(b)}
                    className="h-8 px-3 rounded-lg bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center gap-1.5 hover:bg-primary/15 transition-colors">
                    <QrCode className="h-3.5 w-3.5" /> {t("booking.showQr")}
                  </button>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      <BookingPaymentDialog
        open={!!payFor}
        onOpenChange={(v) => !v && setPayFor(null)}
        booking={payFor}
        venue={payFor ? venues[payFor.venue_id] ?? null : null}
      />

      <Dialog open={!!qrFor} onOpenChange={(v) => !v && setQrFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="inline-flex items-center gap-2"><QrCode className="h-5 w-5 text-primary" /> {t("booking.qr.title")}</DialogTitle>
            <DialogDescription>{t("booking.qr.desc")}</DialogDescription>
          </DialogHeader>
          {qrFor && (
            <div className="space-y-3">
              <div className="bg-white rounded-2xl p-4 flex items-center justify-center">
                <QRCodeSVG value={`mpvn:booking:${qrFor.qr_token}`} size={220} level="M" />
              </div>
              <div className="text-center space-y-0.5">
                <p className="text-sm font-display font-bold text-foreground">{venueNames[qrFor.venue_id] ?? "—"}</p>
                <p className="text-[11px] text-muted-foreground tabular-nums">{fmtRange(qrFor.start_at, qrFor.end_at)}</p>
                <p className="text-[10px] text-muted-foreground font-mono mt-1">{qrFor.qr_token}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyBookingsPage;
