import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Plus, Trophy, Calendar, Users, MapPin, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SkillBadge from "@/components/SkillBadge";
import { useLanguage } from "@/i18n/LanguageContext";
import { useTournaments } from "@/context/TournamentContext";
import { useNavigate } from "react-router-dom";
import { getTournamentProgress } from "@/lib/tournament/engine";

const TournamentsPage = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { tournaments, loading } = useTournaments();
  const [search, setSearch] = useState("");
  
  const tabs = [t("tournaments.active"), t("tournaments.upcoming"), t("tournaments.past")];
  const [activeTab, setActiveTab] = useState(tabs[0]);

  const filtered = useMemo(() => {
    return tournaments.filter(to => {
      const matchesSearch = to.name.toLowerCase().includes(search.toLowerCase()) || 
                           to.location.toLowerCase().includes(search.toLowerCase());
      if (!matchesSearch) return false;

      if (activeTab === t("tournaments.active")) return to.status === "active";
      if (activeTab === t("tournaments.upcoming")) return to.status === "draft";
      if (activeTab === t("tournaments.past")) return to.status === "completed";
      return true;
    });
  }, [tournaments, activeTab, search, t]);

  // Mock leaderboard for now as we don't have global ranking yet
  const leaderboard = [
    { rank: 1, name: "Alex Kim", wins: 5, losses: 0, points: 150 },
    { rank: 2, name: "Maria Garcia", wins: 4, losses: 1, points: 120 },
    { rank: 3, name: "Tom Roberts", wins: 3, losses: 2, points: 90 },
  ];

  return (
    <div className="pb-20 min-h-screen">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-display font-bold text-foreground">{t("tournaments.title")}</h1>
          <Button size="sm" className="rounded-xl gap-1 text-xs" onClick={() => navigate("/tour-manager/create")}>
            <Plus className="h-3.5 w-3.5" /> {t("tournaments.create")}
          </Button>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder={t("tm.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 rounded-xl bg-secondary/50 border-none"
          />
        </div>

        <div className="flex gap-1 bg-secondary rounded-xl p-0.5">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                activeTab === tab ? "bg-card text-card-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {loading ? (
          <div className="py-20 text-center text-muted-foreground animate-pulse">
            <Trophy className="h-10 w-10 mx-auto mb-2 opacity-20" />
            <p>Loading tournaments...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground">
            <Trophy className="h-10 w-10 mx-auto mb-2 opacity-20" />
            <p>{t("tm.noTournaments")}</p>
          </div>
        ) : (
          filtered.map((to, i) => {
            const allMatches = to.categories.flatMap(c => [
              ...(c.pools || []).flatMap(p => p.matches || []),
              ...(c.bracketRounds || []).flatMap(r => r.matches || [])
            ]);
            const progress = getTournamentProgress(allMatches);
            
            return (
              <motion.div 
                key={to.id} 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: i * 0.05 }}
              >
                <Card 
                  className="overflow-hidden shadow-card hover:shadow-elevated transition-all cursor-pointer"
                  onClick={() => navigate(`/tournament-live/${to.id}`)}
                >
                  <div className={`h-1.5 bg-gradient-to-r ${to.status === 'active' ? 'from-primary to-neon' : 'from-muted to-muted-foreground/30'}`} />
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-display font-semibold text-card-foreground truncate">{to.name}</h3>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span className="px-1.5 py-0.5 bg-secondary rounded text-[10px] font-medium">
                            {t(`tm.format.${to.format}`)}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            to.status === "active" ? "bg-neon/20 text-accent-foreground animate-pulse" : "bg-muted text-muted-foreground"
                          }`}>
                            {t(`tm.status.${to.status}`)}
                          </span>
                        </div>
                      </div>
                      <Trophy className={`h-5 w-5 shrink-0 ${to.status === 'active' ? 'text-neon' : 'text-muted'}`} />
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{to.date}</span>
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{to.location}</span>
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" />{to.categories.length} {t("tm.categories")}</span>
                    </div>
                    
                    {to.status === "active" && progress.total > 0 && (
                      <div className="space-y-1 pt-1">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-muted-foreground">{t("tm.progress")}</span>
                          <span className="text-primary font-medium">{progress.pct}%</span>
                        </div>
                        <div className="h-1 bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${progress.pct}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              </motion.div>
            );
          })
        )}

        <section className="pt-2">
          <h2 className="text-sm font-display font-semibold text-foreground mb-3">{t("tournaments.leaderboard")}</h2>
          <Card className="shadow-card overflow-hidden">
            {leaderboard.map((player, i) => (
              <div key={i} className={`flex items-center gap-3 px-4 py-2.5 ${i < leaderboard.length - 1 ? "border-b border-border" : ""}`}>
                <span className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  i === 0 ? "bg-neon/20 text-accent-foreground" : i === 1 ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground"
                }`}>{player.rank}</span>
                <div className="flex-1">
                  <p className="text-xs font-medium text-card-foreground">{player.name}</p>
                  <p className="text-[10px] text-muted-foreground">{player.wins}W - {player.losses}L</p>
                </div>
                <span className="text-xs font-display font-bold text-primary">{player.points}</span>
              </div>
            ))}
          </Card>
        </section>
      </div>
    </div>
  );
};

export default TournamentsPage;
