import { Card } from "@/components/ui/card";
import { useLanguage } from "@/i18n/LanguageContext";
import type { InvestorBIData } from "@/hooks/useInvestorBI";
import { Trophy, Target, Globe2, Sparkles } from "lucide-react";

const WORLD_CUP_DATE = new Date("2026-08-30T00:00:00Z").getTime();

const BIMarketTab = ({ data: _data }: { data: InvestorBIData }) => {
  const { t } = useLanguage();
  const daysToGo = Math.max(0, Math.ceil((WORLD_CUP_DATE - Date.now()) / 86_400_000));

  return (
    <div className="space-y-3">
      {/* World Cup countdown */}
      <Card className="p-4 border-primary/40 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
        <div className="flex items-center gap-2 mb-2">
          <Trophy className="h-4 w-4 text-primary" />
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
            {t("investorBI.market.worldCupCountdown")}
          </p>
        </div>
        <p className="text-3xl font-stat font-bold text-primary">
          {daysToGo} <span className="text-sm text-muted-foreground font-normal">{t("investorBI.market.daysToGo")}</span>
        </p>
        <p className="text-[10px] text-muted-foreground mt-1">{t("investorBI.market.eventDate")}</p>
        <p className="text-[10px] text-muted-foreground italic">{t("investorBI.market.eventDetails")}</p>
      </Card>

      {/* PMF Score */}
      <Card className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <Target className="h-4 w-4 text-primary" />
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
            {t("investorBI.market.pmfScore")}
          </p>
        </div>
        <div className="flex items-baseline gap-2">
          <p className="text-3xl font-stat font-bold text-primary">82</p>
          <p className="text-sm text-muted-foreground font-stat">/ 100</p>
        </div>
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden mt-2">
          <div className="h-full bg-primary" style={{ width: "82%" }} />
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 italic">{t("investorBI.market.pmfBreakdown")}</p>
      </Card>

      {/* Vietnam stats */}
      <Card className="p-3">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-primary" />
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
            {t("investorBI.market.vnStats")}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2 rounded-lg bg-secondary/50">
            <p className="text-[9px] text-muted-foreground">{t("investorBI.market.awareness")}</p>
            <p className="text-lg font-stat font-bold text-primary">88%</p>
          </div>
          <div className="p-2 rounded-lg bg-secondary/50">
            <p className="text-[9px] text-muted-foreground">{t("investorBI.market.duprGrowth")}</p>
            <p className="text-lg font-stat font-bold text-primary">+184%</p>
          </div>
          <div className="p-2 rounded-lg bg-secondary/50">
            <p className="text-[9px] text-muted-foreground">{t("investorBI.market.tam")}</p>
            <p className="text-lg font-stat font-bold text-primary">$9.1B</p>
          </div>
          <div className="p-2 rounded-lg bg-secondary/50">
            <p className="text-[9px] text-muted-foreground">{t("investorBI.market.cagr")}</p>
            <p className="text-lg font-stat font-bold text-primary">15–16%</p>
          </div>
        </div>
      </Card>

      {/* Global vision roadmap */}
      <Card className="p-3">
        <div className="flex items-center gap-2 mb-3">
          <Globe2 className="h-4 w-4 text-primary" />
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
            {t("investorBI.market.globalVision")}
          </p>
        </div>
        <ul className="space-y-1.5">
          {[
            t("investorBI.market.phase1"),
            t("investorBI.market.phase2"),
            t("investorBI.market.phase3"),
            t("investorBI.market.phase4"),
          ].map((p, i) => (
            <li key={i} className="flex items-start gap-2 text-[11px]">
              <span className="text-primary font-mono font-bold mt-0.5">›</span>
              <span>{p}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
};

export default BIMarketTab;
