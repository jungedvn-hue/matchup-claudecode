import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Search, Trophy, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/i18n/LanguageContext";
import { useTournaments } from "@/context/TournamentContext";
import { getTournamentProgress } from "@/lib/tournament/engine";

const TourManagerPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { tournaments, deleteTournament } = useTournaments();
  const [search, setSearch] = useState("");

  const filtered = tournaments.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.location.toLowerCase().includes(search.toLowerCase())
  );

  const active = filtered.filter((t) => t.status === "active");
  const draft = filtered.filter((t) => t.status === "draft");
  const completed = filtered.filter((t) => t.status === "completed");

  const statusColor = {
    draft: "secondary" as const,
    active: "default" as const,
    completed: "outline" as const,
  };

  const TournamentCard = ({ tournament }: { tournament: typeof tournaments[0] }) => {
    const allMatches = tournament.categories.flatMap((c) => [
      ...c.pools.flatMap((p) => p.matches),
      ...c.bracketRounds.flatMap((r) => r.matches),
    ]);
    const progress = getTournamentProgress(allMatches);

    return (
      <Card
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => navigate(`/tour-manager/${tournament.id}`)}
      >
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="font-semibold text-foreground">{tournament.name}</h3>
              <p className="text-xs text-muted-foreground">{tournament.location}</p>
            </div>
            <Badge variant={statusColor[tournament.status]}>
              {t(`tm.status.${tournament.status}`)}
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
            <span>{tournament.date}</span>
            <span>•</span>
            <span>{tournament.categories.length} {t("tm.categories")}</span>
            <span>•</span>
            <span>{t(`tm.format.${tournament.format}`)}</span>
          </div>
          {tournament.status === "active" && progress.total > 0 && (
            <div className="mt-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">{t("tm.progress")}</span>
                <span className="font-medium text-foreground">{progress.pct}%</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${progress.pct}%` }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                {t("tm.title")}
              </h1>
            </div>
          </div>
          <Button size="sm" onClick={() => navigate("/tour-manager/create")}>
            <Plus className="h-4 w-4 mr-1" />
            {t("tm.createNew")}
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("tm.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      <div className="px-4 pt-4">
        <Tabs defaultValue="active">
          <TabsList className="w-full">
            <TabsTrigger value="active" className="flex-1 gap-1">
              <Clock className="h-3.5 w-3.5" />
              {t("tm.active")} {active.length > 0 && `(${active.length})`}
            </TabsTrigger>
            <TabsTrigger value="draft" className="flex-1">
              {t("tm.drafts")} {draft.length > 0 && `(${draft.length})`}
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex-1 gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {t("tm.completed")}
            </TabsTrigger>
          </TabsList>

          {(["active", "draft", "completed"] as const).map((tab) => {
            const list = tab === "active" ? active : tab === "draft" ? draft : completed;
            return (
              <TabsContent key={tab} value={tab} className="space-y-3 mt-3">
                {list.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Trophy className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p>{t("tm.noTournaments")}</p>
                    {tab === "active" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={() => navigate("/tour-manager/create")}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        {t("tm.createFirst")}
                      </Button>
                    )}
                  </div>
                ) : (
                  list.map((t) => <TournamentCard key={t.id} tournament={t} />)
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </div>
  );
};

export default TourManagerPage;
