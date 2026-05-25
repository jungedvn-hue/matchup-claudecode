import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Users, Trophy, Map, UserCircle, GraduationCap, Construction } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/i18n/LanguageContext";
import RefereesTab from "./discover/components/RefereesTab";
import CourtsTab from "./discover/components/CourtsTab";

const VALID_CATS = ["groups", "courts", "coaches", "tournaments", "players", "referees"] as const;
type Cat = (typeof VALID_CATS)[number];

const ComingSoon = ({ label }: { label: string }) => (
  <Card className="p-8 text-center text-sm text-muted-foreground space-y-2">
    <Construction className="h-8 w-8 mx-auto text-muted-foreground/30" />
    <p className="font-semibold">{label}</p>
  </Card>
);

const DiscoverPage = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const catParam = searchParams.get("cat") as Cat | null;
  const activeCat: Cat = catParam && VALID_CATS.includes(catParam) ? catParam : "groups";

  const setCat = (v: string) => {
    const next = new URLSearchParams(searchParams);
    if (v === "groups") next.delete("cat"); else next.set("cat", v);
    next.delete("sort");
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
            <h1 className="text-lg font-display font-bold text-foreground">{t("discover.title")}</h1>
            <p className="text-xs text-muted-foreground truncate">{t("discover.subtitle")}</p>
          </div>
        </div>
      </div>

      {activeCat === "referees" ? (
        <div className="px-4 pt-4 max-w-2xl mx-auto"><RefereesTab /></div>
      ) : (
      <Tabs value={activeCat} onValueChange={setCat} className="px-4 pt-4 max-w-2xl mx-auto">
        <TabsList className="grid w-full grid-cols-5 h-12">
          <TabsTrigger value="groups" className="flex flex-col gap-0.5 text-[10px]">
            <Users className="h-4 w-4" />
            {t("discover.groups")}
          </TabsTrigger>
          <TabsTrigger value="courts" className="flex flex-col gap-0.5 text-[10px]">
            <Map className="h-4 w-4" />
            {t("discover.courts")}
          </TabsTrigger>
          <TabsTrigger value="coaches" className="flex flex-col gap-0.5 text-[10px]">
            <GraduationCap className="h-4 w-4" />
            {t("discover.coaches")}
          </TabsTrigger>
          <TabsTrigger value="tournaments" className="flex flex-col gap-0.5 text-[10px]">
            <Trophy className="h-4 w-4" />
            {t("discover.tournaments")}
          </TabsTrigger>
          <TabsTrigger value="players" className="flex flex-col gap-0.5 text-[10px]">
            <UserCircle className="h-4 w-4" />
            {t("discover.players")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="groups" className="mt-4"><ComingSoon label={t("discover.comingSoon")} /></TabsContent>
        <TabsContent value="courts" className="mt-4"><CourtsTab /></TabsContent>
        <TabsContent value="coaches" className="mt-4"><ComingSoon label={t("discover.comingSoon")} /></TabsContent>
        <TabsContent value="tournaments" className="mt-4"><ComingSoon label={t("discover.comingSoon")} /></TabsContent>
        <TabsContent value="players" className="mt-4"><ComingSoon label={t("discover.comingSoon")} /></TabsContent>
      </Tabs>
      )}
    </div>
  );
};

export default DiscoverPage;
