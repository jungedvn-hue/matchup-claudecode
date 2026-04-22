import { Avatar, AvatarFallback } from "./ui/avatar";
import SkillBadge, { type SkillLevel } from "./SkillBadge";

interface PlayerAvatarProps {
  name: string;
  skill: SkillLevel;
  rating?: number;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
};

const PlayerAvatar = ({ name, skill, rating, size = "md" }: PlayerAvatarProps) => {
  const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2);
  return (
    <div className="flex flex-col items-center gap-1">
      <Avatar className={sizeMap[size]}>
        <AvatarFallback className="bg-primary/10 text-primary font-display font-semibold">
          {initials}
        </AvatarFallback>
      </Avatar>
      <span className="text-[10px] font-medium text-foreground truncate max-w-[60px]">{name.split(" ")[0]}</span>
      {rating !== undefined && (
        <span className="text-[10px] text-muted-foreground">{rating.toFixed(1)}</span>
      )}
    </div>
  );
};

export default PlayerAvatar;
