import { motion } from "framer-motion";
import { Zap, Crown } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { getXPForNextLevel } from "@/lib/scoring";

interface XPProgressBarProps {
  currentXP: number;
  level: number;
}

const XPProgressBar = ({ currentXP, level }: XPProgressBarProps) => {
  const previousLevelXP = level > 1 ? Math.pow(level - 1, 2) * 100 : 0;
  const nextLevelXP = getXPForNextLevel(level);
  
  const progressInLevel = currentXP - previousLevelXP;
  const xpNeededForLevel = nextLevelXP - previousLevelXP;
  const progressPercentage = Math.min(100, Math.max(0, (progressInLevel / xpNeededForLevel) * 100));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
            <Zap className="h-4 w-4 text-primary fill-primary/20" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Level {level}</p>
            <h4 className="text-sm font-display font-bold text-foreground">
              {level < 5 ? "Amateur" : level < 10 ? "Challenger" : "Elite"}
            </h4>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Progress</p>
          <p className="text-xs font-bold text-primary">{Math.floor(progressPercentage)}%</p>
        </div>
      </div>
      
      <div className="relative pt-1">
        <Progress value={progressPercentage} className="h-2.5 bg-secondary border border-border/50" />
        <motion.div 
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute -top-1 right-0 h-4 w-4 bg-background rounded-full border-2 border-primary flex items-center justify-center shadow-lg"
          style={{ left: `${progressPercentage}%`, transform: 'translateX(-50%)' }}
        >
          <Crown className="h-2 w-2 text-primary" />
        </motion.div>
      </div>
      
      <div className="flex justify-between items-center text-[10px] font-medium text-muted-foreground px-0.5">
        <span>{currentXP} XP</span>
        <span>{nextLevelXP} XP to Level {level + 1}</span>
      </div>
    </div>
  );
};

export default XPProgressBar;
