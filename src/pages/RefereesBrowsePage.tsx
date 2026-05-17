import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Search, Loader2, Gavel, Star, Trophy, ShieldCheck, MapPin } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { useRefereeBrowse, type RefereeProfile } from "@/hooks/useReferee";
import InviteRefereeDialog from "@/components/InviteRefereeDialog";
import BrandEmptyState from "@/components/BrandEmptyState";

const RefereesBrowsePage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user, roles } = useAuth();
  const [search, setSearch] = useState("");
  const { results, loading } = useRefereeBrowse(search);
  const [invitee, setInvitee] = useState<RefereeProfile | null>(null);

  const isHost = roles.includes("host") || roles.includes("master");

  return (
    <div className="min-h-screen pb-20">
      <PageHeader title={t("refBrowse.title")} back>
        <div className="mt-3 relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t("refBrowse.searchPh")}
            className="pl-9 h-10 rounded-xl"
          />
        </div>
      </PageHeader>

      <div className="px-4 pt-4 max-w-2xl mx-auto space-y-2">
        {loading ? (
          <div className="py-12 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground/50" /></div>
        ) : results.length === 0 ? (
          <Card className="shadow-card">
            <BrandEmptyState pillar="community" title={t("refBrowse.empty")} description={t("refBrowse.emptyDesc")} />
          </Card>
        ) : (
          results.map((r, i) => (
            <motion.div key={r.user_id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
              <Card className="p-3 shadow-card hover:border-primary/30 transition-all">
                <div className="flex items-center gap-3">
                  <button onClick={() => navigate(`/referee/${r.user_id}`)} className="shrink-0">
                    <Avatar className="h-12 w-12">
                      {r.avatar_url && <AvatarImage src={r.avatar_url} />}
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                        {r.display_name?.[0]?.toUpperCase() ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                  </button>

                  <button onClick={() => navigate(`/referee/${r.user_id}`)} className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-display font-bold text-foreground truncate">{r.display_name ?? "—"}</p>
                      {r.certification_level !== "community" && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary/15 text-primary uppercase tracking-wide inline-flex items-center gap-0.5">
                          <ShieldCheck className="h-2.5 w-2.5" />{r.certification_level}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-0.5 font-stat tabular-nums">
                        <Trophy className="h-3 w-3" />{r.matches_officiated}
                      </span>
                      {r.rating_avg != null && r.rating_count > 0 && (
                        <span className="inline-flex items-center gap-0.5 font-stat tabular-nums text-amber-500">
                          <Star className="h-3 w-3 fill-amber-500" />{r.rating_avg.toFixed(1)} ({r.rating_count})
                        </span>
                      )}
                      {r.location && (
                        <span className="inline-flex items-center gap-0.5 truncate">
                          <MapPin className="h-3 w-3" />{r.location}
                        </span>
                      )}
                    </div>
                  </button>

                  {isHost && user?.id !== r.user_id && (
                    <button
                      onClick={() => setInvitee(r)}
                      className="shrink-0 h-8 px-3 rounded-lg bg-primary text-primary-foreground text-[11px] font-bold flex items-center gap-1 hover:bg-primary/90"
                    >
                      <Gavel className="h-3 w-3" /> {t("refBrowse.invite")}
                    </button>
                  )}
                </div>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      {invitee && (
        <InviteRefereeDialog
          open={!!invitee}
          onOpenChange={v => { if (!v) setInvitee(null); }}
          refereeUserId={invitee.user_id}
          refereeName={invitee.display_name ?? "—"}
        />
      )}
    </div>
  );
};

export default RefereesBrowsePage;
