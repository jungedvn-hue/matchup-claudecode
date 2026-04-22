import { useState } from "react";
import { motion } from "framer-motion";
import { Search, MapPin, Star, Clock, Phone, ExternalLink, Dumbbell, Wrench, ShoppingBag, HeartPulse, GraduationCap, Utensils } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";

const serviceCategories = [
  { id: "all", labelKey: "common.all", icon: ShoppingBag },
  { id: "coaching", label: "Coaching", icon: GraduationCap },
  { id: "repair", label: "Repair", icon: Wrench },
  { id: "shop", label: "Pro Shops", icon: ShoppingBag },
  { id: "physio", label: "Physio", icon: HeartPulse },
  { id: "fitness", label: "Fitness", icon: Dumbbell },
  { id: "food", label: "Food", icon: Utensils },
];

const services = [
  { id: 1, name: "Ace Pickleball Coaching", category: "coaching", description: "Private & group lessons for all skill levels. IPTPA certified coaches.", distance: "0.3 mi", rating: 4.9, reviews: 127, price: "From $45/hr", hours: "7am – 8pm", image: "🎯", featured: true },
  { id: 2, name: "Court Side Pro Shop", category: "shop", description: "Paddles, balls, shoes, and accessories. Demo paddles available.", distance: "0.8 mi", rating: 4.7, reviews: 89, price: "$$", hours: "9am – 7pm", image: "🏪", featured: true },
  { id: 3, name: "Rally Racket Repair", category: "repair", description: "Grip replacement, edge guard repair, and paddle resurfacing.", distance: "1.2 mi", rating: 4.8, reviews: 64, price: "From $15", hours: "10am – 6pm", image: "🔧", featured: false },
  { id: 4, name: "Peak Performance Physio", category: "physio", description: "Sports physiotherapy specializing in paddle sport injuries.", distance: "1.5 mi", rating: 4.9, reviews: 203, price: "From $80", hours: "8am – 6pm", image: "💪", featured: false },
  { id: 5, name: "Dink & Drink Café", category: "food", description: "Post-game smoothies, protein bowls, and cold brew. Court-side location.", distance: "0.1 mi", rating: 4.6, reviews: 312, price: "$", hours: "6am – 4pm", image: "🥤", featured: true },
  { id: 6, name: "Volley Fit Studio", category: "fitness", description: "Pickleball-specific conditioning, agility drills, and strength training.", distance: "2.1 mi", rating: 4.5, reviews: 56, price: "From $30/class", hours: "6am – 9pm", image: "🏋️", featured: false },
  { id: 7, name: "Sole Survivor Shoe Repair", category: "repair", description: "Court shoe resoling, cleaning, and custom insoles for players.", distance: "1.8 mi", rating: 4.4, reviews: 41, price: "From $25", hours: "9am – 5pm", image: "👟", featured: false },
  { id: 8, name: "Drop Shot Academy", category: "coaching", description: "Tournament prep, strategy sessions, and video analysis.", distance: "3.2 mi", rating: 4.8, reviews: 98, price: "From $60/hr", hours: "8am – 7pm", image: "🏆", featured: false },
];

const MarketplacePage = () => {
  const { t } = useLanguage();
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = services.filter(s => {
    const matchesCategory = activeCategory === "all" || s.category === activeCategory;
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const featured = filtered.filter(s => s.featured);
  const regular = filtered.filter(s => !s.featured);

  return (
    <div className="pb-20 min-h-screen">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-display font-bold text-foreground">{t("marketplace.title")}</h1>
          <span className="text-xs text-muted-foreground">{filtered.length} {t("marketplace.servicesNearby")}</span>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t("marketplace.searchPlaceholder")}
            className="w-full h-9 pl-9 pr-3 rounded-xl bg-secondary text-sm text-secondary-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
          {serviceCategories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                activeCategory === cat.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              <cat.icon className="h-3.5 w-3.5" />
              {cat.labelKey ? t(cat.labelKey) : cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4 space-y-5">
        {featured.length > 0 && (
          <section>
            <h2 className="text-sm font-display font-semibold text-foreground mb-2.5">{t("marketplace.featured")}</h2>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory">
              {featured.map((service, i) => (
                <motion.div key={service.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }} className="snap-start shrink-0 w-[260px]">
                  <Card className="p-0 overflow-hidden shadow-card hover:shadow-elevated transition-shadow cursor-pointer">
                    <div className="h-24 bg-gradient-to-br from-primary/15 to-accent/10 flex items-center justify-center text-4xl">{service.image}</div>
                    <div className="p-3.5 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-display font-semibold text-card-foreground leading-tight">{service.name}</h3>
                        <Badge variant="secondary" className="shrink-0 text-[10px]">{service.price}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{service.description}</p>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-0.5"><Star className="h-3 w-3 text-accent fill-accent" />{service.rating}</span>
                        <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{service.distance}</span>
                        <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" />{service.hours}</span>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-sm font-display font-semibold text-foreground mb-2.5">
            {activeCategory === "all" ? t("marketplace.allServices") : serviceCategories.find(c => c.id === activeCategory)?.label}
          </h2>
          <div className="space-y-2.5">
            {regular.length === 0 && featured.length === 0 && (
              <div className="text-center py-12">
                <p className="text-3xl mb-2">🔍</p>
                <p className="text-sm text-muted-foreground">{t("marketplace.noServices")}</p>
              </div>
            )}
            {(activeCategory === "all" ? filtered : regular).map((service, i) => (
              <motion.div key={service.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
                <Card className="p-3.5 shadow-card hover:shadow-elevated transition-all cursor-pointer active:scale-[0.98]">
                  <div className="flex gap-3">
                    <div className="h-14 w-14 rounded-xl bg-primary/8 flex items-center justify-center text-2xl shrink-0">{service.image}</div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-display font-semibold text-card-foreground">{service.name}</h3>
                        <span className="text-[11px] font-medium text-primary shrink-0">{service.price}</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">{service.description}</p>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-0.5"><Star className="h-3 w-3 text-accent fill-accent" />{service.rating} ({service.reviews})</span>
                        <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{service.distance}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3 pt-2.5 border-t border-border">
                    <Button variant="outline" size="sm" className="flex-1 h-8 text-xs rounded-lg">
                      <Phone className="h-3 w-3 mr-1" /> {t("marketplace.contact")}
                    </Button>
                    <Button size="sm" className="flex-1 h-8 text-xs rounded-lg">
                      <ExternalLink className="h-3 w-3 mr-1" /> {t("marketplace.viewDetails")}
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default MarketplacePage;
