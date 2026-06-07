import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, ClipboardList, RefreshCw, Check, X, BadgeDollarSign, Gift } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/i18n/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { useVenue } from "@/hooks/useVenues";
import { useVenueOrders, ORDER_FLOW, type OrderStatus, type VenueOrder } from "@/hooks/useVenueOrders";

const fmtMoney = (n: number) => `${Math.round(n).toLocaleString("vi-VN")}đ`;
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

const STATUS_STYLE: Record<OrderStatus, string> = {
  pending:   "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  confirmed: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  preparing: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
  delivered: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  cancelled: "bg-muted text-muted-foreground border-border",
};

const TABS: ("active" | "delivered" | "cancelled")[] = ["active", "delivered", "cancelled"];

const VenueOrdersPage = () => {
  const navigate = useNavigate();
  const { venueId } = useParams<{ venueId: string }>();
  const [searchParams] = useSearchParams();
  const sessionFilter = searchParams.get("session") ?? undefined;
  const { t } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: venue, loading: venueLoading } = useVenue(venueId);
  const { orders, loading, refetch, setStatus, setPaymentStatus } = useVenueOrders({ venueId, sessionId: sessionFilter });
  const [tab, setTab] = useState<"active" | "delivered" | "cancelled">("active");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [recipients, setRecipients] = useState<Record<string, string>>({});

  useEffect(() => {
    const ids = [...new Set(orders.map(o => o.recipient_id).filter(Boolean) as string[])];
    if (ids.length === 0) { setRecipients({}); return; }
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any).from("profiles").select("user_id, display_name").in("user_id", ids);
      if (cancelled) return;
      const map: Record<string, string> = {};
      (data ?? []).forEach((p: any) => { map[p.user_id] = p.display_name ?? ""; });
      setRecipients(map);
    })();
    return () => { cancelled = true; };
  }, [orders]);

  useEffect(() => {
    if (!venueLoading && venue && user && venue.owner_user_id !== user.id) navigate("/my-venues", { replace: true });
  }, [venueLoading, venue, user, navigate]);

  const filtered = useMemo(() => orders.filter(o => {
    if (tab === "active") return ["pending", "confirmed", "preparing"].includes(o.status);
    if (tab === "delivered") return o.status === "delivered";
    return o.status === "cancelled";
  }), [orders, tab]);

  if (venueLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!venue) { navigate("/my-venues", { replace: true }); return null; }

  const advance = async (o: VenueOrder) => {
    const idx = ORDER_FLOW.indexOf(o.status as typeof ORDER_FLOW[number]);
    if (idx < 0 || idx >= ORDER_FLOW.length - 1) return;
    setBusyId(o.id);
    await setStatus(o.id, ORDER_FLOW[idx + 1]);
    setBusyId(null);
  };
  const cancel = async (o: VenueOrder) => { setBusyId(o.id); await setStatus(o.id, "cancelled"); setBusyId(null); };
  const togglePaid = async (o: VenueOrder) => {
    setBusyId(o.id);
    await setPaymentStatus(o.id, o.payment_status === "paid" ? "unpaid" : "paid");
    setBusyId(null);
    toast({ title: o.payment_status === "paid" ? t("venueOrders.markedUnpaid") : t("venueOrders.markedPaid") });
  };

  const nextLabel = (s: OrderStatus) => {
    const idx = ORDER_FLOW.indexOf(s as typeof ORDER_FLOW[number]);
    if (idx < 0 || idx >= ORDER_FLOW.length - 1) return null;
    return t(`venueOrders.advance.${ORDER_FLOW[idx + 1]}`);
  };

  return (
    <div className="pb-24 min-h-screen">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center justify-between gap-3 max-w-2xl mx-auto">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate(-1)} className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center hover:bg-secondary/70 shrink-0"><ArrowLeft className="h-4 w-4" /></button>
            <div className="min-w-0">
              <h1 className="text-base font-display font-bold text-foreground truncate flex items-center gap-2"><ClipboardList className="h-5 w-5 text-primary" /> {t("venueOrders.title")}</h1>
              <p className="text-[11px] text-muted-foreground truncate">{venue.name}</p>
            </div>
          </div>
          <Button size="sm" variant="ghost" onClick={() => refetch()} className="h-8 w-8 p-0 shrink-0"><RefreshCw className="h-4 w-4" /></Button>
        </div>
        <div className="flex gap-1.5 mt-3 max-w-2xl mx-auto">
          {TABS.map(tb => (
            <button key={tb} onClick={() => setTab(tb)}
              className={`flex-1 h-8 rounded-lg text-[11px] font-semibold transition-colors ${tab === tb ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
              {t(`venueOrders.tab.${tb}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4 max-w-2xl mx-auto space-y-2.5">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground shadow-card mt-4">{t("venueOrders.empty")}</Card>
        ) : (
          filtered.map((o, i) => (
            <motion.div key={o.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card className="p-3.5 shadow-card space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {o.court_ref ? `${t("venueSession.court")} ${o.court_ref}` : t("venueOrders.noCourt")}
                    </p>
                    {o.recipient_id && (
                      <p className="text-[11px] font-medium text-orange-600 dark:text-orange-400 inline-flex items-center gap-1">
                        <Gift className="h-3 w-3" /> {t("venueOrders.giftFor")} {recipients[o.recipient_id] || t("common.unknown")}
                      </p>
                    )}
                    <p className="text-[11px] text-muted-foreground tabular-nums">{fmtTime(o.created_at)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge className={`text-[9px] border ${STATUS_STYLE[o.status]}`} variant="outline">{t(`venueSession.status.${o.status}`)}</Badge>
                    <button onClick={() => togglePaid(o)} disabled={busyId === o.id}
                      className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border inline-flex items-center gap-1 ${o.payment_status === "paid" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-secondary text-muted-foreground border-border"}`}>
                      <BadgeDollarSign className="h-2.5 w-2.5" />{t(`payment.status.${o.payment_status}`)} · {t(`venueSession.pay.${o.payment_method}`)}
                    </button>
                  </div>
                </div>
                <div className="space-y-0.5 text-[12px]">
                  {(o.items ?? []).map(it => (
                    <div key={it.id} className="flex justify-between">
                      <span className="text-muted-foreground">{it.qty}× {it.name}</span>
                      <span className="tabular-nums">{fmtMoney(it.subtotal)}</span>
                    </div>
                  ))}
                </div>
                {o.note && <p className="text-[11px] text-muted-foreground italic">"{o.note}"</p>}
                <div className="flex items-center justify-between pt-1.5 border-t border-border/60">
                  <span className="text-sm font-bold tabular-nums text-primary">{fmtMoney(o.total)}</span>
                  {o.status !== "delivered" && o.status !== "cancelled" && (
                    <div className="flex items-center gap-1.5">
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10" disabled={busyId === o.id} onClick={() => cancel(o)}>
                        <X className="h-3 w-3 mr-1" /> {t("venueOrders.cancel")}
                      </Button>
                      {nextLabel(o.status) && (
                        <Button size="sm" className="h-7 px-3 text-xs gap-1" disabled={busyId === o.id} onClick={() => advance(o)}>
                          {busyId === o.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} {nextLabel(o.status)}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default VenueOrdersPage;
