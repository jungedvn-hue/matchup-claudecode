import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Coins, Sparkles, Loader2, CheckCircle2, XCircle, Clock, Building2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/i18n/LanguageContext";
import { useCoinPackages, useCreatePayment, usePaymentOrderStatus, formatCoin, formatVnd, type PaymentOrder } from "@/hooks/useCoin";
import { toast } from "sonner";

const PaymentModal = ({ order, onClose, onSuccess }: { order: PaymentOrder; onClose: () => void; onSuccess: () => void }) => {
  const { t } = useLanguage();
  const live = usePaymentOrderStatus(order.id);
  const current = live ?? order;

  if (current.status === "paid") {
    return (
      <DialogContent className="max-w-sm rounded-2xl">
        <div className="text-center py-6">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="h-16 w-16 mx-auto rounded-full bg-primary/15 flex items-center justify-center mb-3">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </motion.div>
          <h3 className="text-lg font-display font-bold text-foreground">{t("topup.success")}</h3>
          <p className="text-sm text-muted-foreground mt-1">+{formatCoin(current.coins_to_credit)} {t("wallet.coins")}</p>
          <button onClick={onSuccess} className="mt-5 w-full h-11 rounded-xl bg-primary text-primary-foreground font-bold">
            {t("topup.viewWallet")}
          </button>
        </div>
      </DialogContent>
    );
  }

  if (current.status === "failed" || current.status === "expired" || current.status === "cancelled") {
    return (
      <DialogContent className="max-w-sm rounded-2xl">
        <div className="text-center py-6">
          <div className="h-16 w-16 mx-auto rounded-full bg-rose-500/15 flex items-center justify-center mb-3">
            <XCircle className="h-8 w-8 text-rose-500" />
          </div>
          <h3 className="text-lg font-display font-bold text-foreground">{t(`topup.${current.status}`)}</h3>
          <button onClick={onClose} className="mt-5 w-full h-11 rounded-xl border border-border font-semibold">
            {t("common.close")}
          </button>
        </div>
      </DialogContent>
    );
  }

  // Pending — show QR
  return (
    <DialogContent className="max-w-sm rounded-2xl">
      <DialogHeader>
        <DialogTitle className="font-display text-center flex items-center justify-center gap-2">
          <Building2 className="h-4 w-4 text-primary" /> {t("topup.scanToPay")}
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-4 pt-1">
        <div className="text-center">
          <p className="text-2xl font-display font-bold text-foreground">{formatVnd(current.amount_vnd)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{t("topup.willCredit")} {formatCoin(current.coins_to_credit)} {t("wallet.coins")}</p>
        </div>

        {current.qr_code_url ? (
          <div className="flex justify-center">
            <div className="p-3 bg-white rounded-xl shadow-card">
              <img src={current.qr_code_url} alt="VietQR" className="w-56 h-56 object-contain" />
            </div>
          </div>
        ) : current.checkout_url ? (
          <a href={current.checkout_url} target="_blank" rel="noopener noreferrer" className="block w-full h-11 rounded-xl bg-primary text-primary-foreground font-bold flex items-center justify-center">
            {t("topup.openCheckout")}
          </a>
        ) : (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary opacity-40" />
          </div>
        )}

        <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 flex items-start gap-2">
          <Clock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[11px] text-foreground/80 leading-relaxed">{t("topup.pendingHint")}</p>
        </div>

        <button onClick={onClose} className="w-full h-10 rounded-xl border border-border text-sm font-semibold">
          {t("common.cancel")}
        </button>
      </div>
    </DialogContent>
  );
};

const TopupPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { packages, loading } = useCoinPackages();
  const createPayment = useCreatePayment();
  const [creatingId, setCreatingId] = useState<string | null>(null);
  const [activeOrder, setActiveOrder] = useState<PaymentOrder | null>(null);

  const handleSelect = async (pkgId: string) => {
    setCreatingId(pkgId);
    const { order, error } = await createPayment(pkgId);
    setCreatingId(null);
    if (error) { toast.error(error); return; }
    if (order) setActiveOrder(order);
  };

  return (
    <div className="pb-20 min-h-screen">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button onClick={() => navigate(-1)} className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-lg font-display font-bold text-foreground flex items-center gap-2">
            <Coins className="h-5 w-5 text-amber-500" />
            {t("topup.title")}
          </h1>
        </div>
      </div>

      <div className="px-4 pt-4 max-w-2xl mx-auto space-y-4">
        <div className="rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-card border border-amber-500/20 p-4">
          <p className="text-[11px] uppercase tracking-wider font-semibold text-amber-600 dark:text-amber-400">{t("topup.howItWorks")}</p>
          <p className="text-sm text-foreground/80 mt-1.5 leading-relaxed">{t("topup.howItWorksDesc")}</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary opacity-40" /></div>
        ) : (
          <div className="space-y-2.5">
            {packages.map((pkg, i) => {
              const totalCoins = pkg.coin_amount + pkg.bonus_coins;
              return (
                <motion.button
                  key={pkg.id}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  onClick={() => handleSelect(pkg.id)}
                  disabled={creatingId !== null}
                  className="relative w-full p-4 rounded-2xl bg-card border border-border hover:border-amber-500/40 active:scale-[0.99] transition-all text-left shadow-card disabled:opacity-50"
                >
                  {pkg.badge && (
                    <span className="absolute -top-2 right-4 px-2 py-0.5 rounded-md bg-amber-500 text-white text-[9px] font-bold uppercase tracking-wider shadow-md">
                      {pkg.badge}
                    </span>
                  )}
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                      <Coins className="h-6 w-6 text-amber-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-base font-display font-bold text-foreground tabular-nums">
                          {formatCoin(totalCoins)}
                        </p>
                        <p className="text-xs font-semibold text-muted-foreground">{t("wallet.coins")}</p>
                        {pkg.bonus_coins > 0 && (
                          <span className="ml-1 px-1.5 py-0.5 rounded bg-primary/10 text-primary dark:text-primary text-[9px] font-bold flex items-center gap-0.5">
                            <Sparkles className="h-2.5 w-2.5" /> +{formatCoin(pkg.bonus_coins)}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{pkg.name}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-base font-display font-bold text-foreground">{formatVnd(pkg.price_vnd)}</p>
                      {creatingId === pkg.id && <Loader2 className="inline h-3 w-3 animate-spin text-muted-foreground mt-1" />}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}

        <p className="text-[10px] text-muted-foreground text-center leading-relaxed pt-2">
          {t("topup.legal")}
        </p>
      </div>

      <Dialog open={!!activeOrder} onOpenChange={(o) => { if (!o) setActiveOrder(null); }}>
        {activeOrder && (
          <PaymentModal
            order={activeOrder}
            onClose={() => setActiveOrder(null)}
            onSuccess={() => { setActiveOrder(null); navigate("/wallet"); }}
          />
        )}
      </Dialog>
    </div>
  );
};

export default TopupPage;
