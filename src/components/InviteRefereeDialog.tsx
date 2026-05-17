import { useEffect, useState } from "react";
import { Loader2, Gavel, Trophy } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/i18n/LanguageContext";
import { useTournaments } from "@/context/TournamentContext";
import { useAuth } from "@/context/AuthContext";
import { inviteRefereeFromProfile } from "@/hooks/useReferee";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  refereeUserId: string;
  refereeName: string;
  onInvited?: () => void;
}

const InviteRefereeDialog = ({ open, onOpenChange, refereeUserId, refereeName, onInvited }: Props) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { tournaments } = useTournaments();
  const [tournamentId, setTournamentId] = useState<string>("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  // Only my tournaments that aren't completed
  const myActive = tournaments.filter(t =>
    t.host_id === user?.id && t.status !== "completed",
  );

  useEffect(() => {
    if (open && !tournamentId && myActive.length > 0) {
      setTournamentId(myActive[0].id);
    }
  }, [open, myActive, tournamentId]);

  const handleSubmit = async () => {
    if (!tournamentId) return;
    setSaving(true);
    const { error } = await inviteRefereeFromProfile(tournamentId, refereeUserId, message.trim() || undefined);
    setSaving(false);
    if (error) { toast.error(error); return; }
    toast.success(t("inviteRef.success", { name: refereeName }));
    setMessage("");
    onInvited?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Gavel className="h-4 w-4 text-primary" /> {t("inviteRef.title")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          <div className="rounded-xl bg-secondary/40 p-3">
            <p className="text-xs text-muted-foreground">{t("inviteRef.refereeLabel")}</p>
            <p className="text-sm font-display font-bold text-foreground">{refereeName}</p>
          </div>

          {myActive.length === 0 ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-center">
              <Trophy className="h-5 w-5 text-amber-500 mx-auto mb-1" />
              <p className="text-[11px] text-muted-foreground">{t("inviteRef.noTournaments")}</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-muted-foreground">{t("inviteRef.tournamentLabel")}</Label>
              <select
                value={tournamentId}
                onChange={e => setTournamentId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {myActive.map(tr => (
                  <option key={tr.id} value={tr.id}>{tr.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-[11px] font-medium text-muted-foreground">{t("inviteRef.messageLabel")}</Label>
            <Textarea
              value={message}
              onChange={e => setMessage(e.target.value.slice(0, 300))}
              placeholder={t("inviteRef.messagePh")}
              rows={3}
              className="resize-none text-sm"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => onOpenChange(false)} disabled={saving}>
              {t("common.cancel")}
            </Button>
            <Button className="flex-1 rounded-xl font-bold" onClick={handleSubmit} disabled={saving || !tournamentId}>
              {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              {t("inviteRef.submit")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InviteRefereeDialog;
