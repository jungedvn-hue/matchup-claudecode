import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trophy, CheckCircle2, Search, X, User } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/i18n/LanguageContext";
import { useCreateMatch, usePlayerSearch, type MatchFormat, type PlayerSearchResult, type SetScore } from "@/hooks/useMatches";

interface LogMatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

type PickerSlot = "opponent" | "referee" | "partner" | "opponent_partner";

const LogMatchDialog = ({ open, onOpenChange, onCreated }: LogMatchDialogProps) => {
  const { t } = useLanguage();
  const [step, setStep] = useState(1);
  const [format, setFormat] = useState<MatchFormat>("singles");

  const [opponent, setOpponent] = useState<PlayerSearchResult | null>(null);
  const [referee, setReferee] = useState<PlayerSearchResult | null>(null);
  const [partner, setPartner] = useState<PlayerSearchResult | null>(null);
  const [opponentPartner, setOpponentPartner] = useState<PlayerSearchResult | null>(null);

  const [picker, setPicker] = useState<PickerSlot | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { results, search, searching } = usePlayerSearch();
  useEffect(() => { if (picker) search(searchTerm); }, [searchTerm, picker, search]);

  const [sets, setSets] = useState<SetScore[]>([{ submitter: 0, opponent: 0 }, { submitter: 0, opponent: 0 }]);
  const [setInputs, setSetInputs] = useState<Array<{ s: string; o: string }>>([{ s: "", o: "" }, { s: "", o: "" }]);

  const { createMatch, submitting } = useCreateMatch();

  const reset = () => {
    setStep(1);
    setFormat("singles");
    setOpponent(null); setReferee(null); setPartner(null); setOpponentPartner(null);
    setPicker(null); setSearchTerm("");
    setSets([{ submitter: 0, opponent: 0 }, { submitter: 0, opponent: 0 }]);
    setSetInputs([{ s: "", o: "" }, { s: "", o: "" }]);
  };

  const close = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handlePick = (p: PlayerSearchResult) => {
    if (picker === "opponent") setOpponent(p);
    else if (picker === "referee") setReferee(p);
    else if (picker === "partner") setPartner(p);
    else if (picker === "opponent_partner") setOpponentPartner(p);
    setPicker(null);
    setSearchTerm("");
  };

  const handleNext = () => {
    if (step === 1) {
      if (!opponent) { toast.error(t("matches.log.toast.pickOpponent")); return; }
      if (format === "doubles" && (!partner || !opponentPartner)) {
        toast.error(t("matches.log.toast.pickPartners") || "Vui lòng chọn đầy đủ partner cho doubles");
        return;
      }
      setStep(2);
    }
  };

  const updateSetInput = (idx: number, side: "s" | "o", val: string) => {
    const next = [...setInputs];
    next[idx] = { ...next[idx], [side]: val };
    setSetInputs(next);
  };

  const addSet = () => {
    if (setInputs.length >= 5) return;
    setSetInputs([...setInputs, { s: "", o: "" }]);
  };

  const removeSet = (idx: number) => {
    if (setInputs.length <= 1) return;
    setSetInputs(setInputs.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!opponent) return;
    const parsedSets: SetScore[] = setInputs
      .map(s => ({ submitter: parseInt(s.s, 10), opponent: parseInt(s.o, 10) }))
      .filter(s => !isNaN(s.submitter) && !isNaN(s.opponent));
    if (parsedSets.length === 0) {
      toast.error(t("matches.log.toast.pickScores") || "Vui lòng nhập điểm số");
      return;
    }
    const result = await createMatch({
      opponentUserId: opponent.user_id,
      refereeUserId: referee?.user_id ?? null,
      format,
      partnerUserId: partner?.user_id ?? null,
      opponentPartnerUserId: opponentPartner?.user_id ?? null,
      sets: parsedSets,
    });
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success(t("matches.log.toast.submitted"), { description: t("matches.log.toast.submittedDesc") });
    onCreated?.();
    close(false);
  };

  const renderSlot = (label: string, value: PlayerSearchResult | null, slot: PickerSlot, optional = false) => (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}{optional ? <span className="text-muted-foreground"> ({t("common.optional") || "tùy chọn"})</span> : null}</Label>
      <button
        type="button"
        onClick={() => { setPicker(slot); setSearchTerm(""); }}
        className="w-full flex items-center gap-2 h-10 px-3 rounded-lg border border-input bg-background hover:border-primary/40 transition-colors text-left"
      >
        {value ? (
          <>
            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
              {value.display_name?.[0]?.toUpperCase() || "?"}
            </div>
            <span className="text-sm text-foreground flex-1 truncate">{value.display_name || "Unknown"}</span>
            <span className="text-[10px] text-muted-foreground tabular-nums">{value.dupr_rating?.toFixed(2)}</span>
          </>
        ) : (
          <>
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{t("matches.log.selectPlayer") || "Chọn người chơi…"}</span>
          </>
        )}
      </button>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            {t("matches.log.title")}
          </DialogTitle>
          <DialogDescription>{t("matches.log.subtitle")}</DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {picker ? (
            <motion.div key="picker" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3 py-2">
              <div className="flex items-center gap-2">
                <button onClick={() => setPicker(null)} className="text-xs text-muted-foreground hover:text-foreground">← {t("common.back") || "Quay lại"}</button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  autoFocus
                  placeholder={t("matches.log.searchPh") || "Tìm theo tên..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="max-h-[280px] overflow-y-auto space-y-1">
                {searching && <p className="text-xs text-muted-foreground py-2 text-center">…</p>}
                {!searching && searchTerm.length >= 2 && results.length === 0 && (
                  <p className="text-xs text-muted-foreground py-4 text-center">{t("matches.log.noResults") || "Không tìm thấy"}</p>
                )}
                {results.map(p => (
                  <button
                    key={p.user_id}
                    onClick={() => handlePick(p)}
                    className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-secondary text-left transition-colors"
                  >
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {p.display_name?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.display_name || "Unknown"}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">{p.skill_level || "-"}</p>
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums">{p.dupr_rating?.toFixed(2)}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          ) : step === 1 ? (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs">{t("matches.log.format")}</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(["singles", "doubles"] as const).map(f => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFormat(f)}
                      className={`h-9 rounded-lg text-sm font-medium border transition-colors ${
                        format === f ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:border-primary/30"
                      }`}
                    >
                      {t(`matches.log.${f}`)}
                    </button>
                  ))}
                </div>
              </div>

              {renderSlot(t("matches.log.opponent"), opponent, "opponent")}
              {format === "doubles" && (
                <>
                  {renderSlot(t("matches.log.partner") || "Đồng đội của bạn", partner, "partner")}
                  {renderSlot(t("matches.log.opponentPartner") || "Đồng đội đối thủ", opponentPartner, "opponent_partner")}
                </>
              )}
              {renderSlot(t("matches.log.referee"), referee, "referee", true)}
            </motion.div>
          ) : (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4 py-2">
              <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-xl border border-border">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                  {opponent?.display_name?.[0]?.toUpperCase() || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">{t("matches.log.opponentLabel")}</p>
                  <p className="text-sm font-bold truncate">{opponent?.display_name}</p>
                </div>
              </div>

              <div className="space-y-2">
                {setInputs.map((s, idx) => (
                  <div key={idx} className="grid grid-cols-[auto,1fr,1fr,auto] gap-2 items-center">
                    <span className="text-xs font-bold text-muted-foreground uppercase w-12">Set {idx + 1}</span>
                    <Input
                      type="number"
                      placeholder={t("matches.log.youPh")}
                      value={s.s}
                      onChange={e => updateSetInput(idx, "s", e.target.value)}
                      className="text-center font-bold tabular-nums h-9"
                    />
                    <Input
                      type="number"
                      placeholder={t("matches.log.opponentScorePh")}
                      value={s.o}
                      onChange={e => updateSetInput(idx, "o", e.target.value)}
                      className="text-center font-bold tabular-nums h-9"
                    />
                    {setInputs.length > 1 ? (
                      <button onClick={() => removeSet(idx)} className="h-9 w-9 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex items-center justify-center">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    ) : <div className="w-9" />}
                  </div>
                ))}
                {setInputs.length < 5 && (
                  <Button variant="outline" size="sm" onClick={addSet} className="w-full h-8 text-xs">
                    + Set {setInputs.length + 1}
                  </Button>
                )}
              </div>

              <div className="p-3 bg-primary/5 rounded-lg flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p className="text-[10px] text-muted-foreground">
                  {t("matches.log.notice", { opponent: opponent?.display_name ?? "" })}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!picker && (
          <DialogFooter className="flex flex-row gap-2 sm:justify-end">
            {step === 2 && (
              <Button variant="ghost" onClick={() => setStep(1)} className="flex-1 sm:flex-none">{t("matches.log.back")}</Button>
            )}
            <Button
              onClick={step === 1 ? handleNext : handleSubmit}
              className="flex-1 sm:flex-none"
              disabled={submitting}
            >
              {step === 1 ? t("matches.log.next") : (submitting ? "…" : t("matches.log.submit"))}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default LogMatchDialog;
