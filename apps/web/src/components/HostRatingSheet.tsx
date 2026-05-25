import { useState, useEffect } from "react";
import { Star, Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/i18n/LanguageContext";
import { useHostRatingActions, type HostRating } from "@/hooks/useHostRatings";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  groupId: string;
  hostUserId: string;
  hostName: string;
  existing?: HostRating | null;
  onSubmitted?: () => void;
}

const HostRatingSheet = ({ open, onOpenChange, groupId, hostUserId, hostName, existing, onSubmitted }: Props) => {
  const { t } = useLanguage();
  const { submit } = useHostRatingActions();
  const [stars, setStars] = useState(existing?.stars ?? 0);
  const [comment, setComment] = useState(existing?.comment ?? "");
  const [hover, setHover] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) { setStars(existing?.stars ?? 0); setComment(existing?.comment ?? ""); }
  }, [open, existing]);

  const handleSubmit = async () => {
    if (stars < 1) return;
    setSaving(true);
    const { error } = await submit({ groupId, hostUserId, stars, comment });
    setSaving(false);
    if (error) { toast.error(error); return; }
    toast.success(t("hostRating.thanks"));
    onSubmitted?.();
    onOpenChange(false);
  };

  const display = hover || stars;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-8 max-h-[85vh] overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-base font-display">
            {t("hostRating.title")} → {hostName}
          </SheetTitle>
        </SheetHeader>

        <div className="flex justify-center gap-1.5 py-3">
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              onClick={() => setStars(n)}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              className="p-1 active:scale-90 transition-transform"
              aria-label={`${n} stars`}
            >
              <Star className={cn(
                "h-9 w-9 transition-colors",
                n <= display ? "text-amber-500 fill-amber-500" : "text-muted-foreground/30"
              )} />
            </button>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground mb-3">
          {display > 0 ? t(`hostRating.label${display}`) : t("hostRating.tapToRate")}
        </p>

        <Textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder={t("hostRating.commentPlaceholder")}
          maxLength={300}
          className="rounded-xl resize-none min-h-[88px]"
        />
        <p className="text-[10px] text-right text-muted-foreground mt-1">{comment.length}/300</p>

        <Button
          onClick={handleSubmit}
          disabled={stars < 1 || saving}
          className="w-full rounded-xl h-11 mt-3"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {existing ? t("hostRating.update") : t("hostRating.submit")}
        </Button>
      </SheetContent>
    </Sheet>
  );
};

export default HostRatingSheet;
