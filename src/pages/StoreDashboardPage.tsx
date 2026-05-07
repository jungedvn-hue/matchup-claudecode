import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Package, Calendar, Star, MessageSquare, Plus, Pencil,
  ChevronRight, Store, Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { useMyStore, useStoreBookings, useStoreProducts, type Review } from "@/hooks/useStores";
import { supabase } from "@/integrations/supabase/client";

const StoreDashboardPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { store, loading } = useMyStore();
  const { products } = useStoreProducts(store?.id);
  const { bookings } = useStoreBookings(store?.id);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <Card className="p-6 text-center max-w-sm">
          <p className="text-sm text-muted-foreground">{t("tm.toast.signInRequired")}</p>
          <Button className="mt-4 w-full" onClick={() => navigate("/auth")}>{t("auth.signIn")}</Button>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="pb-20 min-h-screen">
        <Header onBack={() => navigate(-1)} title={t("store.dashboard.title")} />
        <div className="px-4 pt-12 max-w-md mx-auto">
          <Card className="p-8 text-center space-y-4">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <Store className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-display font-bold text-foreground">{t("store.notRegistered")}</h2>
              <p className="text-xs text-muted-foreground mt-1.5">{t("store.dashboard.subtitle")}</p>
            </div>
            <Button className="w-full" onClick={() => navigate("/settings")}>
              {t("store.registerCta")}
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const activeBookings = bookings.filter(b => b.status === "pending" || b.status === "confirmed").length;

  const stats = [
    { icon: Package, labelKey: "store.stats.products", value: products.length, tone: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
    { icon: Calendar, labelKey: "store.stats.bookings", value: activeBookings, tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
    { icon: MessageSquare, labelKey: "store.stats.reviews", value: store.review_count, tone: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
    { icon: Star, labelKey: "store.stats.rating", value: store.avg_rating > 0 ? store.avg_rating.toFixed(1) : "—", tone: "bg-amber-500/10 text-amber-600 dark:text-amber-500" },
  ];

  return (
    <div className="pb-24 min-h-screen">
      <Header onBack={() => navigate(-1)} title={t("store.dashboard.title")} />

      <div className="px-4 pt-4 space-y-5 max-w-2xl mx-auto">
        {/* Store header card */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-5 shadow-card overflow-hidden relative bg-gradient-to-br from-primary/5 via-card to-card">
            <div className="flex items-start gap-4">
              <div className="h-16 w-16 rounded-2xl bg-primary/15 flex items-center justify-center text-2xl shrink-0 overflow-hidden">
                {store.logo_url ? (
                  <img src={store.logo_url} alt={store.name} className="h-full w-full object-cover" />
                ) : (
                  <Store className="h-7 w-7 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-base font-display font-bold text-foreground truncate">{store.name}</h1>
                  {store.is_featured && <Badge variant="secondary" className="text-[10px]">⭐ {t("store.profile.featured")}</Badge>}
                </div>
                {store.description ? (
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{store.description}</p>
                ) : (
                  <p className="text-xs text-muted-foreground italic">{t("store.dashboard.subtitle")}</p>
                )}
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2.5">
          {stats.map((s, i) => (
            <motion.div key={s.labelKey} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Card className="p-3.5 shadow-card">
                <div className="flex items-center gap-2.5">
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${s.tone}`}>
                    <s.icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg font-display font-bold text-foreground leading-none">{s.value}</p>
                    <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider truncate">{t(s.labelKey)}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-3 gap-2">
          <ActionTile icon={Plus} labelKey="store.action.addProduct" onClick={() => navigate("/my-store/products?add=1")} />
          <ActionTile icon={Calendar} labelKey="store.action.manageBookings" onClick={() => navigate("/my-store/bookings")} count={activeBookings || undefined} />
          <ActionTile icon={Pencil} labelKey="store.action.editProfile" onClick={() => navigate("/my-store/edit")} />
        </div>

        {/* Recent bookings */}
        <Section
          title={t("store.recentBookings")}
          onSeeAll={() => navigate("/my-store/bookings")}
          showSeeAll={bookings.length > 3}
        >
          {bookings.length === 0 ? (
            <EmptyState icon={Calendar} text={t("store.empty.bookings")} />
          ) : (
            <div className="space-y-2">
              {bookings.slice(0, 3).map(b => (
                <Card key={b.id} className="p-3.5 shadow-card hover:shadow-elevated transition-shadow cursor-pointer" onClick={() => navigate("/my-store/bookings")}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground truncate">{b.player_name}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                        {b.message || new Date(b.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <BookingStatusBadge status={b.status} t={t} />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Section>

        {/* Recent reviews */}
        <Section title={t("store.recentReviews")} showSeeAll={false}>
          <RecentReviewsList storeId={store.id} t={t} />
        </Section>
      </div>
    </div>
  );
};

// ───────── Subcomponents ─────────

const Header = ({ onBack, title }: { onBack: () => void; title: string }) => (
  <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3">
    <div className="flex items-center gap-3 max-w-2xl mx-auto">
      <button onClick={onBack} className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center hover:bg-secondary/70 transition-colors">
        <ArrowLeft className="h-4 w-4 text-foreground" />
      </button>
      <h1 className="text-base font-display font-bold text-foreground">{title}</h1>
    </div>
  </div>
);

const ActionTile = ({ icon: Icon, labelKey, onClick, count }: { icon: typeof Plus; labelKey: string; onClick: () => void; count?: number }) => {
  const { t } = useLanguage();
  return (
    <button onClick={onClick} className="relative p-3 rounded-xl bg-card border border-border hover:border-primary/30 hover:bg-primary/5 transition-all flex flex-col items-center gap-1.5 active:scale-[0.97]">
      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-[10px] font-medium text-foreground text-center leading-tight">{t(labelKey)}</p>
      {count !== undefined && count > 0 && (
        <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">{count}</span>
      )}
    </button>
  );
};

const Section = ({ title, children, onSeeAll, showSeeAll }: { title: string; children: React.ReactNode; onSeeAll?: () => void; showSeeAll: boolean }) => {
  const { t } = useLanguage();
  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-xs font-display font-bold text-muted-foreground uppercase tracking-wider">{title}</h2>
        {showSeeAll && onSeeAll && (
          <button onClick={onSeeAll} className="flex items-center gap-0.5 text-[11px] text-primary font-medium hover:underline">
            {t("common.seeAll")} <ChevronRight className="h-3 w-3" />
          </button>
        )}
      </div>
      {children}
    </section>
  );
};

const EmptyState = ({ icon: Icon, text }: { icon: typeof Calendar; text: string }) => (
  <Card className="p-6 text-center shadow-card">
    <div className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center mx-auto mb-2">
      <Icon className="h-4 w-4 text-muted-foreground" />
    </div>
    <p className="text-xs text-muted-foreground">{text}</p>
  </Card>
);

const BookingStatusBadge = ({ status, t }: { status: string; t: (k: string) => string }) => {
  const colors: Record<string, string> = {
    pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    confirmed: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    completed: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    cancelled: "bg-muted text-muted-foreground",
    rejected: "bg-destructive/10 text-destructive border-destructive/20",
  };
  return (
    <Badge variant="outline" className={`text-[10px] shrink-0 ${colors[status] ?? ""}`}>
      {t(`store.booking.status.${status}`)}
    </Badge>
  );
};

const RecentReviewsList = ({ storeId, t }: { storeId: string; t: (k: string) => string }) => {
  const { reviews } = useStoreReviews(storeId);
  if (reviews.length === 0) return <EmptyState icon={Star} text={t("store.empty.reviews")} />;
  return (
    <div className="space-y-2">
      {reviews.slice(0, 3).map(r => (
        <Card key={r.id} className="p-3.5 shadow-card">
          <div className="flex items-start justify-between gap-3 mb-1.5">
            <p className="text-sm font-semibold text-foreground">{r.player_name}</p>
            <div className="flex items-center gap-0.5 shrink-0">
              {[1, 2, 3, 4, 5].map(n => (
                <Star key={n} className={`h-3 w-3 ${n <= r.rating ? "text-amber-500 fill-amber-500" : "text-muted-foreground/30"}`} />
              ))}
            </div>
          </div>
          {r.comment && <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{r.comment}</p>}
        </Card>
      ))}
    </div>
  );
};

const useStoreReviews = (storeId: string | undefined) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  useEffect(() => {
    if (!storeId) return;
    (supabase as any).from("reviews").select("*").eq("store_id", storeId).order("created_at", { ascending: false }).limit(5)
      .then(({ data }: { data: Review[] | null }) => setReviews(data ?? []));
  }, [storeId]);
  return { reviews };
};

export default StoreDashboardPage;
