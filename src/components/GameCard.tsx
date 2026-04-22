import { MapPin, Clock, Users } from "lucide-react";
import SkillBadge, { type SkillLevel } from "./SkillBadge";
import { Card } from "./ui/card";

interface GameCardProps {
  groupName: string;
  hostName: string;
  location: string;
  skill: SkillLevel;
  availableSlots: number;
  totalSlots: number;
  time: string;
  date: string;
  imageUrl?: string;
}

const GameCard = ({ groupName, hostName, location, skill, availableSlots, totalSlots, time, date }: GameCardProps) => {
  const slotsPercent = ((totalSlots - availableSlots) / totalSlots) * 100;

  return (
    <Card className="overflow-hidden shadow-card hover:shadow-elevated transition-shadow cursor-pointer group min-w-[260px]">
      <div className="h-24 bg-gradient-to-br from-primary/20 to-court-light relative">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-2xl">🏓</span>
          </div>
        </div>
        <div className="absolute top-2 right-2">
          <SkillBadge level={skill} />
        </div>
      </div>
      <div className="p-3.5 space-y-2">
        <div>
          <h3 className="font-display font-semibold text-sm text-card-foreground truncate">{groupName}</h3>
          <p className="text-xs text-muted-foreground">by {hostName}</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">{location}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {time}
          </span>
          <span>{date}</span>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Users className="h-3 w-3" />
              {availableSlots} spots left
            </span>
            <span className="font-medium text-card-foreground">{totalSlots - availableSlots}/{totalSlots}</span>
          </div>
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${slotsPercent}%` }}
            />
          </div>
        </div>
      </div>
    </Card>
  );
};

export default GameCard;
