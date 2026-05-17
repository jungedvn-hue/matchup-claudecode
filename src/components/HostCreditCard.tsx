import { useState } from "react";
import { Wallet, Plus, Gift, ArrowUpRight, ArrowDownRight, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/i18n/LanguageContext";
import { useHostCredit } from "@/hooks/useHostCredit";
import { formatCoin } from "@/hooks/useCoin";
import TopUpHostCreditDialog from "./TopUpHostCreditDialog";
import RedeemPromoCodeDialog from "./RedeemPromoCodeDialog";

const HostCreditCard = () => {
  const { t } = useLanguage();
  const { balance, loading, refetch } = useHostCredit();
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [promoOpen, setPromoOpen] = useState(false);

  const low = (balance?.balance ?? 0) < 100;

  return (
    <>
      <Card className="p-4 shadow-card bg-gradient-to-br from-primary/8 via-card to-card border-primary/15">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-primary/15 flex items-center justify-center">
              <Wallet className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs font-display font-bold text-foreground">{t("hostCredit.card.title")}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{t("hostCredit.card.subtitle")}</p>
            </div>
          </div>
          {low && !loading && (
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 uppercase tracking-wide">
              {t("hostCredit.card.low")}
            </span>
          )}
        </div>

        <div className="mt-4 flex items-end justify-between">
          <div>
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/40" />
            ) : (
              <p className="font-stat font-bold text-3xl text-foreground tabular-nums leading-none">
                {formatCoin(balance?.balance ?? 0)}
              </p>
            )}
            <p className="text-[10px] text-muted-foreground mt-1.5 uppercase font-semibold tracking-wide">
              {t("hostCredit.card.available")}
            </p>
          </div>

          {balance && (balance.lifetime_topped_up > 0 || balance.lifetime_consumed > 0) && (
            <div className="flex gap-3 text-right">
              <div>
                <p className="font-stat text-xs font-bold text-primary tabular-nums leading-none flex items-center gap-0.5 justify-end">
                  <ArrowUpRight className="h-3 w-3" />{formatCoin(balance.lifetime_topped_up)}
                </p>
                <p className="text-[9px] text-muted-foreground mt-1 uppercase font-semibold">{t("hostCredit.card.toppedUp")}</p>
              </div>
              <div>
                <p className="font-stat text-xs font-bold text-muted-foreground tabular-nums leading-none flex items-center gap-0.5 justify-end">
                  <ArrowDownRight className="h-3 w-3" />{formatCoin(balance.lifetime_consumed)}
                </p>
                <p className="text-[9px] text-muted-foreground mt-1 uppercase font-semibold">{t("hostCredit.card.consumed")}</p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={() => setTopUpOpen(true)}
            className="flex-1 h-9 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-primary/90 transition-all"
          >
            <Plus className="h-3.5 w-3.5" /> {t("hostCredit.card.topupBtn")}
          </button>
          <button
            onClick={() => setPromoOpen(true)}
            className="h-9 px-4 rounded-xl bg-secondary text-foreground text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-secondary/70 transition-all"
          >
            <Gift className="h-3.5 w-3.5" /> {t("hostCredit.card.promoBtn")}
          </button>
        </div>
      </Card>

      <TopUpHostCreditDialog open={topUpOpen} onOpenChange={setTopUpOpen} onSuccess={refetch} />
      <RedeemPromoCodeDialog open={promoOpen} onOpenChange={setPromoOpen} onSuccess={refetch} />
    </>
  );
};

export default HostCreditCard;
