import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Coins, ArrowDownCircle, ArrowUpCircle, Building2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useLanguage } from "@/i18n/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { useHostCredits, type CreditBalance } from "@/hooks/useHostCredits";

const fmtMoney = (n: number) => `${Math.round(n).toLocaleString("vi-VN")}đ`;
const fmtTime = (iso: string) => new Date(iso).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

const HostCreditsPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { toast } = useToast();
  const { balances, ledger, loading, redeem } = useHostCredits();
  const [redeeming, setRedeeming] = useState<CreditBalance | null>(null);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  const total = balances.reduce((s, b) => s + b.balance, 0);

  const doRedeem = async () => {
    if (!redeeming) return;
    const amt = Number(amount);
    if (!amt || amt <= 0 || amt > redeeming.balance) { toast({ title: t("hostCredits.badAmount"), variant: "destructive" }); return; }
    setBusy(true);
    const { error } = await redeem(redeeming.venue_id, amt);
    setBusy(false);
    if (error) { toast({ title: t("auth.toast.error"), description: error.message, variant: "destructive" }); return; }
    toast({ title: t("hostCredits.redeemed") });
    setRedeeming(null); setAmount("");
  };

  return (
    <div className="pb-24 min-h-screen">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button onClick={() => navigate(-1)} className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center hover:bg-secondary/70 shrink-0"><ArrowLeft className="h-4 w-4" /></button>
          <h1 className="text-base font-display font-bold text-foreground flex items-center gap-2"><Coins className="h-5 w-5 text-primary" /> {t("hostCredits.title")}</h1>
        </div>
      </div>

      <div className="px-4 pt-4 max-w-2xl mx-auto space-y-4">
        <Card className="p-5 shadow-card text-center bg-gradient-to-br from-primary/10 to-transparent">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{t("hostCredits.totalBalance")}</p>
          <p className="text-3xl font-display font-bold text-primary tabular-nums mt-1">{fmtMoney(total)}</p>
        </Card>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : (
          <>
            {balances.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground px-1">{t("hostCredits.byVenue")}</p>
                {balances.map((b, i) => (
                  <motion.div key={b.venue_id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                    <Card className="p-3.5 shadow-card flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0"><Building2 className="h-4 w-4" /></div>
                      <span className="flex-1 text-sm font-medium truncate">{b.venue_name ?? t("hostCredits.aVenue")}</span>
                      <span className="text-sm font-bold text-primary tabular-nums">{fmtMoney(b.balance)}</span>
                      <Button size="sm" variant="outline" className="h-8" disabled={b.balance <= 0} onClick={() => { setRedeeming(b); setAmount(String(b.balance)); }}>
                        {t("hostCredits.redeem")}
                      </Button>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground px-1">{t("hostCredits.history")}</p>
              {ledger.length === 0 ? (
                <Card className="p-6 text-center text-sm text-muted-foreground shadow-card">{t("hostCredits.empty")}</Card>
              ) : (
                ledger.map(e => (
                  <Card key={e.id} className="p-3 shadow-card flex items-center gap-3">
                    {e.amount >= 0 ? <ArrowUpCircle className="h-4 w-4 text-emerald-500 shrink-0" /> : <ArrowDownCircle className="h-4 w-4 text-muted-foreground shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] text-foreground">{t(`hostCredits.type.${e.type}`)}{e.note ? ` · ${e.note}` : ""}</p>
                      <p className="text-[10px] text-muted-foreground tabular-nums">{fmtTime(e.created_at)}</p>
                    </div>
                    <span className={`text-sm font-bold tabular-nums ${e.amount >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                      {e.amount >= 0 ? "+" : ""}{fmtMoney(e.amount)}
                    </span>
                  </Card>
                ))
              )}
            </div>
          </>
        )}
      </div>

      <Dialog open={!!redeeming} onOpenChange={(o) => { if (!o) { setRedeeming(null); setAmount(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{t("hostCredits.redeemAt", { venue: redeeming?.venue_name ?? "" } as any) ?? t("hostCredits.redeem")}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-1">
            <p className="text-[12px] text-muted-foreground">{t("hostCredits.available")}: <span className="font-bold text-foreground tabular-nums">{fmtMoney(redeeming?.balance ?? 0)}</span></p>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">{t("hostCredits.amount")}</Label>
              <Input type="number" min={1} max={redeeming?.balance} value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <p className="text-[10px] text-muted-foreground">{t("hostCredits.redeemHint")}</p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setRedeeming(null)} disabled={busy}>{t("common.cancel")}</Button>
            <Button onClick={doRedeem} disabled={busy}>{busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{t("hostCredits.confirmRedeem")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HostCreditsPage;
