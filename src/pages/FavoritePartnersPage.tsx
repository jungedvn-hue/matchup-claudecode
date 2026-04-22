import { motion } from "framer-motion";
import { ArrowLeft, Heart, Trophy, Target, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import SkillBadge from "@/components/SkillBadge";
import { favoritePartners } from "@/data/profile";
import { useLanguage } from "@/i18n/LanguageContext";

const FavoritePartnersPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="pb-20 min-h-screen">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-lg font-display font-bold text-foreground">{t("partners.title")}</h1>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-3">
        {favoritePartners.map((partner, i) => (
          <motion.div key={partner.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="p-3.5 shadow-card">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary/10 text-xl">{partner.avatar}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-card-foreground truncate">{partner.name}</p>
                    <SkillBadge level={partner.skill} />
                    <Heart className="h-3.5 w-3.5 text-destructive fill-destructive ml-auto flex-shrink-0" />
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1"><Target className="h-3 w-3" />{partner.matchesPlayed} {t("partners.matches")}</span>
                    <span className="flex items-center gap-1"><Trophy className="h-3 w-3" />{partner.winRate}% {t("partners.winRate")}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{partner.lastPlayed}</span>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default FavoritePartnersPage;
