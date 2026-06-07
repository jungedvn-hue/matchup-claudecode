import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Loader2, MapPin, Clock, Users, Coffee, Minus, Plus,
  ShoppingCart, Copy, Building2, AlertCircle, Truck, CheckCircle2, Gift,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { useLanguage } from "@/i18n/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { useVenue } from "@/hooks/useVenues";
import { useVenueSession } from "@/hooks/useVenueSessions";
import { useVenueServices } from "@/hooks/useVenueServices";
import { createVenueOrder, type CartLine, type PaymentMethod } from "@/hooks/useVenueOrders";
import DrinkGiftSheet from "@/components/DrinkGiftSheet";

const fmtMoney = (n: number) => `${Math.round(n).toLocaleString("vi-VN")}đ`;
const fmtTime = (iso: string) => new Date(iso).toLocaleString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

const buildVietQRUrl = (bank: string, acc: string, amount: number, note: string) => {
  const params = new URLSearchParams();
  if (amount) params.set("amount", String(amount));
  if (note) params.set("addInfo", note);
  return `https://img.vietqr.io/image/${encodeURIComponent(bank)}-${encodeURIComponent(acc)}-compact2.jpg?${params.toString()}`;
};

const VenueSessionPage = () => {
  const navigate = useNavigate();
  const { venueId, sessionId } = useParams<{ venueId: string; sessionId: string }>();
  const { t } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: venue, loading: venueLoading } = useVenue(venueId);
  const { session, members, joined, loading: sessionLoading, join } = useVenueSession(sessionId);
  const { items: services, loading: servicesLoading } = useVenueServices(venueId);

  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [courtRef, setCourtRef] = useState("");
  const [note, setNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [placing, setPlacing] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Record<string, { display_name: string | null; avatar_url: string | null }>>({});
  const [giftTarget, setGiftTarget] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    const ids = members.map(m => m.user_id);
    if (ids.length === 0) { setProfiles({}); return; }
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any).from("profiles").select("user_id, display_name, avatar_url").in("user_id", ids);
      if (cancelled) return;
      const map: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
      (data ?? []).forEach((p: any) => { map[p.user_id] = { display_name: p.display_name, avatar_url: p.avatar_url }; });
      setProfiles(map);
    })();
    return () => { cancelled = true; };
  }, [members]);

  const published = useMemo(() => services.filter(s => s.is_published), [services]);
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

  if (venueLoading || sessionLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }
  if (!venue || !session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 text-center">
        <AlertCircle className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">{t("venueSession.notFound")}</p>
        <Button variant="outline" onClick={() => navigate(-1)}>{t("common.back")}</Button>
      </div>
    );
  }

  const handleJoin = async () => {
    const { error } = await join();
    if (error) toast({ title: t("auth.toast.error"), description: error.message, variant: "destructive" });
    else toast({ title: t("venueSession.joined") });
  };

  const openCheckout = () => {
    if (!joined) { toast({ title: t("venueSession.joinFirst") }); return; }
    if (cartCount === 0) return;
    setCourtRef(session.court_ref ?? "");
    setCartOpen(false);
    setCheckoutOpen(true);
  };

  const placeOrder = async () => {
    if (!user || lines.length === 0) return;
    setPlacing(true);
    const { data, error } = await createVenueOrder(user.id, {
      venue_id: venue.id,
      session_id: session.id,
      court_ref: courtRef.trim() || null,
      payment_method: paymentMethod,
      note: note.trim() || null,
      lines,
    });
    setPlacing(false);
    if (error || !data) {
      toast({ title: t("auth.toast.error"), description: error?.message, variant: "destructive" });
      return;
    }
    setPlacedOrderId(data.id);
    setCart({});
    setNote("");
    if (paymentMethod === "cash") {
      setCheckoutOpen(false);
      toast({ title: t("venueSession.orderPlaced") });
      navigate("/my-orders");
    }
    // QR: keep sheet open to show the VietQR block (placedOrderId set).
  };

  const hasBank = venue.bank_name && venue.bank_account_number && venue.bank_account_holder;
  const refNote = placedOrderId ? `MPVN ${placedOrderId.slice(0, 8).toUpperCase()}` : "";
  const qrUrl = hasBank && placedOrderId ? buildVietQRUrl(venue.bank_name!, venue.bank_account_number!, total || lines.reduce((s, l) => s + l.unit_price * l.qty, 0), refNote) : null;
  const copy = (text: string, label: string) => { navigator.clipboard.writeText(text); toast({ title: `${label}: ${text}` }); };

  return (
    <div className="pb-28 min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button onClick={() => navigate(-1)} className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-display font-bold text-foreground truncate">{session.title}</h1>
            <p className="text-[11px] text-muted-foreground truncate">{venue.name}</p>
          </div>
          {session.status !== "open" && <Badge variant="secondary" className="text-[9px]">{t(`venueSession.status.${session.status}`)}</Badge>}
        </div>
      </div>

      <div className="px-4 pt-4 max-w-2xl mx-auto space-y-4">
        {/* Session info */}
        <Card className="p-4 shadow-card space-y-2">
          <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span>{fmtTime(session.starts_at)}{session.ends_at ? ` – ${new Date(session.ends_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}` : ""}</span>
          </div>
          {session.court_ref && (
            <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" /> <span>{t("venueSession.court")}: {session.court_ref}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
            <Users className="h-3.5 w-3.5 shrink-0" /> <span>{members.length} {t("venueSession.members")}</span>
          </div>
          {!joined ? (
            <Button onClick={handleJoin} disabled={session.status !== "open"} className="w-full mt-1 gap-1.5">
              <Users className="h-4 w-4" /> {t("venueSession.join")}
            </Button>
          ) : (
            <div className="flex items-center gap-1.5 text-[12px] text-emerald-600 dark:text-emerald-400 font-medium pt-1">
              <CheckCircle2 className="h-4 w-4" /> {t("venueSession.youJoined")}
            </div>
          )}
        </Card>

        {/* Players — gift a drink to a co-player, delivered to this court */}
        {members.length > 0 && (
          <div>
            <h2 className="text-sm font-display font-bold text-foreground mb-2 flex items-center gap-1.5">
              <Users className="h-4 w-4 text-primary" /> {t("venueSession.players")}
            </h2>
            <Card className="shadow-card overflow-hidden">
              {members.map((m, i) => {
                const isMe = m.user_id === user?.id;
                const name = profiles[m.user_id]?.display_name || t("common.unknown");
                return (
                  <div key={m.user_id} className={`flex items-center gap-3 px-3.5 py-2.5 ${i < members.length - 1 ? "border-b border-border" : ""}`}>
                    <div className="h-8 w-8 rounded-full overflow-hidden bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                      {profiles[m.user_id]?.avatar_url
                        ? <img src={profiles[m.user_id]!.avatar_url!} alt={name} className="h-full w-full object-cover" />
                        : name[0]?.toUpperCase()}
                    </div>
                    <p className="flex-1 text-sm font-medium text-foreground truncate">{name}{isMe ? ` (${t("common.you")})` : ""}</p>
                    {!isMe && (
                      <button
                        onClick={() => setGiftTarget({ id: m.user_id, name })}
                        className="h-7 px-2.5 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 text-[10px] font-semibold hover:bg-orange-500/20 flex items-center gap-1 shrink-0"
                      >
                        <Gift className="h-3 w-3" /> {t("drinkGift.short")}
                      </button>
                    )}
                  </div>
                );
              })}
            </Card>
          </div>
        )}

        {/* Menu */}
        <div>
          <h2 className="text-sm font-display font-bold text-foreground mb-2 flex items-center gap-1.5">
            <Coffee className="h-4 w-4 text-primary" /> {t("venueSession.menu")}
          </h2>
          {servicesLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : published.length === 0 ? (
            <Card className="p-6 text-center text-sm text-muted-foreground shadow-card">{t("venueSession.noMenu")}</Card>
          ) : (
            <div className="space-y-2">
              {published.map((s, i) => (
                <motion.div key={s.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                  <Card className="p-3 shadow-card flex items-center gap-3">
                    {s.image_url ? (
                      <div className="h-12 w-12 rounded-xl overflow-hidden bg-secondary shrink-0">
                        <img src={s.image_url} alt={s.name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <Coffee className="h-5 w-5" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-sm font-semibold text-foreground truncate">{s.name}</h3>
                        {!s.deliverable && <Badge variant="outline" className="text-[9px] gap-0.5"><Truck className="h-2.5 w-2.5" />{t("venueService.pickupOnly")}</Badge>}
                      </div>
                      <p className="text-[12px] text-primary font-semibold tabular-nums mt-0.5">{fmtMoney(s.price)}</p>
                      {s.description && <p className="text-[11px] text-muted-foreground line-clamp-1">{s.description}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {(cart[s.id] ?? 0) > 0 && (
                        <>
                          <button onClick={() => dec(s.id)} className="h-7 w-7 rounded-lg bg-secondary flex items-center justify-center hover:bg-secondary/70"><Minus className="h-3.5 w-3.5" /></button>
                          <span className="text-sm font-bold tabular-nums w-4 text-center">{cart[s.id]}</span>
                        </>
                      )}
                      <button onClick={() => inc(s.id)} className="h-7 w-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90"><Plus className="h-3.5 w-3.5" /></button>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cart bar */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-40 p-4 bg-background/95 backdrop-blur-lg border-t border-border">
          <div className="max-w-2xl mx-auto">
            <Button onClick={() => setCartOpen(true)} className="w-full h-12 gap-2 justify-between px-4">
              <span className="inline-flex items-center gap-2"><ShoppingCart className="h-4 w-4" /> {cartCount} {t("venueSession.items")}</span>
              <span className="tabular-nums font-bold">{fmtMoney(total)}</span>
            </Button>
          </div>
        </div>
      )}

      {/* Cart drawer */}
      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh] overflow-y-auto">
          <SheetHeader><SheetTitle>{t("venueSession.cart")}</SheetTitle></SheetHeader>
          <div className="space-y-2 py-3">
            {lines.map(l => (
              <div key={l.service_id} className="flex items-center gap-3 text-sm">
                <span className="flex-1 truncate">{l.name}</span>
                <button onClick={() => dec(l.service_id)} className="h-6 w-6 rounded bg-secondary flex items-center justify-center"><Minus className="h-3 w-3" /></button>
                <span className="tabular-nums w-4 text-center">{l.qty}</span>
                <button onClick={() => inc(l.service_id)} className="h-6 w-6 rounded bg-secondary flex items-center justify-center"><Plus className="h-3 w-3" /></button>
                <span className="tabular-nums w-20 text-right font-medium">{fmtMoney(l.unit_price * l.qty)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2 border-t border-border font-bold">
              <span>{t("venueSession.total")}</span>
              <span className="tabular-nums text-primary">{fmtMoney(total)}</span>
            </div>
          </div>
          <SheetFooter>
            <Button onClick={openCheckout} className="w-full">{t("venueSession.checkout")}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Checkout sheet */}
      <Sheet open={checkoutOpen} onOpenChange={(o) => { setCheckoutOpen(o); if (!o) setPlacedOrderId(null); }}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[88vh] overflow-y-auto">
          <SheetHeader><SheetTitle>{t("venueSession.checkout")}</SheetTitle></SheetHeader>

          {!placedOrderId ? (
            <div className="space-y-3 py-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">{t("venueSession.courtLabel")}</label>
                <Input value={courtRef} onChange={(e) => setCourtRef(e.target.value)} placeholder={t("venueSession.courtPh")} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">{t("venueSession.noteLabel")}</label>
                <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("venueSession.notePh")} className="resize-none" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">{t("venueSession.payment")}</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["cash", "qr"] as PaymentMethod[]).map(m => (
                    <button key={m} onClick={() => setPaymentMethod(m)}
                      className={`h-10 rounded-xl border text-sm font-medium transition-colors ${paymentMethod === m ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary/40 text-muted-foreground"}`}>
                      {t(`venueSession.pay.${m}`)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between pt-1 font-bold">
                <span>{t("venueSession.total")}</span>
                <span className="tabular-nums text-primary">{fmtMoney(total)}</span>
              </div>
              <Button onClick={placeOrder} disabled={placing} className="w-full">
                {placing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {paymentMethod === "qr" ? t("venueSession.placeAndPay") : t("venueSession.placeOrder")}
              </Button>
            </div>
          ) : (
            // QR payment view (cash navigates away immediately)
            <div className="space-y-3 py-3">
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
                    <button onClick={() => copy(venue.bank_account_number!, t("venue.bank.account"))} className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-secondary">
                      <span className="text-[11px] text-muted-foreground">{venue.bank_name} · {venue.bank_account_holder}</span>
                      <span className="text-sm font-bold tabular-nums inline-flex items-center gap-1.5">{venue.bank_account_number} <Copy className="h-3 w-3 opacity-50" /></span>
                    </button>
                    <div className="flex items-center justify-between px-3 py-2.5">
                      <span className="text-[11px] text-muted-foreground">{t("payment.refNote")}</span>
                      <span className="text-sm font-mono font-bold inline-flex items-center gap-1.5">{refNote}</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-center text-muted-foreground inline-flex items-center gap-1 justify-center w-full">
                    <Building2 className="h-3 w-3" /> {t("venueSession.qrHint")}
                  </p>
                </>
              )}
              <Button onClick={() => { setCheckoutOpen(false); setPlacedOrderId(null); navigate("/my-orders"); }} className="w-full">
                {t("venueSession.doneViewOrders")}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Gift a drink to a co-player → delivered to this session's court */}
      {giftTarget && (
        <DrinkGiftSheet
          open={!!giftTarget}
          onOpenChange={(o) => { if (!o) setGiftTarget(null); }}
          recipientId={giftTarget.id}
          recipientName={giftTarget.name}
          session={{ sessionId: session.id, venueId: venue.id, courtRef: session.court_ref }}
        />
      )}
    </div>
  );
};

export default VenueSessionPage;
