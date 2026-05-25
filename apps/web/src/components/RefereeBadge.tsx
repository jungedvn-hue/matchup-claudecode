import { Gavel, Star } from "lucide-react";
import { useRefereeContribution } from "@/hooks/useReferee";
import { useLanguage } from "@/i18n/LanguageContext";

interface Props {
  userId: string;
  size?: "sm" | "md" | "lg";
}

const certIcon: Record<string, string> = {
  community: "🟢",
  regional: "🟦",
  national: "🟨",
};

const RefereeBadge = ({ userId, size = "md" }: Props) => {
  const { t } = useLanguage();
  const { data, loading } = useRefereeContribution(userId);

  if (loading || !data) return null;
  if (data.matches_officiated === 0 && data.social_verifications === 0) return null;

  const total = data.matches_officiated + data.social_verifications;

  const sizeClass = size === "sm" ? "text-[10px] px-1.5 py-0.5 gap-1" :
    size === "lg" ? "text-sm px-3 py-1.5 gap-2" : "text-[11px] px-2 py-1 gap-1";

  return (
    <span className={`inline-flex items-center rounded-lg bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20 font-bold ${sizeClass}`}>
      <Gavel className="h-3 w-3" />
      <span>{certIcon[data.certification_level]} {t(`ref.cert.${data.certification_level}`)}</span>
      <span className="opacity-60">·</span>
      <span className="tabular-nums">{total}</span>
      {data.rating_avg != null && data.rating_count > 0 && (
        <>
          <span className="opacity-60">·</span>
          <span className="flex items-center gap-0.5">
            <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
            {data.rating_avg.toFixed(1)}
          </span>
        </>
      )}
    </span>
  );
};

export default RefereeBadge;
