import { ReactNode } from "react";
import { Users, Activity, Trophy, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

export type BrandPillar = "connect" | "play" | "compete" | "community";

const PILLAR_ICON: Record<BrandPillar, typeof Users> = {
  connect: Users,
  play: Activity,
  compete: Trophy,
  community: LayoutGrid,
};

interface Props {
  pillar: BrandPillar;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

const BrandEmptyState = ({ pillar, title, description, action, className }: Props) => {
  const Icon = PILLAR_ICON[pillar];
  return (
    <div className={cn("py-14 flex flex-col items-center text-center px-6", className)}>
      <div className="relative mb-5">
        <div className="absolute inset-0 rounded-full bg-primary/15 blur-xl" aria-hidden />
        <div className="relative h-20 w-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Icon className="h-9 w-9 text-primary" strokeWidth={2} />
        </div>
      </div>
      <p className="font-display font-bold text-base text-foreground">{title}</p>
      {description && (
        <p className="mt-1.5 text-sm text-muted-foreground max-w-xs leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
};

export default BrandEmptyState;
