import { useState } from "react";
import { Loader2, Gift } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/i18n/LanguageContext";
import { redeemHostPromoCode } from "@/hooks/useHostCredit";
import { formatCoin } from "@/hooks/useCoin";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess?: () => void;
}

const RedeemPromoCodeDialog = ({ open, onOpenChange, onSuccess }: Props) => {
  const { t } = useLanguage();
  const [code, setCode] = useState("");
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    const trimmed = code.trim();
    if (!trimmed) return;
    setSaving(true);
    const { newBalance, error } = await redeemHostPromoCode(trimmed);
    setSaving(false);
    if (error) { toast.error(t("hostCredit.promo.invalid")); return; }
    toast.success(t("hostCredit.promo.success", { balance: formatCoin(newBalance ?? 0) }));
    setCode("");
    onSuccess?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Gift className="h-4 w-4 text-primary" />
            {t("hostCredit.promo.title")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          <p className="text-xs text-muted-foreground leading-relaxed">{t("hostCredit.promo.help")}</p>

          <Input
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder={t("hostCredit.promo.placeholder")}
            className="font-stat text-base text-center tracking-widest uppercase"
            autoFocus
          />

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => onOpenChange(false)} disabled={saving}>
              {t("common.cancel")}
            </Button>
            <Button className="flex-1 rounded-xl font-bold" onClick={handleConfirm} disabled={saving || !code.trim()}>
              {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              {t("hostCredit.promo.confirm")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RedeemPromoCodeDialog;
