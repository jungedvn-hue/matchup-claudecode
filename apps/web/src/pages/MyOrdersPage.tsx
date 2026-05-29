import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Receipt, Coffee } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/i18n/LanguageContext";
import { useVenueOrders, type OrderStatus, type VenueOrder } from "@/hooks/useVenueOrders";

const fmtMoney = (n: number) => `${Math.round(n).toLocaleString("vi-VN")}đ`;
const fmtTime = (iso: string) => new Date(iso).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

const STATUS_STYLE: Record<OrderStatus, string> = {
  pending:   "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  confirmed: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  preparing: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
  delivered: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  cancelled: "bg-muted text-muted-foreground border-border",
};

const MyOrdersPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { orders, loading } = useVenueOrders({ mine: true });

  return (
    <div className="pb-24 min-h-screen">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button onClick={() => navigate(-1)} className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-base font-display font-bold text-foreground flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" /> {t("myOrders.title")}
          </h1>
        </div>
      </div>

      <div className="px-4 pt-4 max-w-2xl mx-auto space-y-2.5">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : orders.length === 0 ? (
          <Card className="p-8 text-center space-y-3 mt-4 shadow-card">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <Coffee className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">{t("myOrders.empty")}</p>
          </Card>
        ) : (
          orders.map((o: VenueOrder, i) => (
            <motion.div key={o.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card className="p-3.5 shadow-card space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] text-muted-foreground tabular-nums">{fmtTime(o.created_at)}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {o.court_ref && <>{t("venueSession.court")}: {o.court_ref} · </>}
                      {t(`venueSession.pay.${o.payment_method}`)} · {t(`payment.status.${o.payment_status}`)}
                    </p>
                  </div>
                  <Badge className={`text-[9px] border ${STATUS_STYLE[o.status]}`} variant="outline">
                    {t(`venueSession.status.${o.status}`)}
                  </Badge>
                </div>
                <div className="space-y-0.5 text-[12px]">
                  {(o.items ?? []).map(it => (
                    <div key={it.id} className="flex justify-between">
                      <span className="text-muted-foreground">{it.qty}× {it.name}</span>
                      <span className="tabular-nums">{fmtMoney(it.subtotal)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between pt-1.5 border-t border-border/60 text-sm font-bold">
                  <span>{t("venueSession.total")}</span>
                  <span className="tabular-nums text-primary">{fmtMoney(o.total)}</span>
                </div>
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default MyOrdersPage;
