import { ShieldCheck, Award, Trophy, Star, CheckCircle2, LucideIcon } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import type { RefereeContribution } from "@/hooks/useReferee";

interface Props {
  contrib: RefereeContribution | null;
  isVerifiedReferee?: boolean;     // has 'referee' role
  hasAvatar?: boolean;
  hasBio?: boolean;
  hasLocations?: boolean;
}

interface BadgeDef {
  key: string;
  icon: LucideIcon;
  label: string;
  tone: string; // tailwind utility classes
}

const RefereeBadgeStrip = ({ contrib, isVerifiedReferee, hasAvatar, hasBio, hasLocations }: Props) => {
  const { t } = useLanguage();
  const badges: BadgeDef[] = [];

  if (isVerifiedReferee) {
    badges.push({
      key: "verified",
      icon: ShieldCheck,
      label: t("refBadge.verified"),
      tone: "bg-primary/10 text-primary border-primary/30",
    });
  }

  const cert = contrib?.certification_level;
  if (cert && cert !== "community") {
    badges.push({
      key: "cert",
      icon: Award,
      label: t(`refBadge.cert.${cert}`),
      tone: cert === "national"
        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
        : "bg-primary/10 text-primary border-primary/30",
    });
  }

  const matches = contrib?.matches_officiated ?? 0;
  if (matches >= 1000) {
    badges.push({ key: "1000club", icon: Trophy, label: t("refBadge.club1000"), tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30" });
  } else if (matches >= 500) {
    badges.push({ key: "500club", icon: Trophy, label: t("refBadge.club500"), tone: "bg-secondary text-foreground border-border" });
  } else if (matches >= 100) {
    badges.push({ key: "100club", icon: Trophy, label: t("refBadge.club100"), tone: "bg-secondary text-foreground border-border" });
  }

  if ((contrib?.rating_avg ?? 0) >= 4.8 && (contrib?.rating_count ?? 0) >= 5) {
    badges.push({
      key: "5star",
      icon: Star,
      label: t("refBadge.fiveStar"),
      tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
    });
  }

  if (hasAvatar && hasBio && hasLocations) {
    badges.push({
      key: "complete",
      icon: CheckCircle2,
      label: t("refBadge.complete"),
      tone: "bg-primary/10 text-primary border-primary/30",
    });
  }

  if (badges.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {badges.map(b => {
        const Icon = b.icon;
        return (
          <span
            key={b.key}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[10.5px] font-bold uppercase tracking-wide ${b.tone}`}
          >
            <Icon className={`h-3 w-3 ${b.key === "5star" ? "fill-amber-500" : ""}`} />
            {b.label}
          </span>
        );
      })}
    </div>
  );
};

export default RefereeBadgeStrip;
