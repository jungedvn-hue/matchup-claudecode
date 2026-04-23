import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Search, Trophy, Clock, CheckCircle2, Gavel, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useLanguage } from "@/i18n/LanguageContext";
import { useTournaments } from "@/context/TournamentContext";
import { useAuth } from "@/context/AuthContext";
import { getTournamentProgress } from "@/lib/tournament/engine";
import { toast } from "sonner";

const TourManagerPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { tournaments, updateTournament, deleteTournament } = useTournaments();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [showJoinRef, setShowJoinRef] = useState(false);
  const [accessCode, setAccessCode] = useState("");

  const filtered = tournaments.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.location.toLowerCase().includes(search.toLowerCase())
  );

  const active = filtered.filter((t) => t.status === "active" && t.host_id === user?.id);
  const draft = filtered.filter((t) => t.status === "draft" && t.host_id === user?.id);
  const completed = filtered.filter((t) => t.status === "completed" && t.host_id === user?.id);
  
  const refereeing = filtered.filter((t) => t.referees?.some(r => r.userId === user?.id));

  const handleJoinRef = () => {
    if (!user) {
      toast.error("Vui lòng đăng nhập!");
      return;
    }
    if (!accessCode.trim()) return;
    const target = tournaments.find(t => t.referees?.some(r => r.accessCode === accessCode.trim().toUpperCase()));
    if (!target) {
      toast.error("Không tìm thấy giải đấu!");
      return;
    }
    const ref = target.referees?.find(r => r.accessCode === accessCode.trim().toUpperCase());
    if (ref?.userId === user.id) {
      toast.success("Bạn đã tham gia giải này rồi!");
      setShowJoinRef(false);
      return;
    }
    if (ref?.userId) {
      toast.error("Mã này đã được người khác sử dụng!");
      return;
    }
    const updated = {
      ...target,
      referees: target.referees?.map(r => r.id === ref?.id ? { ...r, userId: user.id } : r)
    };
    updateTournament(updated);
    toast.success(t("tm.joinSuccess"));
    setShowJoinRef(false);
    setAccessCode("");
  };

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
            <div className="flex-1 min-w-0" onClick={() => navigate(`/tour-manager/${tournament.id}`)}>
              <h3 className="font-semibold text-foreground truncate">{tournament.name}</h3>
              <p className="text-xs text-muted-foreground truncate">{tournament.location}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={statusColor[tournament.status]}>
                {t(`tm.status.${tournament.status}`)}
              </Badge>
              
              {tournament.host_id === user?.id && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t("common.confirm")}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t("tm.deleteConfirmDesc") || "Hành động này không thể hoàn tác. Toàn bộ dữ liệu về các trận đấu và bảng xếp hạng của giải này sẽ bị xóa vĩnh viễn."}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => deleteTournament(tournament.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {t("common.delete")}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
          <div onClick={() => navigate(`/tour-manager/${tournament.id}`)}>
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
          </div>
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
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowJoinRef(true)}>
              <Gavel className="h-4 w-4 mr-1" />
              {t("tm.joinReferee")}
            </Button>
            <Button size="sm" onClick={() => navigate("/tour-manager/create")}>
              <Plus className="h-4 w-4 mr-1" />
              {t("tm.createNew")}
            </Button>
          </div>
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
            <TabsTrigger value="refereeing" className="flex-1 gap-1">
              <Gavel className="h-3.5 w-3.5" />
              {t("tm.referee")} {refereeing.length > 0 && `(${refereeing.length})`}
            </TabsTrigger>
          </TabsList>

          {(["active", "draft", "completed", "refereeing"] as const).map((tab) => {
            const list = tab === "active" ? active : tab === "draft" ? draft : tab === "completed" ? completed : refereeing;
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

      {/* Join Referee Dialog */}
      <Dialog open={showJoinRef} onOpenChange={setShowJoinRef}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gavel className="h-5 w-5 text-primary" /> {t("tm.joinReferee")}
            </DialogTitle>
            <DialogDescription>
              {t("tm.refereeJoinDesc") || "Enter the access code provided by the organizer to start managing matches."}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Access Code</Label>
              <Input
                placeholder="Ví dụ: A1B2C3"
                className="font-mono uppercase"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                maxLength={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowJoinRef(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleJoinRef}>{t("common.confirm")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TourManagerPage;
