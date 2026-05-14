import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Share2, Check } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { buildGroupUrl, buildEventUrl, shareOrCopy, copyToClipboard } from "@/lib/share";
import QRCodeDisplay from "@/components/QRCodeDisplay";
import { useState } from "react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  // Either group or event share
  group: { id: string; name: string; cover_emoji?: string };
  event?: { id: string; title: string };
}

const ShareGroupDialog = ({ open, onOpenChange, group, event }: Props) => {
  const { t } = useLanguage();
  const [justCopied, setJustCopied] = useState(false);

  const url = event ? buildEventUrl(group.id, event.id) : buildGroupUrl(group.id);
  const headline = event ? event.title : group.name;
  const subtitle = event ? group.name : t("share.groupSubtitle");

  const handleShare = async () => {
    const r = await shareOrCopy({
      title: `MatchUp — ${headline}`,
      text: event
        ? t("share.eventText", { event: event.title, group: group.name })
        : t("share.groupText", { name: group.name }),
      url,
    });
    if (r === "shared") return;
    if (r === "copied") {
      setJustCopied(true);
      toast.success(t("share.copied"));
      setTimeout(() => setJustCopied(false), 1800);
    } else {
      toast.error(t("share.failed"));
    }
  };

  const handleCopy = async () => {
    const ok = await copyToClipboard(url);
    if (ok) {
      setJustCopied(true);
      toast.success(t("share.copied"));
      setTimeout(() => setJustCopied(false), 1800);
    } else {
      toast.error(t("share.failed"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-center flex items-center justify-center gap-2">
            <Share2 className="h-4 w-4 text-primary" /> {t("share.title")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <div className="flex flex-col items-center gap-1.5">
            <div className="text-3xl">{group.cover_emoji ?? "🥎"}</div>
            <p className="text-base font-display font-bold text-foreground text-center">{headline}</p>
            <p className="text-[11px] text-muted-foreground text-center">{subtitle}</p>
          </div>

          <div className="flex justify-center">
            <QRCodeDisplay data={url} size={180} showText={false} />
          </div>
          <p className="text-[10px] text-muted-foreground text-center">{t("share.scanHint")}</p>

          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-secondary/60 w-full overflow-hidden">
            <p className="flex-1 min-w-0 text-[11px] font-mono text-foreground/80 truncate">{url}</p>
            <button onClick={handleCopy} className="h-7 w-7 shrink-0 rounded-lg bg-card flex items-center justify-center text-muted-foreground hover:text-foreground" aria-label={t("share.copyLink")}>
              {justCopied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => onOpenChange(false)}>
              {t("share.close")}
            </Button>
            <Button className="flex-1 rounded-xl font-bold" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-1.5" /> {t("share.shareVia")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareGroupDialog;
