import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, RefreshCw, TrendingUp, Users, Activity, DollarSign, Globe2, Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useLanguage } from "@/i18n/LanguageContext";
import { useInvestorBI } from "@/hooks/useInvestorBI";
import BIOverviewTab from "@/components/investor/BIOverviewTab";
import BIGrowthTab from "@/components/investor/BIGrowthTab";
import BIEngagementTab from "@/components/investor/BIEngagementTab";
import BIRevenueTab from "@/components/investor/BIRevenueTab";
import BIMarketTab from "@/components/investor/BIMarketTab";

const InvestorBIPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { data, loading, error, refresh } = useInvestorBI();

  const updatedLabel = useMemo(() => {
    if (!data) return "—";
    const mins = Math.floor((Date.now() - data.generatedAt) / 60000);
    if (mins < 1) return t("investorBI.justNow");
    return t("investorBI.minutesAgo", { n: mins });
  }, [data, t]);

  return (
    <div className="pb-20 min-h-screen">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate(-1)}
              className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <h1 className="text-base font-display font-bold truncate flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                {t("investorBI.title")}
              </h1>
              <p className="text-[10px] text-muted-foreground truncate">{t("investorBI.subtitle")}</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={refresh}
            disabled={loading}
            className="gap-1 h-8 px-2"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            <span className="text-[11px]">{t("investorBI.refresh")}</span>
          </Button>
        </div>
        <p className="text-[9px] text-muted-foreground mt-1 ml-12">
          {t("investorBI.lastUpdated")}: {updatedLabel}
        </p>
      </div>

      <div className="px-4 pt-4">
        {loading && !data && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        {error && (
          <Card className="p-4 border-destructive/40 bg-destructive/5 text-xs text-destructive">
            {error}
          </Card>
        )}

        {data && (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid grid-cols-5 w-full h-auto p-1">
              <TabsTrigger value="overview" className="flex-col gap-0.5 py-2 px-1 text-[10px]">
                <Users className="h-3.5 w-3.5" />
                {t("investorBI.tab.overview")}
              </TabsTrigger>
              <TabsTrigger value="growth" className="flex-col gap-0.5 py-2 px-1 text-[10px]">
                <TrendingUp className="h-3.5 w-3.5" />
                {t("investorBI.tab.growth")}
              </TabsTrigger>
              <TabsTrigger value="engagement" className="flex-col gap-0.5 py-2 px-1 text-[10px]">
                <Activity className="h-3.5 w-3.5" />
                {t("investorBI.tab.engagement")}
              </TabsTrigger>
              <TabsTrigger value="revenue" className="flex-col gap-0.5 py-2 px-1 text-[10px]">
                <DollarSign className="h-3.5 w-3.5" />
                {t("investorBI.tab.revenue")}
              </TabsTrigger>
              <TabsTrigger value="market" className="flex-col gap-0.5 py-2 px-1 text-[10px]">
                <Globe2 className="h-3.5 w-3.5" />
                {t("investorBI.tab.market")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4 space-y-3">
              <BIOverviewTab data={data} />
            </TabsContent>
            <TabsContent value="growth" className="mt-4 space-y-3">
              <BIGrowthTab data={data} />
            </TabsContent>
            <TabsContent value="engagement" className="mt-4 space-y-3">
              <BIEngagementTab data={data} />
            </TabsContent>
            <TabsContent value="revenue" className="mt-4 space-y-3">
              <BIRevenueTab data={data} />
            </TabsContent>
            <TabsContent value="market" className="mt-4 space-y-3">
              <BIMarketTab data={data} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default InvestorBIPage;
