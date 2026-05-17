import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Ticket, CheckCircle2, XCircle, MapPin, Calendar, QrCode, Loader2, Coins, Undo2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import QRCodeDisplay from "@/components/QRCodeDisplay";
import { useLanguage } from "@/i18n/LanguageContext";
import { useMyTickets, type EventTicket } from "@/hooks/useTickets";
import { refundEventTicket } from "@/hooks/useHostCredit";
import { formatCoin } from "@/hooks/useCoin";
import { toast } from "sonner";

const fmtDate = (iso?: string | null) => {
  if (!iso) return "";
  return new Date(iso).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
};

const MyTicketsPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { tickets, loading, refetch } = useMyTickets();
  const [qrTicket, setQrTicket] = useState<EventTicket | null>(null);
  const [refunding, setRefunding] = useState<string | null>(null);

  const handleRefund = async (tk: EventTicket) => {
    if (!confirm(t("tickets.refundConfirm", { amount: formatCoin(tk.paid_amount) }))) return;
    setRefunding(tk.id);
    const { error } = await refundEventTicket(tk.id);
    setRefunding(null);
    if (error) { toast.error(error); return; }
    toast.success(t("tickets.refundDone", { amount: formatCoin(tk.paid_amount) }));
    await refetch();
  };

  const refundOpen = (tk: EventTicket): boolean => {
    if (tk.status !== "valid" || tk.paid_amount <= 0 || !tk.event_date) return false;
    const deadline = new Date(tk.event_date).getTime() - (tk.event_refund_deadline_hours ?? 8) * 3600 * 1000;
    return Date.now() < deadline;
  };

  const statusTone: Record<string, { label: string; cls: string }> = {
    valid:     { label: t("tickets.valid"),     cls: "bg-primary/10 text-primary dark:text-primary border-primary/20" },
    used:      { label: t("tickets.used"),      cls: "bg-secondary text-muted-foreground border-border" },
    cancelled: { label: t("tickets.cancelled"), cls: "bg-destructive/10 text-destructive border-destructive/20" },
  };

  return (
    <div className="pb-20 min-h-screen">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button onClick={() => navigate(-1)} className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-lg font-display font-bold text-foreground flex items-center gap-2">
            <Ticket className="h-5 w-5 text-primary" /> {t("tickets.title")}
          </h1>
        </div>
      </div>

      <div className="px-4 pt-4 max-w-2xl mx-auto space-y-2.5">
        {loading ? (
          <div className="py-20 flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin opacity-40" />
            <p className="text-sm">{t("common.loading")}</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="py-20 flex flex-col items-center gap-3 text-muted-foreground">
            <Ticket className="h-10 w-10 opacity-20" />
            <p className="text-sm">{t("tickets.empty")}</p>
            <p className="text-xs">{t("tickets.emptyHint")}</p>
          </div>
        ) : tickets.map((tk, i) => {
          const st = statusTone[tk.status];
          const isPast = tk.event_date && new Date(tk.event_date) < new Date();
          const showQR = tk.status === "valid";
          return (
            <motion.div key={tk.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Card className="p-3.5 shadow-card bg-gradient-to-br from-primary/5 via-card to-card">
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl shrink-0">
                    {tk.group_emoji ?? "🎟️"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-display font-bold text-foreground truncate">{tk.event_title ?? "—"}</p>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${st.cls}`}>{st.label}</span>
                    </div>
                    {tk.group_name && <p className="text-[11px] text-muted-foreground truncate">{tk.group_name}</p>}
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-0.5"><Calendar className="h-3 w-3" /> {fmtDate(tk.event_date)}</span>
                      {tk.event_location && <span className="flex items-center gap-0.5 truncate"><MapPin className="h-3 w-3 shrink-0" /> {tk.event_location}</span>}
                    </div>
                    {tk.paid_amount > 0 && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="inline-flex items-center gap-1 text-[10px] font-stat font-bold text-primary tabular-nums px-1.5 py-0.5 rounded bg-primary/10">
                          <Coins className="h-2.5 w-2.5" /> {formatCoin(tk.paid_amount)}
                        </span>
                        {tk.status === "cancelled" && tk.refunded_at && (
                          <span className="text-[10px] text-muted-foreground">· {t("tickets.refundedOn", { date: fmtDate(tk.refunded_at) })}</span>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {showQR && !isPast && (
                        <Button size="sm" onClick={() => setQrTicket(tk)} className="h-8 px-3 text-xs rounded-lg">
                          <QrCode className="h-3.5 w-3.5 mr-1" /> {t("tickets.showQR")}
                        </Button>
                      )}
                      {refundOpen(tk) && (
                        <button
                          onClick={() => handleRefund(tk)}
                          disabled={refunding === tk.id}
                          className="h-8 px-3 rounded-lg text-xs font-bold border border-destructive/30 text-destructive hover:bg-destructive/10 disabled:opacity-50 inline-flex items-center gap-1"
                        >
                          {refunding === tk.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Undo2 className="h-3 w-3" />}
                          {t("tickets.refundBtn")}
                        </button>
                      )}
                      {tk.status === "used" && tk.checked_in_at && (
                        <span className="text-[10px] text-primary dark:text-primary flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> {t("tickets.checkedInAt")} {fmtDate(tk.checked_in_at)}
                        </span>
                      )}
                      {tk.status === "cancelled" && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <XCircle className="h-3 w-3" /> {t("tickets.cancelledHint")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <Dialog open={!!qrTicket} onOpenChange={v => !v && setQrTicket(null)}>
        <DialogContent className="max-w-xs rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-center">{qrTicket?.event_title}</DialogTitle>
          </DialogHeader>
          {qrTicket && (
            <div className="flex flex-col items-center gap-3 pt-1">
              <QRCodeDisplay data={qrTicket.qr_token} size={200} />
              <p className="text-[11px] text-muted-foreground text-center">{t("tickets.qrHint")}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyTicketsPage;
