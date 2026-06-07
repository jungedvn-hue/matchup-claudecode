import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Loader2, Coffee, Minus, Plus, ShoppingCart, Copy, Building2, AlertCircle, Truck,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { useVenue } from "@/hooks/useVenues";
import { useVenueServices } from "@/hooks/useVenueServices";
import { createVenueOrder, type CartLine, type PaymentMethod } from "@/hooks/useVenueOrders";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  groupId: string;
  venueId: string;
  featuredIds?: string[];
}

const fmtMoney = (n: number) => `${Math.round(n).toLocaleString("vi-VN")}đ`;

const buildVietQRUrl = (bank: string, acc: string, amount: number, note: string) => {
  const params = new URLSearchParams();
  if (amount) params.set("amount", String(amount));
  if (note) params.set("addInfo", note);
  return `https://img.vietqr.io/image/${encodeURIComponent(bank)}-${encodeURIComponent(acc)}-compact2.jpg?${params.toString()}`;
};

const GroupOrderSheet = ({ open, onOpenChange, groupId, venueId, featuredIds }: Props) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { data: venue } = useVenue(open ? venueId : undefined);
  const { items: services, loading: servicesLoading } = useVenueServices(open ? venueId : undefined);

  const [cart, setCart] = useState<Record<string, number>>({});
  const [step, setStep] = useState<"menu" | "checkout">("menu");
  const [note, setNote] = useState("");
  const [courtRef, setCourtRef] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [placing, setPlacing] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);

  const published = useMemo(() => {
    const pub = services.filter(s => s.is_published);
    return featuredIds && featuredIds.length > 0 ? pub.filter(s => featuredIds.includes(s.id)) : pub;
  }, [services, featuredIds]);
  const lines: CartLine[] = useMemo(() =>
    Object.entries(cart)
      .filter(([, q]) => q > 0)
      .map(([id, qty]) => {
        const s = services.find(x => x.id === id)!;
        return { service_id: id, name: s.name, unit_price: s.price, qty };
      }), [cart, services]);
  const total = lines.reduce((s, l) => s + l.unit_price * l.qty, 0);
  const cartCount = lines.reduce((s, l) => s + l.qty, 0);

  const inc = (id: string) => setCart(c => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
  const dec = (id: string) => setCart(c => ({ ...c, [id]: Math.max(0, (c[id] ?? 0) - 1) }));

  const reset = () => {
    setCart({}); setNote(""); setCourtRef(""); setPaymentMethod("cash");
    setStep("menu"); setPlacedOrderId(null);
  };
  const handleOpenChange = (o: boolean) => { if (!o) reset(); onOpenChange(o); };

  const placeOrder = async () => {
    if (!user || lines.length === 0) return;
    setPlacing(true);
    const { data, error } = await createVenueOrder(user.id, {
      venue_id: venueId,
      group_id: groupId,
      court_ref: courtRef.trim() || null,
      payment_method: paymentMethod,
      note: note.trim() || null,
      lines,
    });
    setPlacing(false);
    if (error || !data) {
      toast.error(error?.message ?? t("auth.toast.error"));
      return;
    }
    if (paymentMethod === "cash") {
      toast.success(t("groupOrder.placed"));
      handleOpenChange(false);
      navigate("/my-orders");
      return;
    }
    // QR: keep sheet open to show the VietQR block.
    setPlacedOrderId(data.id);
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
            <Coffee className="h-4 w-4 text-primary" />
            {step === "menu" ? t("groupOrder.title") : t("groupOrder.checkout")}
          </SheetTitle>
          {venue && <p className="text-[11px] text-muted-foreground -mt-1">{venue.name}</p>}
        </SheetHeader>

        {/* Step: menu */}
        {step === "menu" && (
          <div className="space-y-2">
            {servicesLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
            ) : published.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">{t("groupOrder.noMenu")}</p>
            ) : (
              published.map(s => (
                <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary">
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
                    <div className="flex items-center gap-1.5">
                      <p className="font-medium text-sm text-foreground truncate">{s.name}</p>
                      {!s.deliverable && <Badge variant="outline" className="text-[9px] gap-0.5"><Truck className="h-2.5 w-2.5" />{t("venueService.pickupOnly")}</Badge>}
                    </div>
                    <p className="text-[12px] text-primary font-semibold tabular-nums mt-0.5">{fmtMoney(s.price)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {(cart[s.id] ?? 0) > 0 && (
                      <>
                        <button onClick={() => dec(s.id)} className="h-7 w-7 rounded-lg bg-background flex items-center justify-center hover:bg-background/70"><Minus className="h-3.5 w-3.5" /></button>
                        <span className="text-sm font-bold tabular-nums w-4 text-center">{cart[s.id]}</span>
                      </>
                    )}
                    <button onClick={() => inc(s.id)} className="h-7 w-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90"><Plus className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              ))
            )}

            {cartCount > 0 && (
              <SheetFooter className="pt-2">
                <Button onClick={() => setStep("checkout")} className="w-full h-12 gap-2 justify-between px-4 rounded-xl">
                  <span className="inline-flex items-center gap-2"><ShoppingCart className="h-4 w-4" /> {cartCount} {t("groupOrder.items")}</span>
                  <span className="tabular-nums font-bold">{fmtMoney(total)}</span>
                </Button>
              </SheetFooter>
            )}
          </div>
        )}

        {/* Step: checkout */}
        {step === "checkout" && !placedOrderId && (
          <div className="space-y-3">
            <div className="rounded-xl border border-border divide-y divide-border/60 overflow-hidden">
              {lines.map(l => (
                <div key={l.service_id} className="flex items-center gap-3 text-sm px-3 py-2.5">
                  <span className="flex-1 truncate">{l.name}</span>
                  <button onClick={() => dec(l.service_id)} className="h-6 w-6 rounded bg-secondary flex items-center justify-center"><Minus className="h-3 w-3" /></button>
                  <span className="tabular-nums w-4 text-center">{l.qty}</span>
                  <button onClick={() => inc(l.service_id)} className="h-6 w-6 rounded bg-secondary flex items-center justify-center"><Plus className="h-3 w-3" /></button>
                  <span className="tabular-nums w-20 text-right font-medium">{fmtMoney(l.unit_price * l.qty)}</span>
                </div>
              ))}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium">{t("groupOrder.courtLabel")}</label>
              <Input value={courtRef} onChange={(e) => setCourtRef(e.target.value)} placeholder={t("groupOrder.courtPh")} className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">{t("groupOrder.noteLabel")}</label>
              <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("groupOrder.notePh")} className="resize-none rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">{t("groupOrder.payment")}</label>
              <div className="grid grid-cols-2 gap-2">
                {(["cash", "qr"] as PaymentMethod[]).map(m => (
                  <button key={m} onClick={() => setPaymentMethod(m)}
                    className={`h-10 rounded-xl border text-sm font-medium transition-colors ${paymentMethod === m ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary/40 text-muted-foreground"}`}>
                    {t(`groupOrder.pay.${m}`)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 font-bold">
              <span>{t("groupOrder.total")}</span>
              <span className="tabular-nums text-primary">{fmtMoney(total)}</span>
            </div>
            <Button onClick={placeOrder} disabled={placing} className="w-full rounded-xl h-11">
              {placing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {paymentMethod === "qr" ? t("groupOrder.placeAndPay") : t("groupOrder.placeOrder")}
            </Button>
            <Button variant="ghost" onClick={() => setStep("menu")} className="w-full rounded-xl">{t("common.back")}</Button>
          </div>
        )}

        {/* Step: QR payment */}
        {step === "checkout" && placedOrderId && (
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
                  <Building2 className="h-3 w-3" /> {t("groupOrder.qrHint")}
                </p>
              </>
            )}
            <Button onClick={() => { handleOpenChange(false); navigate("/my-orders"); }} className="w-full rounded-xl h-11">
              {t("groupOrder.doneViewOrders")}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default GroupOrderSheet;
