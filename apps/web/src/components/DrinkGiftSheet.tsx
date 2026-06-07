import { useMemo, useState } from "react";
import { Loader2, Coffee, Minus, Plus, Copy, Building2, AlertCircle, MapPin, Gift } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { useVenue } from "@/hooks/useVenues";
import { useVenueServices } from "@/hooks/useVenueServices";
import { createVenueOrder } from "@/hooks/useVenueOrders";
import { toast } from "sonner";

export interface GiftSession {
  sessionId: string;
  venueId: string;
  courtRef: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  recipientId: string;
  recipientName: string;
  session: GiftSession;
  onSent?: () => void;
}

const fmtMoney = (n: number) => `${Math.round(n).toLocaleString("vi-VN")}đ`;

const buildVietQRUrl = (bank: string, acc: string, amount: number, note: string) => {
  const params = new URLSearchParams();
  if (amount) params.set("amount", String(amount));
  if (note) params.set("addInfo", note);
  return `https://img.vietqr.io/image/${encodeURIComponent(bank)}-${encodeURIComponent(acc)}-compact2.jpg?${params.toString()}`;
};

const DrinkGiftSheet = ({ open, onOpenChange, recipientId, recipientName, session, onSent }: Props) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { data: venue } = useVenue(open ? session.venueId : undefined);
  const { items: services, loading } = useVenueServices(open ? session.venueId : undefined);

  const [step, setStep] = useState<"pick" | "confirm">("pick");
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [placing, setPlacing] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);

  const published = useMemo(() => services.filter(s => s.is_published), [services]);
  const selected = services.find(s => s.id === serviceId) ?? null;
  const total = selected ? selected.price * qty : 0;

  const reset = () => { setStep("pick"); setServiceId(null); setQty(1); setPlacedOrderId(null); };
  const handleOpenChange = (o: boolean) => { if (!o) reset(); onOpenChange(o); };

  const handlePick = (id: string) => { setServiceId(id); setQty(1); setStep("confirm"); };

  const handleGift = async () => {
    if (!user || !selected) return;
    setPlacing(true);
    const { data, error } = await createVenueOrder(user.id, {
      venue_id: session.venueId,
      session_id: session.sessionId,
      recipient_id: recipientId,
      court_ref: session.courtRef,
      payment_method: "qr",
      note: `🎁 ${t("drinkGift.forLabel")} ${recipientName}`,
      lines: [{ service_id: selected.id, name: selected.name, unit_price: selected.price, qty }],
    });
    setPlacing(false);
    if (error || !data) { toast.error(error?.message ?? t("auth.toast.error")); return; }
    setPlacedOrderId(data.id);
    onSent?.();
  };

  const hasBank = venue?.bank_name && venue?.bank_account_number && venue?.bank_account_holder;
  const refNote = placedOrderId ? `MPVN ${placedOrderId.slice(0, 8).toUpperCase()}` : "";
  const qrUrl = hasBank && placedOrderId ? buildVietQRUrl(venue!.bank_name!, venue!.bank_account_number!, total, refNote) : null;
  const copy = (text: string, label: string) => { navigator.clipboard.writeText(text); toast.success(`${label}: ${text}`); };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-8 max-h-[88vh] overflow-y-auto">
        <SheetHeader className="mb-3">
          <SheetTitle className="text-base font-display inline-flex items-center gap-2">
            <Gift className="h-4 w-4 text-orange-500" />
            {placedOrderId ? t("drinkGift.payTitle") : `${t("drinkGift.title")} → ${recipientName}`}
          </SheetTitle>
          <p className="text-[11px] text-muted-foreground -mt-1 inline-flex items-center gap-1">
            <MapPin className="h-3 w-3" /> {venue?.name}{session.courtRef ? ` · ${t("venueSession.court")} ${session.courtRef}` : ""}
          </p>
        </SheetHeader>

        {/* Step: pick a drink */}
        {step === "pick" && (
          <div className="space-y-2">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
            ) : published.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">{t("drinkGift.noMenu")}</p>
            ) : (
              published.map(s => (
                <button key={s.id} onClick={() => handlePick(s.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors text-left">
                  {s.image_url ? (
                    <div className="h-12 w-12 rounded-lg overflow-hidden bg-background shrink-0">
                      <img src={s.image_url} alt={s.name} className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <Coffee className="h-5 w-5" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">{s.name}</p>
                    <p className="text-[12px] text-primary font-semibold tabular-nums mt-0.5">{fmtMoney(s.price)}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {/* Step: confirm + qty */}
        {step === "confirm" && selected && !placedOrderId && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/10">
              {selected.image_url ? (
                <div className="h-12 w-12 rounded-lg overflow-hidden bg-background shrink-0">
                  <img src={selected.image_url} alt={selected.name} className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Coffee className="h-5 w-5" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{selected.name}</p>
                <p className="text-[12px] text-primary font-semibold tabular-nums">{fmtMoney(selected.price)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => setQty(q => Math.max(1, q - 1))} className="h-7 w-7 rounded-lg bg-secondary flex items-center justify-center"><Minus className="h-3.5 w-3.5" /></button>
                <span className="text-sm font-bold tabular-nums w-4 text-center">{qty}</span>
                <button onClick={() => setQty(q => q + 1)} className="h-7 w-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center"><Plus className="h-3.5 w-3.5" /></button>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground text-center">{t("drinkGift.deliverHint", { name: recipientName, court: session.courtRef ?? "?" })}</p>

            <div className="flex items-center justify-between pt-1 font-bold">
              <span>{t("groupOrder.total")}</span>
              <span className="tabular-nums text-primary">{fmtMoney(total)}</span>
            </div>
            <Button onClick={handleGift} disabled={placing} className="w-full rounded-xl h-11">
              {placing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("drinkGift.payAndGift")}
            </Button>
            <Button variant="ghost" onClick={() => setStep("pick")} className="w-full rounded-xl">{t("common.back")}</Button>
          </div>
        )}

        {/* Step: VietQR payment */}
        {placedOrderId && (
          <div className="space-y-3">
            {!hasBank ? (
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-muted-foreground">{t("payment.noBankDesc")}</p>
              </div>
            ) : (
              <>
                <div className="bg-white rounded-2xl p-3 flex items-center justify-center">
                  <img src={qrUrl!} alt="VietQR" className="w-full max-w-[260px] aspect-square object-contain" />
                </div>
                <div className="rounded-xl bg-secondary/40 border border-border divide-y divide-border/60 overflow-hidden text-left">
                  <button onClick={() => copy(venue!.bank_account_number!, t("venue.bank.account"))} className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-secondary">
                    <span className="text-[11px] text-muted-foreground">{venue!.bank_name} · {venue!.bank_account_holder}</span>
                    <span className="text-sm font-bold tabular-nums inline-flex items-center gap-1.5">{venue!.bank_account_number} <Copy className="h-3 w-3 opacity-50" /></span>
                  </button>
                  <button onClick={() => copy(String(total), t("payment.amount"))} className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-secondary">
                    <span className="text-[11px] text-muted-foreground">{t("payment.amount")}</span>
                    <span className="text-sm font-bold text-primary tabular-nums inline-flex items-center gap-1.5">{fmtMoney(total)} <Copy className="h-3 w-3 opacity-50" /></span>
                  </button>
                  <div className="flex items-center justify-between px-3 py-2.5">
                    <span className="text-[11px] text-muted-foreground">{t("payment.refNote")}</span>
                    <span className="text-sm font-mono font-bold inline-flex items-center gap-1.5">{refNote}</span>
                  </div>
                </div>
                <p className="text-[10px] text-center text-muted-foreground inline-flex items-center gap-1 justify-center w-full">
                  <Building2 className="h-3 w-3" /> {t("drinkGift.qrHint", { name: recipientName })}
                </p>
              </>
            )}
            <Button onClick={() => handleOpenChange(false)} className="w-full rounded-xl h-11">{t("common.close")}</Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default DrinkGiftSheet;
