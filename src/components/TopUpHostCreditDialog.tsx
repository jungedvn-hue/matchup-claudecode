import { useState } from "react";
import { Loader2, Wallet, ArrowRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { useCoinBalance, formatCoin } from "@/hooks/useCoin";
import { topupHostCredit } from "@/hooks/useHostCredit";
import { toast } from "sonner";

const PRESETS = [500, 1000, 5000, 10000];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess?: () => void;
}

const TopUpHostCreditDialog = ({ open, onOpenChange, onSuccess }: Props) => {
  const { t } = useLanguage();
  const { balance: wallet, refetch: refetchWallet } = useCoinBalance();
  const [amount, setAmount] = useState(1000);
  const [saving, setSaving] = useState(false);

  const walletBalance = wallet?.balance ?? 0;
  const insufficient = amount > walletBalance;

  const handleConfirm = async () => {
    if (insufficient || amount <= 0) return;
    setSaving(true);
    const { error } = await topupHostCredit(amount);
    setSaving(false);
    if (error) { toast.error(error); return; }
    toast.success(t("hostCredit.topup.success", { amount: formatCoin(amount) }));
    await refetchWallet();
    onSuccess?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary" />
            {t("hostCredit.topup.title")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Wallet snapshot */}
          <div className="rounded-xl bg-secondary/40 p-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">{t("hostCredit.topup.walletBalance")}</p>
              <p className="font-stat font-bold text-base text-foreground tabular-nums mt-0.5">{formatCoin(walletBalance)}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">{t("hostCredit.topup.afterTopup")}</p>
              <p className={`font-stat font-bold text-base tabular-nums mt-0.5 ${insufficient ? "text-destructive" : "text-primary"}`}>
                {formatCoin(Math.max(0, walletBalance - amount))}
              </p>
            </div>
          </div>

          {/* Preset chips */}
          <div className="grid grid-cols-4 gap-1.5">
            {PRESETS.map(p => (
              <button key={p}
                onClick={() => setAmount(p)}
                className={`h-9 rounded-xl font-stat font-bold text-xs transition-all ${
                  amount === p
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-foreground hover:bg-secondary/80"
                }`}
              >
                {formatCoin(p)}
              </button>
            ))}
          </div>

          {/* Custom input */}
          <input
            type="number" min={1} step={100}
            value={amount || ""}
            onChange={e => setAmount(Math.max(0, parseInt(e.target.value) || 0))}
            className="w-full h-10 px-3 rounded-xl border border-border bg-background font-stat text-base text-center tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/40"
            placeholder={t("hostCredit.topup.customPh")}
          />

          {insufficient && (
            <p className="text-[11px] text-destructive text-center">{t("hostCredit.topup.insufficient")}</p>
          )}

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => onOpenChange(false)} disabled={saving}>
              {t("common.cancel")}
            </Button>
            <Button className="flex-1 rounded-xl font-bold" onClick={handleConfirm} disabled={saving || insufficient || amount <= 0}>
              {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              {t("hostCredit.topup.confirm")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TopUpHostCreditDialog;
