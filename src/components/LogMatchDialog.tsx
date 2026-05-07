import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { favoritePartners } from "@/data/profile";
import { Trophy, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/i18n/LanguageContext";

interface LogMatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LogMatchDialog = ({ open, onOpenChange }: LogMatchDialogProps) => {
  const { t } = useLanguage();
  const [step, setStep] = useState(1);
  const [opponentId, setOpponentId] = useState("");
  const [refereeId, setRefereeId] = useState("");
  const [set1, setSet1] = useState({ player: "", opponent: "" });
  const [set2, setSet2] = useState({ player: "", opponent: "" });
  const [format, setFormat] = useState("singles");

  const handleNext = () => {
    if (step === 1 && !opponentId) {
      toast({ title: t("matches.log.toast.pickOpponent"), description: t("matches.log.toast.pickOpponentDesc"), variant: "destructive" });
      return;
    }
    if (step === 1 && !refereeId) {
      toast({ title: t("matches.log.toast.pickReferee"), description: t("matches.log.toast.pickRefereeDesc"), variant: "destructive" });
      return;
    }
    setStep(step + 1);
  };

  const handleSubmit = () => {
    toast({
      title: t("matches.log.toast.submitted"),
      description: t("matches.log.toast.submittedDesc"),
    });
    onOpenChange(false);
    setStep(1);
  };

  const selectedOpponent = favoritePartners.find(p => p.id === opponentId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            {t("matches.log.title")}
          </DialogTitle>
          <DialogDescription>
            {t("matches.log.subtitle")}
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4 py-4"
            >
              <div className="space-y-2">
                <Label>{t("matches.log.format")}</Label>
                <Select value={format} onValueChange={setFormat}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("matches.log.formatPh")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="singles">{t("matches.log.singles")}</SelectItem>
                    <SelectItem value="doubles">{t("matches.log.doubles")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("matches.log.opponent")}</Label>
                <Select value={opponentId} onValueChange={setOpponentId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("matches.log.opponentPh")} />
                  </SelectTrigger>
                  <SelectContent>
                    {favoritePartners.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t("matches.log.referee")}</Label>
                <Select value={refereeId} onValueChange={setRefereeId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("matches.log.refereePh")} />
                  </SelectTrigger>
                  <SelectContent>
                    {favoritePartners.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 py-4"
            >
              <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-xl border border-border">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-xl">
                  {selectedOpponent?.avatar}
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">{t("matches.log.opponentLabel")}</p>
                  <p className="text-sm font-bold">{selectedOpponent?.name}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 items-center">
                  <span className="text-xs font-bold text-muted-foreground uppercase">Set 1</span>
                  <Input
                    type="number"
                    placeholder={t("matches.log.youPh")}
                    value={set1.player}
                    onChange={e => setSet1({...set1, player: e.target.value})}
                    className="text-center font-bold"
                  />
                  <Input
                    type="number"
                    placeholder={t("matches.log.opponentScorePh")}
                    value={set1.opponent}
                    onChange={e => setSet1({...set1, opponent: e.target.value})}
                    className="text-center font-bold"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4 items-center">
                  <span className="text-xs font-bold text-muted-foreground uppercase">Set 2</span>
                  <Input
                    type="number"
                    placeholder={t("matches.log.youPh")}
                    value={set2.player}
                    onChange={e => setSet2({...set2, player: e.target.value})}
                    className="text-center font-bold"
                  />
                  <Input
                    type="number"
                    placeholder={t("matches.log.opponentScorePh")}
                    value={set2.opponent}
                    onChange={e => setSet2({...set2, opponent: e.target.value})}
                    className="text-center font-bold"
                  />
                </div>
              </div>

              <div className="p-3 bg-primary/5 rounded-lg flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p className="text-[10px] text-muted-foreground">
                  {t("matches.log.notice", { opponent: selectedOpponent?.name ?? "" })}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <DialogFooter className="flex flex-row gap-2 sm:justify-end">
          {step === 2 && (
            <Button variant="ghost" onClick={() => setStep(1)} className="flex-1 sm:flex-none">{t("matches.log.back")}</Button>
          )}
          <Button onClick={step === 1 ? handleNext : handleSubmit} className="flex-1 sm:flex-none">
            {step === 1 ? t("matches.log.next") : t("matches.log.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LogMatchDialog;
