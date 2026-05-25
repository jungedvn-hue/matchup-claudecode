import { useRef, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Download, Share2, X, Loader2, ShieldCheck, Star } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toPng } from "html-to-image";
import { toast } from "sonner";
import { useLanguage } from "@/i18n/LanguageContext";
import { buildRefereeUrl, shareOrCopy } from "@/lib/share";

const CERT_LABEL: Record<string, string> = {
  community: "Community",
  regional: "Regional",
  national: "National",
};

export interface RefereeShareData {
  userId: string;
  name: string;
  avatarUrl: string | null;
  location: string | null;
  matchesOfficiated: number;
  tournamentsCount: number;
  ratingAvg: number | null;
  ratingCount: number;
  certificationLevel: string;
  sports: string[] | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  data: RefereeShareData;
}

const RefereeShareCardDialog = ({ open, onOpenChange, data }: Props) => {
  const { t } = useLanguage();
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  const url = buildRefereeUrl(data.userId);
  const initials = (data.name || "?").trim().slice(0, 2).toUpperCase();
  const sports = (data.sports ?? []).slice(0, 3);

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setBusy(true);
    try {
      const png = await toPng(cardRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: "#0F1F18",
      });
      const a = document.createElement("a");
      a.href = png;
      a.download = `matchup-referee-${data.name.replace(/\s+/g, "-").toLowerCase()}.png`;
      a.click();
      toast.success(t("refShare.downloaded"));
    } catch {
      toast.error(t("refShare.errImage"));
    } finally {
      setBusy(false);
    }
  };

  const handleShare = async () => {
    const r = await shareOrCopy({
      title: `MatchUp — ${data.name}`,
      text: t("refShare.shareText", { name: data.name }),
      url,
    });
    if (r === "copied") toast.success(t("share.copied"));
    else if (r === "failed") toast.error(t("share.failed"));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 max-w-[340px] w-[calc(100vw-1.5rem)] rounded-2xl overflow-hidden border-0 shadow-2xl [&>button]:hidden">
        <div className="flex items-center justify-between gap-2 px-4 pt-3 pb-2">
          <div className="flex items-center gap-2 min-w-0">
            <Share2 className="h-4 w-4 text-primary shrink-0" />
            <h2 className="font-display font-bold text-sm text-foreground truncate">{t("refShare.title")}</h2>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors shrink-0"
            aria-label={t("share.close")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-4 pb-4 space-y-3">
          {/* ── The card (also the capture target) ── */}
          <div className="overflow-hidden rounded-2xl">
            <div
              ref={cardRef}
              style={{ width: "100%", backgroundColor: "#0F1F18", color: "#FFFFFF" }}
              className="px-5 pt-5 pb-4"
            >
              {/* Brand row */}
              <div className="flex items-center justify-between">
                <span className="font-display font-extrabold text-base tracking-tight" style={{ color: "#FFFFFF" }}>
                  Match<span style={{ color: "#34D399" }}>Up</span>
                </span>
                <span
                  className="text-[9px] font-bold uppercase tracking-[0.18em] px-2 py-1 rounded-full"
                  style={{ backgroundColor: "rgba(52,211,153,0.15)", color: "#34D399" }}
                >
                  {t("refShare.refereeLabel")}
                </span>
              </div>

              {/* Identity */}
              <div className="flex flex-col items-center text-center mt-4">
                <div
                  className="h-20 w-20 rounded-2xl flex items-center justify-center overflow-hidden"
                  style={{ backgroundColor: "rgba(52,211,153,0.18)" }}
                >
                  {data.avatarUrl ? (
                    <img src={data.avatarUrl} alt="" crossOrigin="anonymous" className="h-full w-full object-cover" />
                  ) : (
                    <span className="font-display font-extrabold text-2xl" style={{ color: "#34D399" }}>{initials}</span>
                  )}
                </div>
                <p className="font-display font-extrabold text-lg mt-2.5 leading-tight" style={{ color: "#FFFFFF" }}>
                  {data.name}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span
                    className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: "rgba(52,211,153,0.15)", color: "#34D399" }}
                  >
                    <ShieldCheck className="h-3 w-3" /> {CERT_LABEL[data.certificationLevel] ?? "Community"}
                  </span>
                  {data.location && (
                    <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.55)" }}>{data.location}</span>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 mt-4">
                {[
                  { v: data.matchesOfficiated, l: t("refShare.statMatches") },
                  { v: data.tournamentsCount, l: t("refShare.statTournaments") },
                  {
                    v: data.ratingAvg != null ? data.ratingAvg.toFixed(1) : "—",
                    l: t("refShare.statRating"),
                  },
                ].map((s, i) => (
                  <div
                    key={i}
                    className="rounded-xl py-2.5 text-center"
                    style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
                  >
                    <p className="font-stat font-extrabold text-xl tabular-nums" style={{ color: "#FFFFFF" }}>{s.v}</p>
                    <p className="text-[8px] uppercase tracking-wide font-bold mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>
                      {s.l}
                    </p>
                  </div>
                ))}
              </div>

              {/* Sports */}
              {sports.length > 0 && (
                <div className="flex flex-wrap justify-center gap-1.5 mt-3">
                  {sports.map(s => (
                    <span
                      key={s}
                      className="text-[10px] font-semibold px-2 py-1 rounded-lg"
                      style={{ backgroundColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.85)" }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}

              {/* QR */}
              <div className="flex flex-col items-center mt-4">
                <div className="bg-white rounded-xl p-2.5">
                  <QRCodeSVG value={url} size={108} bgColor="#FFFFFF" fgColor="#0F1F18" level="M" style={{ display: "block" }} />
                </div>
                <p className="text-[9px] uppercase tracking-[0.14em] font-bold mt-2" style={{ color: "#34D399" }}>
                  {t("refShare.scanHint")}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleDownload}
              disabled={busy}
              className="flex-1 h-10 rounded-xl border border-border text-foreground font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-secondary transition-colors disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              {t("refShare.download")}
            </button>
            <button
              onClick={handleShare}
              className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-primary/90 active:scale-[0.98] transition-all"
            >
              <Share2 className="h-3.5 w-3.5" /> {t("refShare.shareLink")}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RefereeShareCardDialog;
