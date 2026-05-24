import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Gavel, CalendarClock, Mail, UserCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/i18n/LanguageContext";
import OverviewTab from "./components/OverviewTab";
import ScheduleTab from "./components/ScheduleTab";
import InvitesTab from "./components/InvitesTab";
import ProfileTab from "./components/ProfileTab";

const VALID_TABS = ["overview", "schedule", "invites", "profile"] as const;
type TabKey = (typeof VALID_TABS)[number];

const RefereeHub = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab") as TabKey | null;
  const activeTab: TabKey = tabParam && VALID_TABS.includes(tabParam) ? tabParam : "overview";

  const setTab = (v: string) => {
    const next = new URLSearchParams(searchParams);
    if (v === "overview") next.delete("tab"); else next.set("tab", v);
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="pb-24 min-h-screen">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button onClick={() => navigate(-1)} className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg font-display font-bold text-foreground">{t("refHub.title")}</h1>
            <p className="text-xs text-muted-foreground truncate">{t("refHub.subtitle")}</p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setTab} className="px-4 pt-4 max-w-2xl mx-auto">
        <TabsList className="grid w-full grid-cols-4 h-12">
          <TabsTrigger value="overview" className="flex flex-col gap-0.5 text-[10px]">
            <Gavel className="h-4 w-4" />
            {t("refHub.tab.overview")}
          </TabsTrigger>
          <TabsTrigger value="schedule" className="flex flex-col gap-0.5 text-[10px]">
            <CalendarClock className="h-4 w-4" />
            {t("refHub.tab.schedule")}
          </TabsTrigger>
          <TabsTrigger value="invites" className="flex flex-col gap-0.5 text-[10px]">
            <Mail className="h-4 w-4" />
            {t("refHub.tab.invites")}
          </TabsTrigger>
          <TabsTrigger value="profile" className="flex flex-col gap-0.5 text-[10px]">
            <UserCircle className="h-4 w-4" />
            {t("refHub.tab.profile")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4"><OverviewTab /></TabsContent>
        <TabsContent value="schedule" className="mt-4"><ScheduleTab /></TabsContent>
        <TabsContent value="invites" className="mt-4"><InvitesTab /></TabsContent>
        <TabsContent value="profile" className="mt-4"><ProfileTab /></TabsContent>
      </Tabs>
    </div>
  );
};

export default RefereeHub;
