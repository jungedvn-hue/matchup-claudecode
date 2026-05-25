import { Card } from "./ui/card";
import { MapPin, Calendar, Users, Clock, ChevronRight } from "lucide-react";
import SkillBadge, { type SkillLevel } from "./SkillBadge";

interface EventCardProps {
  title: string;
  host: string;
  location: string;
  date: string;
  time: string;
  skill: SkillLevel;
  players: number;
  maxPlayers: number;
  type: "open_play" | "tournament" | "league" | "clinic";
}

const typeLabels: Record<string, { label: string; emoji: string }> = {
  open_play: { label: "Open Play", emoji: "🎾" },
  tournament: { label: "Tournament", emoji: "🏆" },
  league: { label: "League", emoji: "📋" },
  clinic: { label: "Clinic", emoji: "🎓" },
};

const EventCard = ({ title, host, location, date, time, skill, players, maxPlayers, type }: EventCardProps) => {
  const typeInfo = typeLabels[type];
  return (
    <Card className="flex items-center gap-3 p-3 shadow-card hover:shadow-elevated transition-all cursor-pointer group">
      <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center text-2xl shrink-0">
        {typeInfo.emoji}
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-display font-semibold text-card-foreground truncate">{title}</h3>
          <SkillBadge level={skill} className="shrink-0" />
        </div>
        <p className="text-xs text-muted-foreground">by {host}</p>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-0.5"><Calendar className="h-3 w-3" />{date}</span>
          <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" />{time}</span>
          <span className="flex items-center gap-0.5"><Users className="h-3 w-3" />{players}/{maxPlayers}</span>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
    </Card>
  );
};

export default EventCard;
