import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, Coins, TrendingUp, TrendingDown, Gift, Award, ShoppingBag, Sparkles, Loader2, RefreshCcw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/i18n/LanguageContext";
import { useCoinBalance, useCoinTransactions, formatCoin, type CoinTxType } from "@/hooks/useCoin";
import PageHeader from "@/components/PageHeader";

const txIconFor = (type: CoinTxType) => {
  switch (type) {
    case "purchase": return { icon: Plus, tone: "primary" };
    case "gift_received": return { icon: Gift, tone: "pink" };
    case "gift_sent": return { icon: Gift, tone: "amber" };
    case "spend": return { icon: ShoppingBag, tone: "blue" };
    case "refund": return { icon: RefreshCcw, tone: "emerald" };
    case "admin_grant": return { icon: Sparkles, tone: "violet" };
  }
};

const toneClass = (tone: string) =>
  tone === "primary" ? "bg-primary/10 text-primary" :
  tone === "pink" ? "bg-pink-500/10 text-pink-500" :
  tone === "amber" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" :
  tone === "blue" ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" :
  tone === "emerald" ? "bg-primary/10 text-primary dark:text-primary" :
  "bg-violet-500/10 text-violet-600 dark:text-violet-400";

const WalletPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { balance, loading: balLoading } = useCoinBalance();
  const { items: txs, loading: txLoading } = useCoinTransactions(50);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="pb-20 min-h-screen">
      <PageHeader title={t("wallet.title")} back />

      <div className="px-4 pt-4 max-w-2xl mx-auto space-y-4">
        {/* Balance hero card */}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-5 shadow-card bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-card border-amber-500/20">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Coins className="h-3.5 w-3.5 text-amber-500" />
              {t("wallet.currentBalance")}
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              {balLoading ? (
                <Loader2 className="h-7 w-7 animate-spin text-amber-500/40" />
              ) : (
                <>
                  <p className="text-4xl font-display font-bold text-foreground tabular-nums">{formatCoin(balance?.balance ?? 0)}</p>
                  <p className="text-sm font-semibold text-muted-foreground">{t("wallet.coins")}</p>
                </>
              )}
            </div>
            <button
              onClick={() => navigate("/wallet/topup")}
              className="mt-4 w-full h-11 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg shadow-amber-500/30"
            >
              <Plus className="h-4 w-4" /> {t("wallet.topup")}
            </button>
          </Card>
        </motion.div>

        {/* Lifetime stats */}
        {balance && (
          <div className="grid grid-cols-2 gap-2">
            <Card className="p-3 shadow-card">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <TrendingUp className="h-3 w-3 text-primary" /> {t("wallet.lifetimeEarned")}
              </div>
              <p className="mt-1 text-lg font-display font-bold text-foreground tabular-nums">{formatCoin(balance.lifetime_earned)}</p>
            </Card>
            <Card className="p-3 shadow-card">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <TrendingDown className="h-3 w-3 text-rose-500" /> {t("wallet.lifetimeSpent")}
              </div>
              <p className="mt-1 text-lg font-display font-bold text-foreground tabular-nums">{formatCoin(balance.lifetime_spent)}</p>
            </Card>
          </div>
        )}

        {/* Transactions */}
        <section>
          <h2 className="text-sm font-display font-bold text-foreground mb-2.5">{t("wallet.history")}</h2>
          {txLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary opacity-40" />
            </div>
          ) : txs.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground shadow-card">
              <Award className="h-10 w-10 mx-auto opacity-20 mb-2" />
              <p className="text-sm">{t("wallet.emptyHistory")}</p>
            </Card>
          ) : (
            <div className="space-y-1.5">
              {txs.map(tx => {
                const { icon: Icon, tone } = txIconFor(tx.type);
                const isCredit = tx.amount > 0;
                return (
                  <Card key={tx.id} className="p-3 shadow-card flex items-center gap-3">
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${toneClass(tone)}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {tx.description ?? t(`wallet.tx.${tx.type}`)}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{formatDate(tx.created_at)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-display font-bold tabular-nums ${isCredit ? "text-primary dark:text-primary" : "text-rose-500"}`}>
                        {isCredit ? "+" : ""}{formatCoin(tx.amount)}
                      </p>
                      <p className="text-[9px] text-muted-foreground tabular-nums">{formatCoin(tx.balance_after)}</p>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default WalletPage;
