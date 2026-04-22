import { motion } from "framer-motion";
import { Plus, Users, MapPin, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import SkillBadge from "@/components/SkillBadge";
import { useLanguage } from "@/i18n/LanguageContext";

const myGroups = [
  { name: "Sunset Smashers", role: "Host", members: 45, location: "Sunset Park", nextEvent: "Tonight 6PM", skill: "intermediate" as const },
  { name: "Morning Dinks", role: "Host", members: 32, location: "City Rec", nextEvent: "Tomorrow 7:30AM", skill: "beginner" as const },
  { name: "Bay Area Pros", role: "Player", members: 18, location: "Elite Club", nextEvent: "Sat 5PM", skill: "pro" as const },
];

const GroupsPage = () => {
  const { t } = useLanguage();

  return (
    <div className="pb-20 min-h-screen">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-display font-bold text-foreground">{t("groups.title")}</h1>
          <Button size="sm" className="rounded-xl gap-1 text-xs">
            <Plus className="h-3.5 w-3.5" /> {t("groups.newGroup")}
          </Button>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-3">
        {myGroups.map((group, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <Card className="p-4 shadow-card hover:shadow-elevated transition-all cursor-pointer group">
              <div className="flex items-start gap-3">
                <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center text-2xl shrink-0">🏓</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-display font-semibold text-card-foreground">{group.name}</h3>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                      group.role === "Host" ? "bg-neon/20 text-accent-foreground" : "bg-secondary text-secondary-foreground"
                    }`}>
                      {group.role}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{group.location}</span>
                    <span className="flex items-center gap-0.5"><Users className="h-3 w-3" />{group.members}</span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <SkillBadge level={group.skill} />
                      <span className="text-xs text-primary font-medium">Next: {group.nextEvent}</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default GroupsPage;
