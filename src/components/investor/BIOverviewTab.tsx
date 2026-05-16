import { Card } from "@/components/ui/card";
import { useLanguage } from "@/i18n/LanguageContext";
import type { InvestorBIData } from "@/hooks/useInvestorBI";
import {
  Users, Layers, Activity, Trophy, Flag, Crown, Coins, MousePointerClick,
} from "lucide-react";

const fmt = (n: number) => new Intl.NumberFormat("en-US").format(n);

const Kpi = ({
  icon: Icon, label, value, accent,
}: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; accent?: boolean }) => (
  <Card className={`p-3 ${accent ? "border-primary/40 bg-primary/5" : ""}`}>
    <div className="flex items-center gap-2">
      <Icon className={`h-3.5 w-3.5 ${accent ? "text-primary" : "text-muted-foreground"}`} />
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
    </div>
    <p className="text-xl font-stat font-bold mt-1">{value}</p>
  </Card>
);

const BIOverviewTab = ({ data }: { data: InvestorBIData }) => {
  const { t } = useLanguage();
  return (
    <div className="grid grid-cols-2 gap-2">
      <Kpi icon={Users} label={t("investorBI.overview.totalUsers")} value={fmt(data.totalUsers)} accent />
      <Kpi icon={Layers} label={t("investorBI.overview.totalGroups")} value={fmt(data.totalGroups)} />
      <Kpi icon={Activity} label={t("investorBI.overview.totalSessions")} value={fmt(data.totalSessions)} />
      <Kpi icon={Trophy} label={t("investorBI.overview.totalTournaments")} value={fmt(data.totalTournaments)} />
      <Kpi icon={Crown} label={t("investorBI.overview.totalHosts")} value={fmt(data.totalHosts)} />
      <Kpi icon={Flag} label={t("investorBI.overview.totalReferees")} value={fmt(data.totalReferees)} />
      <Kpi icon={Coins} label={t("investorBI.overview.coinVolume")} value={fmt(data.coinVolume30d)} accent />
      <Kpi icon={MousePointerClick} label={t("investorBI.overview.affiliateClicks")} value={fmt(data.affiliateClicks30d)} />
    </div>
  );
};

export default BIOverviewTab;
