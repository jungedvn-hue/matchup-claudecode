import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, Shield } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/i18n/LanguageContext";
import { TERMS_CONTENT, PRIVACY_CONTENT } from "./legalContent";

interface Props {
  type: "terms" | "privacy";
}

const LegalPage = ({ type }: Props) => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isVi = language === "vi";

  const data = type === "terms"
    ? (isVi ? TERMS_CONTENT.vi : TERMS_CONTENT.en)
    : (isVi ? PRIVACY_CONTENT.vi : PRIVACY_CONTENT.en);

  const HeadIcon = type === "terms" ? FileText : Shield;

  return (
    <div className="pb-20 min-h-screen">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button onClick={() => navigate(-1)} className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-lg font-display font-bold text-foreground flex items-center gap-2">
            <HeadIcon className="h-5 w-5 text-primary" />
            {data.title}
          </h1>
        </div>
      </div>

      <div className="px-4 pt-4 max-w-2xl mx-auto space-y-3">
        <Card className="p-4 shadow-card bg-gradient-to-br from-primary/5 via-card to-card">
          <p className="text-[11px] text-muted-foreground tabular-nums">{data.updated}</p>
          <p className="text-sm text-foreground/90 leading-relaxed mt-2">{data.intro}</p>
        </Card>

        {data.sections.map((s, i) => (
          <Card key={i} className="p-4 shadow-card">
            <h2 className="text-sm font-display font-bold text-foreground mb-1.5">{s.h}</h2>
            <p className="text-[13px] text-muted-foreground leading-relaxed whitespace-pre-line">{s.p}</p>
          </Card>
        ))}

        <p className="text-[10px] text-muted-foreground text-center pt-2 pb-4">© 2026 MatchUp · app.matchup.asia</p>
      </div>
    </div>
  );
};

export default LegalPage;
