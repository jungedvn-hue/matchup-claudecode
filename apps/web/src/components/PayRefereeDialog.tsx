import { useEffect, useState } from "react";
import { Coins, Loader2, Trophy } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import MoneyInput from "@/components/MoneyInput";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/i18n/LanguageContext";
import { useTournaments } from "@/context/TournamentContext";
import { useAuth } from "@/context/AuthContext";
import { recordRefereeEarning } from "@/hooks/useReferee";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  refereeUserId: string;
  refereeName: string;
  onRecorded?: () => void;
}

const PayRefereeDialog = ({ open, onOpenChange, refereeUserId, refereeName, onRecorded }: Props) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { tournaments } = useTournaments();
  const [tournamentId, setTournamentId] = useState<string>("");
  const [amount, setAmount] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const myTournaments = tournaments.filter(tr => tr.host_id === user?.id);

  useEffect(() => {
    if (open && !tournamentId && myTournaments.length > 0) {
      setTournamentId(myTournaments[0].id);
    }
  }, [open, myTournaments, tournamentId]);

  const handleSubmit = async () => {
    const amt = amount ?? 0;
    if (!tournamentId || !Number.isFinite(amt) || amt <= 0) {
      toast.error(t("payRef.invalidAmount"));
      return;
    }
    setSaving(true);
    const { error } = await recordRefereeEarning(tournamentId, refereeUserId, amt, note.trim() || null);
    setSaving(false);
    if (error) { toast.error(error.message ?? String(error)); return; }
    toast.success(t("payRef.success", { name: refereeName }));
    setAmount(null);
    setNote("");
    onRecorded?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Coins className="h-4 w-4 text-amber-500" /> {t("payRef.title")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          <div className="rounded-xl bg-secondary/40 p-3">
            <p className="text-xs text-muted-foreground">{t("payRef.refereeLabel")}</p>
            <p className="text-sm font-display font-bold text-foreground">{refereeName}</p>
          </div>

          {myTournaments.length === 0 ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-center">
              <Trophy className="h-5 w-5 text-amber-500 mx-auto mb-1" />
              <p className="text-[11px] text-muted-foreground">{t("payRef.noTournaments")}</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-muted-foreground">{t("payRef.tournamentLabel")}</Label>
              <select
                value={tournamentId}
                onChange={e => setTournamentId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {myTournaments.map(tr => (
                  <option key={tr.id} value={tr.id}>{tr.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-[11px] font-medium text-muted-foreground">{t("payRef.amountLabel")}</Label>
            <MoneyInput
              min={1}
              value={amount}
              onChange={setAmount}
              placeholder={t("payRef.amountPh")}
              className="h-10 rounded-xl font-stat text-base"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] font-medium text-muted-foreground">{t("payRef.noteLabel")}</Label>
            <Textarea
              value={note}
              onChange={e => setNote(e.target.value.slice(0, 200))}
              placeholder={t("payRef.notePh")}
              rows={2}
              className="resize-none text-sm"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => onOpenChange(false)} disabled={saving}>
              {t("common.cancel")}
            </Button>
            <Button className="flex-1 rounded-xl font-bold" onClick={handleSubmit} disabled={saving || !tournamentId}>
              {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              {t("payRef.submit")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PayRefereeDialog;
