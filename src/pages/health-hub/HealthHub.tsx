import { Activity, TrendingUp, Utensils, Watch } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/i18n/LanguageContext";
import DashboardTab from "./components/DashboardTab";
import StatsTab from "./components/StatsTab";
import NutritionTab from "./components/NutritionTab";
import DevicesTab from "./components/DevicesTab";

const HealthHub = () => {
  const { t } = useLanguage();

  return (
    <div className="pb-24 min-h-screen">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3">
        <h1 className="text-lg font-display font-bold text-foreground">{t("health.title")}</h1>
        <p className="text-xs text-muted-foreground">{t("health.subtitle")}</p>
      </div>

      <Tabs defaultValue="dashboard" className="px-4 pt-4">
        <TabsList className="grid w-full grid-cols-4 h-12">
          <TabsTrigger value="dashboard" className="flex flex-col gap-0.5 text-[10px]">
            <Activity className="h-4 w-4" />
            {t("health.tab.dashboard")}
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex flex-col gap-0.5 text-[10px]">
            <TrendingUp className="h-4 w-4" />
            {t("health.tab.stats")}
          </TabsTrigger>
          <TabsTrigger value="nutrition" className="flex flex-col gap-0.5 text-[10px]">
            <Utensils className="h-4 w-4" />
            {t("health.tab.nutrition")}
          </TabsTrigger>
          <TabsTrigger value="devices" className="flex flex-col gap-0.5 text-[10px]">
            <Watch className="h-4 w-4" />
            {t("health.tab.devices")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-4">
          <DashboardTab />
        </TabsContent>
        <TabsContent value="stats" className="mt-4">
          <StatsTab />
        </TabsContent>
        <TabsContent value="nutrition" className="mt-4">
          <NutritionTab />
        </TabsContent>
        <TabsContent value="devices" className="mt-4">
          <DevicesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default HealthHub;
