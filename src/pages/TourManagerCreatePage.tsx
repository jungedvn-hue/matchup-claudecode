import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, ChevronRight, ArrowUp, ArrowDown, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/i18n/LanguageContext";
import { useTournaments } from "@/context/TournamentContext";
import { toast } from "sonner";
import {
  Tournament,
  TournamentCategory,
  TournamentFormat,
  CategoryType,
  SkillLevel,
  TournamentReferee,
  TournamentCourt,
  RankingCriterion,
} from "@/lib/tournament/types";
import { useAuth } from "@/context/AuthContext";
import { useEffect } from "react";

const CATEGORY_OPTIONS: { value: CategoryType; label: string }[] = [
  { value: "singles", label: "Singles" },
  { value: "mens_doubles", label: "Men's Doubles" },
  { value: "womens_doubles", label: "Women's Doubles" },
  { value: "mixed_doubles", label: "Mixed Doubles" },
];

const TourManagerCreatePage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { addTournament, refreshTournaments } = useTournaments();
  const { user } = useAuth();
  const [step, setStep] = useState(1);

  useEffect(() => {
    if (!user) {
      toast.error("Vui lòng đăng nhập để sử dụng tính năng này");
      navigate("/auth");
    }
  }, [user, navigate]);

  // Step 1
  const [name, setName] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [location, setLocation] = useState("");
  const [format, setFormat] = useState<TournamentFormat>("round_robin");
  const [pointsPerGame, setPointsPerGame] = useState(11);
  const [winByTwo, setWinByTwo] = useState(true);
  const [courts, setCourts] = useState(4);
  const [matchDuration, setMatchDuration] = useState(20);
  const [playersPerPool, setPlayersPerPool] = useState(4);
  const [rankingPriority, setRankingPriority] = useState<RankingCriterion[]>([
    "wins", "head_to_head", "point_diff", "points_scored"
  ]);


  // Step 2
  const [categories, setCategories] = useState<
    { type: CategoryType; name: string; skillFilter?: SkillLevel; maxEntries?: number; advancingPerPool: number; wildcardCount: number }[]
  >([]);
  const [newCatType, setNewCatType] = useState<CategoryType>("singles");

  // Step 3
  const [playerInputs, setPlayerInputs] = useState<Record<string, string>>({});
  const [bulkText, setBulkText] = useState<Record<string, string>>({});

  // Step 4 - Resources
  const [courtNames, setCourtNames] = useState<string[]>([]);
  const [refereeBulk, setRefereeBulk] = useState("");

  const addCategory = () => {
    const opt = CATEGORY_OPTIONS.find((c) => c.value === newCatType);
    if (!opt || categories.find((c) => c.type === newCatType)) return;
    setCategories([...categories, { 
      type: opt.value, 
      name: opt.label, 
      advancingPerPool: 2, 
      wildcardCount: 0 
    }]);
  };

  const removeCategory = (type: CategoryType) => {
    setCategories(categories.filter((c) => c.type !== type));
  };

  const parsePlayers = (catType: string) => {
    const text = bulkText[catType] || "";
    const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((name, i) => ({
        id: `p-${catType}-${stamp}-${i}`,
        name,
      }));
  };

  const canProceed = () => {
    if (step === 1) return name && date && location;
    if (step === 2) return categories.length > 0;
    if (step === 3) {
      return categories.every((c) => parsePlayers(c.type).length >= 3);
    }
    // Step 4 is optional (referees/courts are nice-to-have)
    return true;
  };

  const parseReferees = (): TournamentReferee[] => {
    return refereeBulk
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((name, i) => ({ id: `ref-${i}`, name }));
  };

  const buildCourts = (): TournamentCourt[] => {
    const names = courtNames.length > 0 ? courtNames : Array.from({ length: courts }, (_, i) => `Court ${i + 1}`);
    return names.map((name, i) => ({ id: `court-${i}`, name }));
  };

  const moveCriterion = (index: number, direction: "up" | "down") => {
    const newPriority = [...rankingPriority];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newPriority.length) return;
    [newPriority[index], newPriority[targetIndex]] = [newPriority[targetIndex], newPriority[index]];
    setRankingPriority(newPriority);
  };

  const handleCreate = async () => {
    const tourCategories: TournamentCategory[] = categories.map((c) => ({
      id: `cat-${c.type}-${Date.now()}`,
      type: c.type,
      name: c.name,
      skillFilter: c.skillFilter,
      maxEntries: c.maxEntries,
      entries: parsePlayers(c.type),
      pools: [],
      bracketRounds: [],
      advancingPerPool: c.advancingPerPool,
      wildcardCount: c.wildcardCount,
      poolAllocationMode: "auto",
    }));

    const tournament: Tournament = {
      id: `tour-${Date.now()}`,
      name,
      date,
      location,
      format,
      pointsPerGame,
      winByTwo,
      courtsAvailable: courts,
      matchDuration,
      playersPerPool,
      rankingPriority,
      categories: tourCategories,
      referees: parseReferees(),
      courts: buildCourts(),
      status: "draft",
      createdAt: new Date().toISOString(),
      host_id: user?.id,
    };

    try {
      await addTournament(tournament);
      await refreshTournaments();
      toast.success(t("tm.created"));
      navigate(`/tour-manager/${tournament.id}`);
    } catch (error) {
      // toast is already handled in context, but we could add specific UI logic here
    }
  };

  return (
    <div className="pb-24">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate("/tour-manager")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold text-foreground">{t("tm.createTitle")}</h1>
            <p className="text-xs text-muted-foreground">
              {t("tm.step")} {step}/4
            </p>
          </div>
        </div>
        {/* Progress bar */}
        <div className="flex gap-1 mt-2">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full ${s <= step ? "bg-primary" : "bg-muted"}`}
            />
          ))}
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Step 1: Tournament Setup */}
        {step === 1 && (
          <>
            <div className="space-y-3">
              <div>
                <Label>{t("tm.tournamentName")}</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("tm.tournamentNamePh")} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t("tm.date")}</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div>
                  <Label>{t("tm.location")}</Label>
                  <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder={t("tm.locationPh")} />
                </div>
              </div>
              <div>
                <Label>{t("tm.format")}</Label>
                <Select value={format} onValueChange={(v) => setFormat(v as TournamentFormat)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="round_robin">{t("tm.format.round_robin")}</SelectItem>
                    <SelectItem value="knockout">{t("tm.format.knockout")}</SelectItem>
                    <SelectItem value="hybrid">{t("tm.format.hybrid")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t("tm.pointsPerGame")}</Label>
                  <Select value={String(pointsPerGame)} onValueChange={(v) => setPointsPerGame(Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="11">11</SelectItem>
                      <SelectItem value="15">15</SelectItem>
                      <SelectItem value="21">21</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-2 pb-1">
                  <Switch checked={winByTwo} onCheckedChange={setWinByTwo} />
                  <Label className="text-sm">{t("tm.winByTwo")}</Label>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t("tm.courts")}</Label>
                  <Input type="number" min={1} value={courts} onChange={(e) => setCourts(Number(e.target.value))} />
                </div>
                <div>
                  <Label>{t("tm.matchDuration")}</Label>
                  <Input type="number" min={5} value={matchDuration} onChange={(e) => setMatchDuration(Number(e.target.value))} />
                </div>
              </div>
              <div>
                <Label>{t("tm.playersPerPool")}</Label>
                <Select value={String(playersPerPool)} onValueChange={(v) => setPlayersPerPool(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="4">4</SelectItem>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="6">6</SelectItem>
                    <SelectItem value="8">8</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Ranking Priority UI */}
              <div className="space-y-2 pt-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1">
                  {t("tm.rankingTitle") || "Ranking Priority"}
                </Label>
                <div className="space-y-1.5">
                  {rankingPriority.map((criterion, idx) => (
                    <div key={criterion} className="flex items-center gap-2 p-2 bg-secondary/50 rounded-lg border border-border/50">
                      <span className="flex-1 text-sm font-medium">{idx + 1}. {t(`tm.ranking.${criterion}`)}</span>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost" 
                          type="button"
                          size="icon" 
                          className="h-7 w-7 rounded-md hover:bg-background"
                          onClick={() => moveCriterion(idx, "up")}
                          disabled={idx === 0}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost" 
                          type="button"
                          size="icon" 
                          className="h-7 w-7 rounded-md hover:bg-background"
                          onClick={() => moveCriterion(idx, "down")}
                          disabled={idx === rankingPriority.length - 1}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground italic">
                  * {t("tm.rankingHint") || "System compares sequentially from top to bottom."}
                </p>
              </div>
            </div>
          </>
        )}

        {/* Step 2: Categories */}
        {step === 2 && (
          <>
            <div className="flex gap-2">
              <Select value={newCatType} onValueChange={(v) => setNewCatType(v as CategoryType)}>
                <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.filter((o) => !categories.find((c) => c.type === o.value)).map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={addCategory} disabled={categories.find((c) => c.type === newCatType) !== undefined}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3">
              {categories.map((cat) => (
                <Card key={cat.type} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex items-center justify-between gap-2 px-4 py-3 bg-muted/30 border-b border-border">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="h-7 w-7 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <Trophy className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-foreground truncate">{cat.name}</p>
                          {cat.skillFilter && (
                            <Badge variant="secondary" className="text-[10px] h-4 px-1.5 mt-0.5">{cat.skillFilter}</Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => removeCategory(cat.type)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4">
                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-semibold text-foreground/80">
                          {t("tm.advancingPerPool")}
                        </Label>
                        <Input
                          type="number"
                          min={1}
                          value={cat.advancingPerPool}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 2;
                            setCategories(categories.map(c => c.type === cat.type ? { ...c, advancingPerPool: val } : c));
                          }}
                          className="h-9 text-sm"
                        />
                        <p className="text-[10px] text-muted-foreground leading-tight">{t("tm.advancingPerPoolHint")}</p>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-semibold text-foreground/80">
                          {t("tm.wildcardLogic")}
                        </Label>
                        <Select
                          value={String(cat.wildcardCount)}
                          onValueChange={(v) => {
                            const val = parseInt(v) || 0;
                            setCategories(categories.map(c => c.type === cat.type ? { ...c, wildcardCount: val } : c));
                          }}
                        >
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0" className="text-sm">{t("tm.wildcard.bye")}</SelectItem>
                            <SelectItem value="-1" className="text-sm">{t("tm.wildcard.best3rd")}</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-[10px] text-muted-foreground leading-tight">{t("tm.wildcardHint")}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {categories.length === 0 && (
                <p className="text-center text-muted-foreground py-8">{t("tm.addCategoryHint")}</p>
              )}
            </div>
          </>
        )}

        {/* Step 3: Players */}
        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{t("tm.playerInputHint")}</p>
            {categories.map((cat) => {
              const players = parsePlayers(cat.type);
              return (
                <Card key={cat.type}>
                  <CardContent className="p-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <p className="font-medium text-foreground">{cat.name}</p>
                      <Badge variant="secondary">{players.length} {t("tm.players")}</Badge>
                    </div>
                    <textarea
                      className="w-full h-32 p-2 text-sm border rounded-md bg-background text-foreground border-input resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                      placeholder={t("tm.playerListPh")}
                      value={bulkText[cat.type] || ""}
                      onChange={(e) => setBulkText({ ...bulkText, [cat.type]: e.target.value })}
                    />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Step 4: Resources */}
        {step === 4 && (
          <div className="space-y-4">
            {/* Court Setup */}
            <Card>
              <CardContent className="p-3 space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-foreground">{t("tm.courtSetup")}</p>
                    <p className="text-xs text-muted-foreground">{t("tm.courtSetupHint")}</p>
                  </div>
                  <Badge variant="secondary">{courts} {t("tm.courtCount")}</Badge>
                </div>
                <div className="space-y-2">
                  {Array.from({ length: courts }, (_, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-6">{i + 1}.</span>
                      <Input
                        className="h-8 text-sm"
                        placeholder={`Court ${i + 1}`}
                        value={courtNames[i] || ""}
                        onChange={(e) => {
                          const updated = [...courtNames];
                          while (updated.length <= i) updated.push("");
                          updated[i] = e.target.value;
                          setCourtNames(updated);
                        }}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Referee Setup */}
            <Card>
              <CardContent className="p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-foreground">{t("tm.refereeSetup")}</p>
                    <p className="text-xs text-muted-foreground">{t("tm.refereeSetupHint")}</p>
                  </div>
                  <Badge variant="secondary">
                    {refereeBulk.split("\n").filter((l) => l.trim()).length} {t("tm.refereeCount")}
                  </Badge>
                </div>
                <textarea
                  className="w-full h-32 p-2 text-sm border rounded-md bg-background text-foreground border-input resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder={t("tm.refereeListPh")}
                  value={refereeBulk}
                  onChange={(e) => setRefereeBulk(e.target.value)}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 pt-2">
          {step > 1 && (
            <Button variant="outline" className="flex-1" onClick={() => setStep(step - 1)}>
              {t("common.back")}
            </Button>
          )}
          {step < 4 ? (
            <Button className="flex-1" disabled={!canProceed()} onClick={() => setStep(step + 1)}>
              {t("common.next")} <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button className="flex-1" disabled={!canProceed()} onClick={handleCreate}>
              {t("tm.createTournament")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TourManagerCreatePage;
