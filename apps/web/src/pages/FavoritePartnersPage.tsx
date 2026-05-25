import { motion } from "framer-motion";
import { ArrowLeft, Heart, Trophy, Target, Clock, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { useMatchRecords } from "@/hooks/useMatches";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const sb = supabase as unknown as { from: (t: string) => any };

interface PartnerView {
  user_id: string;
  name: string;
  avatar_url: string | null;
  matches: number;
  wins: number;
  winRate: number;
  lastPlayedISO: string;
  isFavorite: boolean;
}

const formatRelative = (iso: string, t: (k: string, v?: Record<string, unknown>) => string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return t("partners.relativeToday");
  if (days === 1) return t("partners.relativeYesterday");
  if (days < 7) return t("partners.relativeDays", { n: days });
  if (days < 30) return t("partners.relativeWeeks", { n: Math.floor(days / 7) });
  return t("partners.relativeMonths", { n: Math.floor(days / 30) });
};

const FavoritePartnersPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { matches } = useMatchRecords();
  const [favs, setFavs] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    sb.from("favorite_partners").select("partner_user_id").eq("user_id", user.id).eq("is_favorite", true).then(({ data }: { data: Array<{ partner_user_id: string }> | null }) => {
      setFavs(new Set((data ?? []).map(r => r.partner_user_id)));
    });
  }, [user]);

  const partners = useMemo<PartnerView[]>(() => {
    if (!user) return [];
    const map = new Map<string, PartnerView>();
    for (const m of matches) {
      const isSubmitter = m.submitter_user_id === user.id;
      const partnerId = isSubmitter ? m.opponent_user_id : m.submitter_user_id;
      const profile = isSubmitter ? m.opponent_profile : m.submitter_profile;
      const isWon = isSubmitter ? m.result === "won" : m.result === "lost";
      const existing = map.get(partnerId) ?? {
        user_id: partnerId,
        name: profile?.display_name || "Unknown",
        avatar_url: profile?.avatar_url ?? null,
        matches: 0, wins: 0, winRate: 0,
        lastPlayedISO: m.created_at,
        isFavorite: favs.has(partnerId),
      };
      existing.matches++;
      if (m.verified && isWon) existing.wins++;
      if (new Date(m.created_at) > new Date(existing.lastPlayedISO)) existing.lastPlayedISO = m.created_at;
      existing.isFavorite = favs.has(partnerId);
      existing.winRate = existing.matches ? Math.round((existing.wins / existing.matches) * 100) : 0;
      map.set(partnerId, existing);
    }
    return Array.from(map.values()).sort((a, b) => {
      if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
      return b.matches - a.matches;
    });
  }, [matches, user, favs]);

  const toggleFav = async (partnerId: string) => {
    if (!user) return;
    const isFav = favs.has(partnerId);
    const next = new Set(favs);
    if (isFav) next.delete(partnerId); else next.add(partnerId);
    setFavs(next);

    if (isFav) {
      await sb.from("favorite_partners").delete().eq("user_id", user.id).eq("partner_user_id", partnerId);
    } else {
      await sb.from("favorite_partners").upsert({ user_id: user.id, partner_user_id: partnerId, is_favorite: true }, { onConflict: "user_id,partner_user_id" });
    }
    toast.success(isFav ? t("partners.toast.removed") : t("partners.toast.added"));
  };

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

      <div className="px-4 pt-4 max-w-2xl mx-auto space-y-3">
        {partners.length === 0 ? (
          <Card className="p-6 text-center shadow-card">
            <Users className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-xs text-muted-foreground">{t("partners.empty")}</p>
          </Card>
        ) : partners.map((p, i) => (
          <motion.div key={p.user_id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <Card className="p-3.5 shadow-card">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  {p.avatar_url && <AvatarImage src={p.avatar_url} />}
                  <AvatarFallback className="bg-primary/10 text-primary text-base font-bold">{p.name[0]?.toUpperCase() || "?"}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-card-foreground truncate">{p.name}</p>
                    <button onClick={() => toggleFav(p.user_id)} className="ml-auto shrink-0">
                      <Heart className={`h-4 w-4 ${p.isFavorite ? "text-destructive fill-destructive" : "text-muted-foreground"}`} />
                    </button>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1"><Target className="h-3 w-3" />{p.matches}</span>
                    <span className="flex items-center gap-1"><Trophy className="h-3 w-3" />{p.winRate}%</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatRelative(p.lastPlayedISO, t)}</span>
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
