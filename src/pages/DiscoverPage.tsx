import { useState } from "react";
import { motion } from "framer-motion";
import { Search, MapPin, SlidersHorizontal, Users, Trophy, Map, UserCircle, CheckCircle2, ChevronRight, Zap } from "lucide-react";
import GameCard from "@/components/GameCard";
import EventCard from "@/components/EventCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";

const filters = ["All Levels", "Beginner", "Intermediate", "Advanced", "< 1 mi", "< 5 mi", "Morning", "Evening"];

const groups = [
  { name: "Sunset Smashers", members: 45, location: "Sunset Park", skill: "intermediate" as const, rating: 4.7 },
  { name: "Downtown Dinkers", members: 32, location: "SOMA Courts", skill: "beginner" as const, rating: 4.5 },
  { name: "Bay Area Pros", members: 18, location: "Elite Club", skill: "pro" as const, rating: 4.9 },
  { name: "Mission Mixers", members: 60, location: "Mission Rec", skill: "advanced" as const, rating: 4.3 },
  { name: "Mission Mixers", members: 60, location: "Mission Rec", skill: "advanced" as const, rating: 4.3 },
];

const matchRecommendation = {
  opponent: "Alex Kim",
  tournament: "Summer City Cup",
  group: {
    name: "Sunset Smashers",
    skill: "intermediate",
    location: "Sunset Park",
    matchScore: 92 // "92% Match" based on ELO proximity
  }
};

const DiscoverPage = () => {
  const { t } = useLanguage();
  const [activeCategory, setActiveCategory] = useState("groups");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const categories = [
    { id: "groups", label: t("discover.groups"), icon: Users },
    { id: "tournaments", label: t("discover.tournaments"), icon: Trophy },
    { id: "courts", label: t("discover.courts"), icon: Map },
    { id: "players", label: t("discover.players"), icon: UserCircle },
  ];

  const toggleFilter = (f: string) => {
    setActiveFilters(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);
  };

  return (
    <div className="pb-20 min-h-screen">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3 space-y-3">
        <h1 className="text-lg font-display font-bold text-foreground">{t("discover.title")}</h1>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t("discover.searchPlaceholder")}
              className="w-full h-9 pl-9 pr-3 rounded-xl bg-secondary text-sm text-secondary-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <button className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground">
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
          {categories.map(cat => (
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
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-3">
        <div className="flex gap-1.5 overflow-x-auto pb-3 -mx-4 px-4">
          {filters.map(f => (
            <button
              key={f}
              onClick={() => toggleFilter(f)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap border transition-colors ${
                activeFilters.includes(f)
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/30"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {activeCategory === "groups" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
            <div className="rounded-2xl p-4 bg-gradient-to-br from-primary/20 via-primary/5 to-background border border-primary/20 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 opacity-10">
                <Trophy className="h-24 w-24" />
              </div>
              <div className="relative z-10 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                    <Zap className="h-3 w-3 text-primary" />
                  </div>
                  <span className="text-xs font-bold text-primary uppercase tracking-wider">
                    Gợi ý thông minh
                  </span>
                </div>
                
                <p className="text-sm text-foreground leading-relaxed">
                  Bạn vừa có trận đấu ngang tài ngang sức với <strong className="text-primary">@{matchRecommendation.opponent}</strong> tại giải <strong>{matchRecommendation.tournament}</strong>.
                  <br/>
                  Alex hiện đang sinh hoạt tại nhóm <strong>{matchRecommendation.group.name}</strong>.
                </p>

                <div className="flex items-center gap-3 bg-background/50 rounded-xl p-2.5 border border-border/50">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold">{matchRecommendation.group.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold flex items-center gap-0.5">
                        <CheckCircle2 className="h-3 w-3" /> ELO {matchRecommendation.group.matchScore}% Match
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3" /> {matchRecommendation.group.location}
                    </span>
                  </div>
                  <Button size="sm" className="h-8 text-xs rounded-lg gap-1 shadow-md">
                    Tham gia nhanh <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        <div className="space-y-2.5">
          {groups.map((group, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <Card className="p-3.5 shadow-card hover:shadow-elevated transition-all cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-xl shrink-0">🥎</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-display font-semibold text-card-foreground">{group.name}</h3>
                      <span className={`skill-badge-${group.skill} text-[10px] px-1.5 py-0.5 rounded-full font-semibold`}>
                        {group.skill}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{group.location}</span>
                      <span className="flex items-center gap-0.5"><Users className="h-3 w-3" />{group.members}</span>
                      <span>⭐ {group.rating}</span>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DiscoverPage;
