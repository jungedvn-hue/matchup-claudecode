import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trophy, Calendar, Users, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import SkillBadge from "@/components/SkillBadge";
import { useLanguage } from "@/i18n/LanguageContext";

const tournaments = [
  { name: "Spring Championship", type: "Round Robin", status: "In Progress", date: "Mar 25-26", location: "Elite Club", players: 28, maxPlayers: 32, skill: "advanced" as const, rounds: 5, currentRound: 3 },
  { name: "Friday Night Knockout", type: "Knockout", status: "Registration", date: "Mar 28", location: "Sunset Park", players: 12, maxPlayers: 16, skill: "intermediate" as const, rounds: 4, currentRound: 0 },
  { name: "Beginner Ladder", type: "Ladder", status: "Ongoing", date: "Mar-Apr", location: "Community Center", players: 20, maxPlayers: 30, skill: "beginner" as const, rounds: 0, currentRound: 0 },
];

const leaderboard = [
  { rank: 1, name: "Alex Kim", wins: 5, losses: 0, points: 150 },
  { rank: 2, name: "Maria Garcia", wins: 4, losses: 1, points: 120 },
  { rank: 3, name: "Tom Roberts", wins: 3, losses: 2, points: 90 },
  { rank: 4, name: "Sarah Lee", wins: 2, losses: 3, points: 60 },
];

const TournamentsPage = () => {
  const { t } = useLanguage();
  const tabs = [t("tournaments.active"), t("tournaments.upcoming"), t("tournaments.past")];
  const [activeTab, setActiveTab] = useState(tabs[0]);

  return (
    <div className="pb-20 min-h-screen">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-display font-bold text-foreground">{t("tournaments.title")}</h1>
          <Button size="sm" className="rounded-xl gap-1 text-xs">
            <Plus className="h-3.5 w-3.5" /> {t("tournaments.create")}
          </Button>
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
        {tournaments.map((to, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <Card className="overflow-hidden shadow-card hover:shadow-elevated transition-all cursor-pointer">
              <div className="h-2 bg-gradient-to-r from-primary to-neon" />
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-display font-semibold text-card-foreground">{to.name}</h3>
                      <SkillBadge level={to.skill} />
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span className="px-1.5 py-0.5 bg-secondary rounded text-[10px] font-medium">{to.type}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        to.status === "In Progress" ? "bg-neon/20 text-accent-foreground" : "bg-sport-blue/10 text-sport-blue"
                      }`}>{to.status}</span>
                    </div>
                  </div>
                  <Trophy className="h-5 w-5 text-neon" />
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{to.date}</span>
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{to.location}</span>
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" />{to.players}/{to.maxPlayers}</span>
                </div>
                {to.currentRound > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted-foreground">Round {to.currentRound} of {to.rounds}</span>
                      <span className="text-primary font-medium">{Math.round((to.currentRound / to.rounds) * 100)}%</span>
                    </div>
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${(to.currentRound / to.rounds) * 100}%` }} />
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        ))}

        <section>
          <h2 className="text-base font-display font-semibold text-foreground mb-3">{t("tournaments.leaderboard")}</h2>
          <Card className="shadow-card overflow-hidden">
            {leaderboard.map((player, i) => (
              <div key={i} className={`flex items-center gap-3 px-4 py-3 ${i < leaderboard.length - 1 ? "border-b border-border" : ""}`}>
                <span className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  i === 0 ? "bg-neon/20 text-accent-foreground" : i === 1 ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground"
                }`}>{player.rank}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-card-foreground">{player.name}</p>
                  <p className="text-[11px] text-muted-foreground">{player.wins}W - {player.losses}L</p>
                </div>
                <span className="text-sm font-display font-bold text-primary">{player.points}</span>
              </div>
            ))}
          </Card>
        </section>
      </div>
    </div>
  );
};

export default TournamentsPage;
