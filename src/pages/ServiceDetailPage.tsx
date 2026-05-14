import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Loader2, MapPin, Star, Coins, ShoppingBag, Calendar as CalendarIcon,
  Plus, Minus, ImageOff, Store as StoreIcon, CheckCircle2, Sparkles,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useCoinBalance, formatCoin, formatVnd, COIN_TO_VND } from "@/hooks/useCoin";
import type { Product, Store } from "@/hooks/useStores";
import { toast } from "sonner";

const sb = supabase as unknown as { from: (t: string) => any; rpc: (fn: string, args?: any) => any };

const SERVICE_CATEGORIES = ["coaching", "repair", "physio", "fitness"];

const ServiceDetailPage = () => {
  const { serviceId } = useParams<{ serviceId: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { balance, refetch: refetchBalance } = useCoinBalance();

  const [product, setProduct] = useState<Product | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);

  const [activeImg, setActiveImg] = useState(0);
  const [qty, setQty] = useState(1);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!serviceId) return;
    (async () => {
      setLoading(true);
      const { data: p } = await sb.from("products").select("*").eq("id", serviceId).maybeSingle();
      if (!p) { setLoading(false); return; }
      setProduct(p as Product);
      const { data: s } = await sb.from("stores").select("*").eq("id", p.store_id).maybeSingle();
      setStore(s as Store);
      setLoading(false);
    })();
  }, [serviceId]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary opacity-40" /></div>;
  }

  if (!product || !store) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center gap-3">
        <ImageOff className="h-12 w-12 text-muted-foreground opacity-30" />
        <p className="text-sm text-muted-foreground">{t("service.notFound")}</p>
        <Button onClick={() => navigate("/marketplace")}>{t("service.backToMarketplace")}</Button>
      </div>
    );
  }

  const isService = SERVICE_CATEGORIES.includes(product.category);
  const isOwner = user?.id === store.owner_user_id;
  const hasPrice = product.price && product.price > 0;
  const unitCoins = hasPrice ? Math.ceil(product.price! / COIN_TO_VND) : 0;
  const totalCoins = unitCoins * qty;
  const canAfford = (balance?.balance ?? 0) >= totalCoins;
  const images = (product.images && product.images.length > 0) ? product.images : [];

  const handleSubmit = async () => {
    if (!user) { toast.error(t("service.signInFirst")); navigate("/login"); return; }
    if (isOwner) { toast.error(t("service.cannotBuyOwn")); return; }

    if (!isService && hasPrice) {
      if (!canAfford) { toast.error(t("gift.insufficient")); return; }
      setSubmitting(true);
      const { data, error } = await sb.rpc("fn_purchase_with_coin", {
        p_product_id: product.id, p_quantity: qty,
        p_message: message.trim() || null, p_phone: phone.trim() || null,
      });
      setSubmitting(false);
      if (error) { toast.error(error.message); return; }
      if (data) {
        setSuccess(true); refetchBalance();
        setTimeout(() => navigate("/my-tickets"), 2000);
      }
      return;
    }

    setSubmitting(true);
    const { data: profile } = await sb.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle();
    const playerName = (profile as any)?.display_name ?? "Player";
    const { error } = await sb.from("bookings").insert({
      store_id: store.id, product_id: product.id, player_user_id: user.id,
      player_name: playerName, player_phone: phone.trim() || null, message: message.trim() || null,
      scheduled_date: date || null, scheduled_time: time || null,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    setSuccess(true);
    setTimeout(() => navigate("/my-tickets"), 2000);
  };

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center gap-3">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="h-20 w-20 rounded-full bg-emerald-500/15 flex items-center justify-center">
          <CheckCircle2 className="h-10 w-10 text-emerald-500" />
        </motion.div>
        <h2 className="text-xl font-display font-bold text-foreground">{!isService && hasPrice ? t("service.purchased") : t("service.bookingSent")}</h2>
        <p className="text-sm text-muted-foreground">{t("service.viewInTickets")}</p>
      </div>
    );
  }

  return (
    <div className="pb-28 min-h-screen">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-base font-display font-bold text-foreground truncate">{product.name}</h1>
        </div>
      </div>

      <div className="px-4 pt-4 max-w-2xl mx-auto space-y-4">
        <Card className="shadow-card overflow-hidden">
          <div className="aspect-square bg-secondary/30 flex items-center justify-center">
            {images[activeImg] ? (
              <img src={images[activeImg]} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <ImageOff className="h-16 w-16 text-muted-foreground opacity-20" />
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-1.5 p-2 overflow-x-auto">
              {images.map((img, i) => (
                <button key={i} onClick={() => setActiveImg(i)} className={`h-14 w-14 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${i === activeImg ? "border-primary" : "border-transparent opacity-60"}`}>
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </Card>

        <div>
          <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">{t(`store.cat.${product.category}`)}</p>
          <h2 className="text-xl font-display font-bold text-foreground mt-1">{product.name}</h2>
          {hasPrice ? (
            <div className="flex items-baseline gap-3 mt-2 flex-wrap">
              <p className="text-2xl font-display font-bold text-foreground">{formatVnd(product.price!)}</p>
              <p className="text-sm font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <Coins className="h-3.5 w-3.5" /> {formatCoin(unitCoins)} {t("wallet.coins")}
              </p>
            </div>
          ) : product.price_display ? (
            <p className="text-lg font-semibold text-foreground mt-2">{product.price_display}</p>
          ) : (
            <p className="text-sm text-muted-foreground mt-2">{t("service.contactForPrice")}</p>
          )}
        </div>

        <button onClick={() => navigate(`/store/${store.id}`)} className="w-full">
          <Card className="p-3 shadow-card flex items-center gap-3 hover:bg-secondary/50 transition-colors">
            <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
              {store.logo_url ? (
                <img src={store.logo_url} alt={store.name} className="w-full h-full object-cover" />
              ) : (
                <StoreIcon className="h-5 w-5 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-semibold text-foreground truncate">{store.name}</p>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                {store.rating != null && (
                  <span className="flex items-center gap-0.5"><Star className="h-3 w-3 fill-amber-500 text-amber-500" /> {store.rating.toFixed(1)}</span>
                )}
                {store.address && <span className="flex items-center gap-1 truncate"><MapPin className="h-3 w-3" /> {store.address}</span>}
              </div>
            </div>
          </Card>
        </button>

        {product.description && (
          <Card className="p-4 shadow-card">
            <h3 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2">{t("service.about")}</h3>
            <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-line">{product.description}</p>
          </Card>
        )}

        {!isService && hasPrice && (
          <Card className="p-3 shadow-card flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">{t("service.quantity")}</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center hover:bg-secondary/70 transition-colors">
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-10 text-center font-bold tabular-nums">{qty}</span>
              <button onClick={() => setQty(Math.min(99, qty + 1))} className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center hover:bg-secondary/70 transition-colors">
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </Card>
        )}

        {isService && (
          <Card className="p-3 shadow-card space-y-2.5">
            <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1.5">
              <CalendarIcon className="h-3.5 w-3.5" /> {t("service.scheduleSection")}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="h-10 px-3 rounded-xl border border-border bg-secondary/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <input type="time" value={time} onChange={e => setTime(e.target.value)}
                className="h-10 px-3 rounded-xl border border-border bg-secondary/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </Card>
        )}

        <Card className="p-3 shadow-card space-y-2.5">
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder={t("service.phonePlaceholder")} type="tel"
            className="w-full h-10 px-3 rounded-xl border border-border bg-secondary/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder={t("service.messagePlaceholder")} maxLength={500} rows={3}
            className="w-full p-3 rounded-xl border border-border bg-secondary/30 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </Card>

        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-lg border-t border-border p-3 z-40">
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            {!isService && hasPrice && (
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">{t("service.totalPay")}</p>
                <div className="flex items-baseline gap-1.5">
                  <Coins className="h-4 w-4 text-amber-500" />
                  <p className="text-lg font-display font-bold tabular-nums text-foreground">{formatCoin(totalCoins)}</p>
                  <p className="text-[10px] text-muted-foreground">{t("wallet.coins")}</p>
                </div>
              </div>
            )}
            <Button
              onClick={handleSubmit}
              disabled={submitting || isOwner || (!isService && hasPrice && !canAfford)}
              className={`${(!isService && hasPrice) ? "px-6" : "flex-1"} h-12 rounded-xl font-bold text-base shadow-lg ${
                (!isService && hasPrice) ? "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/30" : ""
              }`}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                <>
                  {!isService && hasPrice ? <ShoppingBag className="h-4 w-4 mr-1.5" /> : <Sparkles className="h-4 w-4 mr-1.5" />}
                  {isOwner ? t("service.cannotBuyOwn") :
                   !isService && hasPrice ? (canAfford ? t("service.buyNow") : t("service.notEnough")) :
                   t("service.bookNow")}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceDetailPage;
