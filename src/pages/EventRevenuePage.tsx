import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, CheckCircle2, XCircle, Coins, Receipt, Users, Undo2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { useEventTickets } from "@/hooks/useTickets";
import { refundEventTicket, cancelPaidEvent } from "@/hooks/useHostCredit";
import { formatCoin } from "@/hooks/useCoin";
import BrandEmptyState from "@/components/BrandEmptyState";
import { toast } from "sonner";

const sb = supabase as unknown as { from: (t: string) => any };

const EventRevenuePage = () => {
  const navigate = useNavigate();
  const { eventId } = useParams<{ eventId: string }>();
  const { user, isMaster } = useAuth();
  const { t } = useLanguage();
  const { tickets, loading, refetch } = useEventTickets(eventId);
  const [event, setEvent] = useState<any>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) return;
    (async () => {
      const { data } = await sb.from("group_events").select("*").eq("id", eventId).maybeSingle();
      setEvent(data);
    })();
  }, [eventId]);

  const stats = useMemo(() => {
    const sold = tickets.filter(t => t.paid_amount > 0 && (t.status === "valid" || t.status === "used")).length;
    const refunded = tickets.filter(t => t.status === "cancelled" && t.refunded_at).length;
    const grossCoins = tickets.filter(t => t.paid_amount > 0 && (t.status === "valid" || t.status === "used"))
      .reduce((s, t) => s + Number(t.paid_amount), 0);
    const refundedCoins = tickets.filter(t => t.status === "cancelled" && t.refunded_at)
      .reduce((s, t) => s + Number(t.paid_amount), 0);
    const feeCoins = tickets.filter(t => t.paid_amount > 0 && (t.status === "valid" || t.status === "used"))
      .reduce((s, t) => s + Number(t.platform_fee), 0);
    const netCoins = grossCoins;
    return { sold, refunded, grossCoins, refundedCoins, feeCoins, netCoins };
  }, [tickets]);

  const isOwner = user && event && (event.created_by === user.id || isMaster);

  const handleRefund = async (ticketId: string) => {
    if (!confirm(t("event.revenue.refundConfirm"))) return;
    setBusy(ticketId);
    const { error } = await refundEventTicket(ticketId, "Host-initiated refund");
    setBusy(null);
    if (error) { toast.error(error); return; }
    toast.success(t("event.revenue.refundDone"));
    await refetch();
  };

  const handleCancelEvent = async () => {
    if (!eventId) return;
    if (!confirm(t("event.revenue.cancelEventConfirm"))) return;
    setBusy("cancel");
    const { refunded, error } = await cancelPaidEvent(eventId);
    setBusy(null);
    if (error) { toast.error(error); return; }
    toast.success(t("event.revenue.cancelEventDone", { count: refunded ?? 0 }));
    await refetch();
  };

  if (!event && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        {t("tm.notFound")}
      </div>
    );
  }

  if (event && !isOwner) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        {t("common.notAuthorized")}
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <PageHeader title={t("event.revenue.title")} back onBack={() => navigate(-1)} />

      <div className="px-4 pt-4 max-w-2xl mx-auto space-y-3">
        {event && (
          <Card className="p-3 shadow-card">
            <p className="text-sm font-display font-bold text-foreground">{event.title}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {new Date(event.event_date).toLocaleString("vi-VN")} · {t("event.price.coinLabel")}: <span className="font-stat font-bold tabular-nums">{formatCoin(event.price_coins)}</span>
            </p>
          </Card>
        )}

        {/* KPI grid */}
        <div className="grid grid-cols-2 gap-2">
          <Card className="p-3 shadow-card">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Users className="h-3 w-3" />
              <p className="text-[10px] uppercase font-semibold tracking-wide">{t("event.revenue.sold")}</p>
            </div>
            <p className="font-stat font-bold text-2xl text-foreground tabular-nums mt-1 leading-none">{stats.sold}</p>
          </Card>
          <Card className="p-3 shadow-card">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Undo2 className="h-3 w-3" />
              <p className="text-[10px] uppercase font-semibold tracking-wide">{t("event.revenue.refunded")}</p>
            </div>
            <p className="font-stat font-bold text-2xl text-foreground tabular-nums mt-1 leading-none">{stats.refunded}</p>
          </Card>
          <Card className="p-3 shadow-card bg-gradient-to-br from-primary/8 via-card to-card">
            <div className="flex items-center gap-1.5 text-primary">
              <Coins className="h-3 w-3" />
              <p className="text-[10px] uppercase font-semibold tracking-wide">{t("event.revenue.netRevenue")}</p>
            </div>
            <p className="font-stat font-bold text-2xl text-primary tabular-nums mt-1 leading-none">{formatCoin(stats.netCoins)}</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              {t("event.revenue.feeTotal")}: <span className="font-stat tabular-nums">{formatCoin(stats.feeCoins)}</span>
            </p>
          </Card>
          <Card className="p-3 shadow-card">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Receipt className="h-3 w-3" />
              <p className="text-[10px] uppercase font-semibold tracking-wide">{t("event.revenue.refundedAmount")}</p>
            </div>
            <p className="font-stat font-bold text-2xl text-foreground tabular-nums mt-1 leading-none">{formatCoin(stats.refundedCoins)}</p>
          </Card>
        </div>

        {/* Buyer list */}
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <p className="text-xs font-display font-bold text-foreground">{t("event.revenue.buyers")}</p>
            {stats.sold > 0 && (
              <button
                onClick={handleCancelEvent}
                disabled={busy === "cancel"}
                className="text-[10px] font-bold text-destructive hover:underline disabled:opacity-50"
              >
                {busy === "cancel" ? <Loader2 className="h-3 w-3 animate-spin" /> : t("event.revenue.cancelEvent")}
              </button>
            )}
          </div>

          {loading ? (
            <div className="py-12 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground/50" /></div>
          ) : tickets.length === 0 ? (
            <Card className="shadow-card">
              <BrandEmptyState pillar="compete" title={t("event.revenue.empty")} description={t("event.revenue.emptyDesc")} />
            </Card>
          ) : (
            <div className="space-y-1.5">
              {tickets.map((tk, i) => {
                const isValid = tk.status === "valid";
                const isUsed = tk.status === "used";
                const isCancelled = tk.status === "cancelled";
                return (
                  <motion.div key={tk.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
                    <Card className="p-3 shadow-card">
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-9 w-9">
                          {tk.buyer_avatar && <AvatarImage src={tk.buyer_avatar} />}
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                            {tk.buyer_name?.[0]?.toUpperCase() ?? "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-foreground truncate">{tk.buyer_name ?? t("common.unknown")}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {isUsed && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary/15 text-primary uppercase">{t("event.revenue.checkedIn")}</span>}
                            {isValid && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-secondary text-muted-foreground uppercase">{t("event.revenue.paid")}</span>}
                            {isCancelled && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-destructive/15 text-destructive uppercase">{t("event.revenue.refundedTag")}</span>}
                            <span className="text-[10px] text-muted-foreground tabular-nums">
                              {tk.paid_at ? new Date(tk.paid_at).toLocaleDateString("vi-VN") : "—"}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-stat font-bold text-sm tabular-nums leading-none ${isCancelled ? "text-muted-foreground line-through" : "text-foreground"}`}>
                            {formatCoin(tk.paid_amount)}
                          </p>
                          {isValid && !isUsed && (
                            <button
                              onClick={() => handleRefund(tk.id)}
                              disabled={busy === tk.id}
                              className="mt-1 text-[10px] font-bold text-destructive hover:underline disabled:opacity-50 inline-flex items-center gap-0.5"
                            >
                              {busy === tk.id ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <><Undo2 className="h-2.5 w-2.5" /> {t("event.revenue.refundBtn")}</>}
                            </button>
                          )}
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventRevenuePage;
