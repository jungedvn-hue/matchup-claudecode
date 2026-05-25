import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Copy, Share2, Check, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useLanguage } from "@/i18n/LanguageContext";
import { buildGroupUrl, buildEventUrl, shareOrCopy, copyToClipboard } from "@/lib/share";
import { useState } from "react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  group: { id: string; name: string; cover_emoji?: string };
  event?: { id: string; title: string };
}

const QR_SIZE = 168;

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
    } else if (r === "failed") {
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
      <DialogContent
        className="p-0 gap-0 max-w-[340px] w-[calc(100vw-1.5rem)] rounded-2xl overflow-hidden border-0 shadow-2xl [&>button]:hidden"
      >
        {/* Top accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-primary via-primary/60 to-primary" />

        {/* Header */}
        <div className="flex items-center justify-between gap-2 px-4 pt-3 pb-1">
          <div className="flex items-center gap-2 min-w-0">
            <Share2 className="h-4 w-4 text-primary shrink-0" />
            <h2 className="font-display font-bold text-sm text-foreground truncate">{t("share.title")}</h2>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors shrink-0"
            aria-label={t("share.close")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-4 pb-4 space-y-3.5 overflow-hidden">
          {/* Identity row */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-xl shrink-0">
              {group.cover_emoji ?? "🥎"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-display font-bold text-foreground truncate">{headline}</p>
              <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>
            </div>
          </div>

          {/* QR card — strict inline width */}
          <div
            className="bg-white rounded-xl border border-border p-3 mx-auto flex items-center justify-center"
            style={{ width: QR_SIZE + 24, height: QR_SIZE + 24 }}
          >
            <QRCodeSVG
              value={url}
              size={QR_SIZE}
              bgColor="#FFFFFF"
              fgColor="#0F1F18"
              level="M"
              style={{ width: QR_SIZE, height: QR_SIZE, display: "block" }}
            />
          </div>

          <p className="text-[10px] text-muted-foreground text-center uppercase tracking-wider font-semibold">
            {t("share.scanHint")}
          </p>

          {/* URL row = copy button */}
          <button
            onClick={handleCopy}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-secondary/60 border border-border hover:border-primary/40 hover:bg-secondary transition-colors text-left group"
          >
            <span className="flex-1 min-w-0 text-[11px] font-mono text-foreground/70 truncate">{url}</span>
            <span className="h-6 w-6 shrink-0 rounded-md bg-card border border-border flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:border-primary/40 transition-colors">
              {justCopied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
            </span>
          </button>

          {/* Primary CTA */}
          <button
            onClick={handleShare}
            className="w-full h-10 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shadow-[0_2px_8px_-2px_hsl(var(--primary)/0.4)]"
          >
            <Share2 className="h-4 w-4" /> {t("share.shareVia")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareGroupDialog;
