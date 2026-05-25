import { useState } from "react";
import { Loader2, Star, Gavel } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/i18n/LanguageContext";
import { rateReferee, type RefereeTournamentRow } from "@/hooks/useReferee";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  refereeUserId: string;
  refereeName: string;
  hostedTournaments: RefereeTournamentRow[];
  onSubmitted?: () => void;
}

const RateRefereeDialog = ({ open, onOpenChange, refereeUserId, refereeName, hostedTournaments, onSubmitted }: Props) => {
  const { t } = useLanguage();
  const [stars, setStars] = useState(5);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [tournamentId, setTournamentId] = useState<string | null>(hostedTournaments[0]?.tournament_id ?? null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    const { error } = await rateReferee(refereeUserId, tournamentId, stars, comment.trim() || undefined);
    setSaving(false);
    if (error) { toast.error(error); return; }
    toast.success(t("rateRef.success"));
    setComment(""); setStars(5);
    onSubmitted?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Gavel className="h-4 w-4 text-primary" /> {t("rateRef.title")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          <p className="text-xs text-muted-foreground">
            {t("rateRef.help", { name: refereeName })}
          </p>

          {hostedTournaments.length > 1 && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-muted-foreground">{t("rateRef.tournamentLabel")}</label>
              <select
                value={tournamentId ?? ""}
                onChange={e => setTournamentId(e.target.value || null)}
                className="w-full h-9 px-3 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {hostedTournaments.map(h => (
                  <option key={h.tournament_id} value={h.tournament_id}>
                    {h.tournament_name ?? h.tournament_id} ({h.matches_count} {t("ref.profile.matches").toLowerCase()})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Star picker */}
          <div className="flex items-center justify-center gap-1 py-2">
            {[1, 2, 3, 4, 5].map(n => {
              const active = (hover || stars) >= n;
              return (
                <button
                  key={n}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  onClick={() => setStars(n)}
                  className="p-1 hover:scale-110 transition-transform"
                  aria-label={`${n} ${t("rateRef.stars")}`}
                >
                  <Star className={`h-8 w-8 ${active ? "fill-amber-400 text-amber-400" : "fill-muted text-muted-foreground/30"}`} />
                </button>
              );
            })}
          </div>
          <p className="text-center font-stat font-bold text-sm text-foreground tabular-nums">{stars}.0</p>

          <Textarea
            value={comment}
            onChange={e => setComment(e.target.value.slice(0, 300))}
            placeholder={t("rateRef.commentPh")}
            rows={3}
            className="resize-none text-sm"
          />
          <p className="text-[10px] text-muted-foreground text-right">{comment.length}/300</p>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => onOpenChange(false)} disabled={saving}>
              {t("common.cancel")}
            </Button>
            <Button className="flex-1 rounded-xl font-bold" onClick={handleSubmit} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              {t("rateRef.submit")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RateRefereeDialog;
