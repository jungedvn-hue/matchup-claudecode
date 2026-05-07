import { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  unit?: string;
  hint?: string;
  accent?: "primary" | "accent" | "muted" | "destructive";
}

const ACCENT_BORDER: Record<NonNullable<MetricCardProps["accent"]>, string> = {
  primary: "border-l-primary",
  accent: "border-l-accent",
  muted: "border-l-muted-foreground",
  destructive: "border-l-destructive",
};

const MetricCard = ({ icon: Icon, label, value, unit, hint, accent = "primary" }: MetricCardProps) => (
  <Card className={`p-3 shadow-card border-l-4 ${ACCENT_BORDER[accent]}`}>
    <div className="flex items-center gap-1.5 mb-1.5">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">{label}</p>
    </div>
    <div className="flex items-baseline gap-1">
      <span className="text-xl font-display font-bold text-card-foreground">{value}</span>
      {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
    </div>
    {hint && <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>}
  </Card>
);

export default MetricCard;
