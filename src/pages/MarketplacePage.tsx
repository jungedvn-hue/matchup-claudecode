import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Search, MapPin, Star, Phone, Loader2, Store as StoreIcon,
  GraduationCap, Wrench, ShoppingBag, HeartPulse, Dumbbell, Utensils,
  Volleyball, Footprints, Shirt, Backpack, HandHeart, Circle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { useStores, STORE_CATEGORIES, type Store } from "@/hooks/useStores";
import PageHeader from "@/components/PageHeader";

const CATEGORY_ICONS: Record<string, typeof ShoppingBag> = {
  paddles: Volleyball,
  balls: Circle,
  shoes: Footprints,
  apparel: Shirt,
  bags: Backpack,
  accessories: HandHeart,
  coaching: GraduationCap,
  repair: Wrench,
  physio: HeartPulse,
  fitness: Dumbbell,
  food: Utensils,
};

const MarketplacePage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { stores, loading } = useStores({
    category: activeCategory === "all" ? undefined : activeCategory,
    search: searchQuery || undefined,
  });

  const featured = stores.filter(s => s.is_featured);
  const regular = stores.filter(s => !s.is_featured);

  return (
    <div className="pb-20 min-h-screen">
      <PageHeader title={t("marketplace.title")} right={<span className="text-xs text-muted-foreground">{stores.length} {t("marketplace.servicesNearby")}</span>} className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder={t("marketplace.searchPlaceholder")}
            className="w-full h-9 pl-9 pr-3 rounded-xl bg-secondary text-sm text-secondary-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
          <CatChip id="all" label={t("common.all")} icon={ShoppingBag} active={activeCategory === "all"} onClick={() => setActiveCategory("all")} />
          {STORE_CATEGORIES.map(c => (
            <CatChip key={c} id={c} label={t(`store.cat.${c}`)} icon={CATEGORY_ICONS[c] ?? ShoppingBag} active={activeCategory === c} onClick={() => setActiveCategory(c)} />
          ))}
        </div>
      </PageHeader>

      <div className="px-4 pt-4 space-y-5 max-w-2xl mx-auto">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : stores.length === 0 ? (
          <Card className="p-10 text-center shadow-card mt-4">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <StoreIcon className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">{t("store.empty.stores")}</p>
          </Card>
        ) : (
          <>
            {featured.length > 0 && (
              <section>
                <h2 className="text-xs font-display font-bold text-muted-foreground uppercase tracking-wider mb-2.5">
                  {t("marketplace.featured")}
                </h2>
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory">
                  {featured.map((store, i) => (
                    <FeaturedCard key={store.id} store={store} index={i} onClick={() => navigate(`/store/${store.id}`)} t={t} />
                  ))}
                </div>
              </section>
            )}

            <section>
              <h2 className="text-xs font-display font-bold text-muted-foreground uppercase tracking-wider mb-2.5">
                {activeCategory === "all" ? t("marketplace.allServices") : t(`store.cat.${activeCategory}`)}
              </h2>
              <div className="space-y-2.5">
                {(activeCategory === "all" ? regular : stores).map((store, i) => (
                  <StoreCard key={store.id} store={store} index={i} onClick={() => navigate(`/store/${store.id}`)} t={t} />
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
};

const CatChip = ({ label, icon: Icon, active, onClick }: { id: string; label: string; icon: typeof ShoppingBag; active: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
      active ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
    }`}
  >
    <Icon className="h-3.5 w-3.5" />
    {label}
  </button>
);

const FeaturedCard = ({ store, index, onClick, t }: { store: Store; index: number; onClick: () => void; t: (k: string) => string }) => (
  <motion.div
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: index * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    className="snap-start shrink-0 w-[260px]"
  >
    <Card onClick={onClick} className="p-0 overflow-hidden shadow-card hover:shadow-elevated transition-shadow cursor-pointer">
      <div className="h-24 bg-gradient-to-br from-primary/15 to-accent/10 flex items-center justify-center">
        {store.logo_url ? (
          <img src={store.logo_url} alt={store.name} className="h-full w-full object-cover" />
        ) : (
          <StoreIcon className="h-8 w-8 text-primary" />
        )}
      </div>
      <div className="p-3.5 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-display font-semibold text-card-foreground leading-tight">{store.name}</h3>
          <Badge variant="secondary" className="shrink-0 text-[10px]">⭐ {t("store.profile.featured")}</Badge>
        </div>
        {store.description && <p className="text-xs text-muted-foreground line-clamp-2">{store.description}</p>}
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          {store.avg_rating > 0 && (
            <span className="flex items-center gap-0.5"><Star className="h-3 w-3 text-amber-500 fill-amber-500" />{store.avg_rating.toFixed(1)}</span>
          )}
          {store.address && <span className="flex items-center gap-0.5 truncate"><MapPin className="h-3 w-3" />{store.address}</span>}
        </div>
      </div>
    </Card>
  </motion.div>
);

const StoreCard = ({ store, index, onClick, t }: { store: Store; index: number; onClick: () => void; t: (k: string) => string }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
  >
    <Card onClick={onClick} className="p-3.5 shadow-card hover:shadow-elevated transition-all cursor-pointer active:scale-[0.99]">
      <div className="flex gap-3">
        <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center text-2xl shrink-0 overflow-hidden">
          {store.logo_url ? (
            <img src={store.logo_url} alt={store.name} className="h-full w-full object-cover" />
          ) : (
            <StoreIcon className="h-6 w-6 text-primary" />
          )}
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-display font-semibold text-card-foreground">{store.name}</h3>
            {store.avg_rating > 0 && (
              <span className="flex items-center gap-0.5 text-[11px] font-medium text-foreground shrink-0">
                <Star className="h-3 w-3 text-amber-500 fill-amber-500" />{store.avg_rating.toFixed(1)}
              </span>
            )}
          </div>
          {store.description && <p className="text-xs text-muted-foreground line-clamp-1">{store.description}</p>}
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            {store.review_count > 0 && <span>{store.review_count} reviews</span>}
            {store.address && <span className="flex items-center gap-0.5 truncate"><MapPin className="h-3 w-3" />{store.address}</span>}
          </div>
          {store.categories.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-0.5">
              {store.categories.slice(0, 3).map(c => (
                <span key={c} className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/8 text-primary font-medium">{t(`store.cat.${c}`)}</span>
              ))}
            </div>
          )}
        </div>
      </div>
      {store.phone && (
        <div className="flex gap-2 mt-3 pt-2.5 border-t border-border/50">
          <Button asChild variant="outline" size="sm" className="flex-1 h-8 text-xs rounded-lg" onClick={(e) => e.stopPropagation()}>
            <a href={`tel:${store.phone}`}><Phone className="h-3 w-3 mr-1" /> {t("marketplace.contact")}</a>
          </Button>
          <Button size="sm" className="flex-1 h-8 text-xs rounded-lg" onClick={onClick}>
            {t("marketplace.viewDetails")}
          </Button>
        </div>
      )}
    </Card>
  </motion.div>
);

export default MarketplacePage;
