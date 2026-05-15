import { useState } from "react";
import { Loader2, Minus, Plus } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/i18n/LanguageContext";
import { useDrinkMenu, useGiftDrink, type MenuItem } from "@/hooks/useDrinkMenu";
import { useCoinBalance } from "@/hooks/useCoin";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  groupId: string;
  toUserId: string;
  toUserName: string;
  onSent?: () => void;
}

type TipOption = { pct: number; label: string; desc: string; custom?: boolean };

const TIP_OPTIONS: TipOption[] = [
  { pct: 5,  label: "drinks.tip5",  desc: "drinks.tip5desc" },
  { pct: 10, label: "drinks.tip10", desc: "drinks.tip10desc" },
  { pct: 15, label: "drinks.tip15", desc: "drinks.tip15desc" },
  { pct: 0,  label: "drinks.tipCustom", desc: "drinks.tipCustomDesc", custom: true },
];

const DrinkGiftSheet = ({ open, onOpenChange, groupId, toUserId, toUserName, onSent }: Props) => {
  const { t, language } = useLanguage();
  const { items, loading } = useDrinkMenu(open ? groupId : undefined);
  const { sendDrinkGift } = useGiftDrink();
  const { balance, refetch: refetchBalance } = useCoinBalance();

  const [step, setStep] = useState<"pick" | "tip" | "confirm">("pick");
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [tipPct, setTipPct] = useState<number>(10);
  const [customTip, setCustomTip] = useState<number>(0);
  const [sending, setSending] = useState(false);

  const itemCoins = selectedItem ? Math.floor(selectedItem.price_vnd / 100) : 0;
  const tipCoins = tipPct > 0
    ? Math.round(itemCoins * tipPct / 100)
    : customTip;
  const totalCoins = itemCoins + tipCoins;

  const handleClose = () => {
    setStep("pick");
    setSelectedItem(null);
    setTipPct(10);
    setCustomTip(0);
    onOpenChange(false);
  };

  const handleSelectItem = (item: MenuItem) => {
    setSelectedItem(item);
    setStep("tip");
  };

  const handleSend = async () => {
    if (!selectedItem) return;
    setSending(true);
    const { error } = await sendDrinkGift(selectedItem.id, toUserId, tipPct, customTip);
    setSending(false);
    if (error) {
      toast.error(error.includes("Insufficient") ? t("drinks.insufficientCoins") : error);
      return;
    }
    refetchBalance();
    toast.success(t("drinks.sent"), { description: t("drinks.sentDesc") });
    onSent?.();
    handleClose();
  };

  const itemName = (item: MenuItem) =>
    language === "vi" && item.name_vi ? item.name_vi : item.name;

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-8 max-h-[85vh] overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-base font-display">
            {step === "pick"
              ? `${t("drinks.giftDrink")} → ${toUserName}`
              : step === "tip"
              ? t("drinks.tipTitle")
              : t("drinks.breakdown")}
          </SheetTitle>
        </SheetHeader>

        {/* Step 1: Pick drink */}
        {step === "pick" && (
          <div className="space-y-2">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : items.filter(i => i.available).length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">{t("drinks.noMenu")}</p>
            ) : (
              items.filter(i => i.available).map(item => (
                <button
                  key={item.id}
                  onClick={() => handleSelectItem(item)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors text-left"
                >
                  <div className="h-12 w-12 rounded-lg overflow-hidden bg-background shrink-0 flex items-center justify-center">
                    {item.image_url
                      ? <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                      : <span className="text-2xl">🧃</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground">{itemName(item)}</p>
                    <p className="text-xs text-muted-foreground">{item.price_vnd.toLocaleString("vi-VN")}đ · {Math.floor(item.price_vnd / 100)} pts</p>
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {/* Step 2: Pick tip */}
        {step === "tip" && selectedItem && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/10">
              <div className="h-10 w-10 rounded-lg overflow-hidden bg-background shrink-0 flex items-center justify-center">
                {selectedItem.image_url
                  ? <img src={selectedItem.image_url} alt={selectedItem.name} className="h-full w-full object-cover" />
                  : <span className="text-2xl">🧃</span>
                }
              </div>
              <div>
                <p className="font-medium text-sm">{itemName(selectedItem)}</p>
                <p className="text-xs text-muted-foreground">{itemCoins} pts</p>
              </div>
            </div>

            <div className="space-y-2">
              {TIP_OPTIONS.map(opt => {
                const active = opt.custom ? tipPct === 0 : tipPct === opt.pct;
                return (
                  <button
                    key={opt.pct + (opt.custom ? "c" : "")}
                    onClick={() => setTipPct(opt.custom ? 0 : opt.pct)}
                    className={cn(
                      "w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-colors",
                      active ? "border-primary bg-primary/5" : "border-border bg-secondary"
                    )}
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium">{t(opt.label)}{!opt.custom && ` (+${opt.pct}%)`}</p>
                      <p className="text-xs text-muted-foreground">{t(opt.desc)}</p>
                    </div>
                    {!opt.custom && (
                      <span className="text-xs font-mono text-primary mt-0.5">
                        +{Math.round(itemCoins * opt.pct / 100)} pts
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {tipPct === 0 && (
              <div className="flex items-center gap-2 mt-1">
                <button onClick={() => setCustomTip(Math.max(0, customTip - 10))} className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center">
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <Input
                  type="number"
                  min={0}
                  value={customTip}
                  onChange={e => setCustomTip(Math.max(0, parseInt(e.target.value) || 0))}
                  className="text-center rounded-xl h-8 flex-1"
                />
                <button onClick={() => setCustomTip(customTip + 10)} className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center">
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            <Button onClick={() => setStep("confirm")} className="w-full rounded-xl h-11 mt-2">
              {t("common.continue")}
            </Button>
            <Button variant="ghost" onClick={() => setStep("pick")} className="w-full rounded-xl">
              {t("common.back")}
            </Button>
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === "confirm" && selectedItem && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="flex justify-between items-center px-4 py-3 border-b border-border">
                <span className="text-sm text-muted-foreground">{t("drinks.item")}</span>
                <span className="text-sm font-medium">{selectedItem.emoji} {itemName(selectedItem)} · {itemCoins} pts</span>
              </div>
              <div className="flex justify-between items-center px-4 py-3 border-b border-border">
                <span className="text-sm text-muted-foreground">{t("drinks.tip")}</span>
                <span className="text-sm font-medium text-primary">
                  {tipPct > 0 ? `+${tipPct}%` : t("drinks.tipCustom")} · +{tipCoins} pts
                </span>
              </div>
              <div className="flex justify-between items-center px-4 py-3 bg-primary/5">
                <span className="text-sm font-semibold">{t("drinks.total")}</span>
                <span className="text-sm font-bold text-primary">{totalCoins} pts</span>
              </div>
            </div>

            {balance !== null && balance < totalCoins && (
              <p className="text-xs text-destructive text-center">{t("drinks.insufficientCoins")} ({balance} pts)</p>
            )}

            <Button
              onClick={handleSend}
              disabled={sending || (balance !== null && balance < totalCoins)}
              className="w-full rounded-xl h-11"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {t("drinks.confirm")}
            </Button>
            <Button variant="ghost" onClick={() => setStep("tip")} className="w-full rounded-xl">
              {t("common.back")}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default DrinkGiftSheet;
