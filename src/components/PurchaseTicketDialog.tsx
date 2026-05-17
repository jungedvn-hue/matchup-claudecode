import { useState } from "react";
import { Loader2, Ticket, Wallet, ArrowRight, Clock, Coins } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { useCoinBalance, formatCoin } from "@/hooks/useCoin";
import { purchaseEventTicket } from "@/hooks/useHostCredit";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  priceCoins: number;
  refundHours: number;
  onSuccess?: () => void;
}

const PurchaseTicketDialog = ({ open, onOpenChange, eventId, eventTitle, eventDate, priceCoins, refundHours, onSuccess }: Props) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { balance: wallet, refetch: refetchWallet } = useCoinBalance();
  const [saving, setSaving] = useState(false);

  const walletBalance = wallet?.balance ?? 0;
  const insufficient = priceCoins > walletBalance;
  const after = walletBalance - priceCoins;

  const handleBuy = async () => {
    setSaving(true);
    const { ticketId, error } = await purchaseEventTicket(eventId);
    setSaving(false);
    if (error) { toast.error(error); return; }
    toast.success(t("buyTicket.success"));
    await refetchWallet();
    onSuccess?.();
    onOpenChange(false);
    if (ticketId) navigate("/my-tickets");
  };

  const goTopup = () => {
    onOpenChange(false);
    navigate("/wallet");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Ticket className="h-4 w-4 text-primary" />
            {t("buyTicket.title")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          {/* Event summary */}
          <div className="rounded-xl border border-border bg-secondary/30 p-3">
            <p className="text-sm font-bold text-foreground">{eventTitle}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {new Date(eventDate).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>

          {/* Price hero */}
          <div className="rounded-xl bg-gradient-to-br from-primary/10 via-card to-card border border-primary/20 p-4 text-center">
            <div className="flex items-center justify-center gap-1.5 text-primary">
              <Coins className="h-4 w-4" />
              <span className="text-[10px] uppercase font-bold tracking-wider">{t("buyTicket.price")}</span>
            </div>
            <p className="font-stat font-bold text-3xl text-primary tabular-nums mt-1.5 leading-none">{formatCoin(priceCoins)}</p>
          </div>

          {/* Wallet before/after */}
          <div className="rounded-xl bg-secondary/40 p-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">{t("buyTicket.walletNow")}</p>
              <p className="font-stat font-bold text-base text-foreground tabular-nums mt-0.5">{formatCoin(walletBalance)}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">{t("buyTicket.afterPurchase")}</p>
              <p className={`font-stat font-bold text-base tabular-nums mt-0.5 ${insufficient ? "text-destructive" : "text-foreground"}`}>
                {formatCoin(Math.max(0, after))}
              </p>
            </div>
          </div>

          {/* Refund note */}
          <div className="flex items-start gap-1.5 text-[10.5px] text-muted-foreground leading-relaxed">
            <Clock className="h-3 w-3 shrink-0 mt-0.5" />
            <p>{t("buyTicket.refundNote", { hours: refundHours })}</p>
          </div>

          {/* Actions */}
          {insufficient ? (
            <div className="space-y-2">
              <p className="text-[11px] text-destructive text-center">{t("buyTicket.insufficient")}</p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => onOpenChange(false)} disabled={saving}>
                  {t("common.cancel")}
                </Button>
                <Button className="flex-1 rounded-xl font-bold" onClick={goTopup}>
                  <Wallet className="h-4 w-4 mr-1.5" /> {t("buyTicket.topupCta")}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => onOpenChange(false)} disabled={saving}>
                {t("common.cancel")}
              </Button>
              <Button className="flex-1 rounded-xl font-bold" onClick={handleBuy} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                {t("buyTicket.confirm")}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PurchaseTicketDialog;
