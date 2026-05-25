import { cn } from "@/lib/utils";

type SkillLevel = "beginner" | "intermediate" | "advanced" | "pro";

const skillConfig: Record<SkillLevel, { label: string; class: string; rating: string }> = {
  beginner: { label: "Beginner", class: "skill-badge-beginner", rating: "2.0-2.5" },
  intermediate: { label: "Intermediate", class: "skill-badge-intermediate", rating: "3.0-3.5" },
  advanced: { label: "Advanced", class: "skill-badge-advanced", rating: "4.0-4.5" },
  pro: { label: "Pro", class: "skill-badge-pro", rating: "5.0+" },
};

interface SkillBadgeProps {
  level: SkillLevel;
  showRating?: boolean;
  className?: string;
}

const SkillBadge = ({ level, showRating = false, className }: SkillBadgeProps) => {
  const config = skillConfig[level];
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold", config.class, className)}>
      {config.label}
      {showRating && <span className="opacity-70">({config.rating})</span>}
    </span>
  );
};

export default SkillBadge;
export type { SkillLevel };
