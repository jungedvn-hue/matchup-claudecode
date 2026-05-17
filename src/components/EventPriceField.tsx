import { Coins, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/i18n/LanguageContext";
import { formatCoin } from "@/hooks/useCoin";

interface Props {
  priceCoins: number;
  onPriceChange: (n: number) => void;
  refundHours: number;
  onRefundHoursChange: (n: number) => void;
}

const EventPriceField = ({ priceCoins, onPriceChange, refundHours, onRefundHoursChange }: Props) => {
  const { t } = useLanguage();
  const fee = priceCoins > 0 ? Math.max(1, Math.floor(priceCoins * 5 / 100)) : 0;
  const isPaid = priceCoins > 0;

  return (
    <div className="space-y-2 rounded-xl border border-border bg-secondary/30 p-3">
      <div className="flex items-center gap-1.5">
        <Coins className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-display font-bold text-foreground">{t("event.price.title")}</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-[11px] font-medium text-muted-foreground">{t("event.price.coinLabel")}</Label>
          <Input
            type="number" min={0} step={100}
            value={priceCoins || ""}
            onChange={e => onPriceChange(Math.max(0, parseInt(e.target.value) || 0))}
            placeholder="0"
            className="font-stat text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] font-medium text-muted-foreground">{t("event.price.refundHours")}</Label>
          <Input
            type="number" min={0} max={168} step={1}
            value={refundHours}
            onChange={e => onRefundHoursChange(Math.max(0, Math.min(168, parseInt(e.target.value) || 0)))}
            disabled={!isPaid}
            className="font-stat text-sm"
          />
        </div>
      </div>

      <div className="flex items-start gap-1.5 pt-0.5">
        <Info className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-[10.5px] text-muted-foreground leading-relaxed">
          {isPaid ? (
            <>
              {t("event.price.feePreview", { fee: formatCoin(fee) })}
              <br />
              {t("event.price.refundHint", { hours: refundHours })}
            </>
          ) : (
            t("event.price.freeHint")
          )}
        </p>
      </div>
    </div>
  );
};

export default EventPriceField;
