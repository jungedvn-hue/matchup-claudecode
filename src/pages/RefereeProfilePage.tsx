import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Gavel, Star, MapPin, Trophy, Activity, Loader2, Edit } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { useRefereeContribution, useRefereeTournamentHistory, useRefereeRatings, useCanRateReferee } from "@/hooks/useReferee";
import RateRefereeDialog from "@/components/RateRefereeDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const sb = supabase as unknown as { from: (t: string) => any };

const CERT_NAMES: Record<string, string> = {
  community: "Community",
  regional: "Regional",
  national: "National",
};

const RefereeProfilePage = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { data, loading, updateBio, refetch: refetchContrib } = useRefereeContribution(userId);
  const { items: history, loading: historyLoading } = useRefereeTournamentHistory(userId);
  const { items: ratings, refetch: refetchRatings } = useRefereeRatings(userId, 5);
  const { eligible: canRate, hostedTournaments } = useCanRateReferee(userId);
  const [rateOpen, setRateOpen] = useState(false);

  const [profile, setProfile] = useState<{ display_name: string | null; avatar_url: string | null; location: string | null } | null>(null);
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState("");
  const [locText, setLocText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!userId) return;
    sb.from("profiles").select("display_name, avatar_url, location").eq("user_id", userId).maybeSingle()
      .then(({ data }: any) => setProfile(data ?? null));
  }, [userId]);

  useEffect(() => {
    if (data) {
      setBio(data.bio ?? "");
      setLocText((data.preferred_locations ?? []).join(", "));
    }
  }, [data]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary opacity-40" /></div>;

  const isOwn = user?.id === userId;
  const totalMatches = (data?.matches_officiated ?? 0) + (data?.social_verifications ?? 0);

  const handleSave = async () => {
    setSaving(true);
    const locs = locText.split(",").map(s => s.trim()).filter(Boolean);
    const { error } = await updateBio(bio.trim() || null, locs.length > 0 ? locs : null);
    setSaving(false);
    if (error) toast.error(error);
    else { toast.success(t("ref.profile.saved")); setEditing(false); }
  };

  return (
    <div className="pb-20 min-h-screen">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button onClick={() => navigate(-1)} className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-lg font-display font-bold text-foreground flex items-center gap-2">
            <Gavel className="h-5 w-5 text-blue-500" /> {t("ref.profile.title")}
          </h1>
        </div>
      </div>

      <div className="px-4 pt-4 max-w-2xl mx-auto space-y-4">
        {/* Hero card */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-5 shadow-card bg-gradient-to-br from-blue-500/10 via-card to-card border-blue-500/20">
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={profile?.avatar_url ?? undefined} />
                <AvatarFallback className="bg-blue-500/15 text-blue-600 font-display font-bold">
                  {(profile?.display_name ?? "?").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-base font-display font-bold text-foreground truncate">{profile?.display_name ?? "—"}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {data?.certification_level && CERT_NAMES[data.certification_level]} Referee
                  {profile?.location && ` · ${profile.location}`}
                </p>
                {data?.bio && !editing && <p className="text-xs text-foreground/80 mt-2 leading-relaxed">{data.bio}</p>}
              </div>
              {isOwn && !editing && (
                <button onClick={() => setEditing(true)} className="h-8 w-8 rounded-lg bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground">
                  <Edit className="h-3.5 w-3.5" />
                </button>
              )}
              {!isOwn && canRate && (
                <button
                  onClick={() => setRateOpen(true)}
                  className="h-8 px-3 rounded-lg bg-primary text-primary-foreground text-[11px] font-bold flex items-center gap-1 hover:bg-primary/90"
                >
                  <Star className="h-3.5 w-3.5" /> {t("rateRef.btn")}
                </button>
              )}
            </div>

            {editing && (
              <div className="mt-3 space-y-2">
                <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder={t("ref.profile.bioPh")} maxLength={300} rows={3}
                  className="w-full p-2.5 rounded-xl border border-border bg-card text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
                <input value={locText} onChange={e => setLocText(e.target.value)} placeholder={t("ref.profile.locsPh")}
                  className="w-full h-10 px-3 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                <div className="flex gap-2">
                  <button onClick={() => setEditing(false)} className="flex-1 h-9 rounded-xl border border-border text-xs font-semibold">{t("common.cancel")}</button>
                  <button onClick={handleSave} disabled={saving} className="flex-1 h-9 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center gap-1">
                    {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{t("common.save")}
                  </button>
                </div>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <StatCard icon={Trophy} label={t("ref.profile.tournamentMatches")} value={data?.matches_officiated ?? 0} tone="amber" />
          <StatCard icon={Activity} label={t("ref.profile.socialMatches")} value={data?.social_verifications ?? 0} tone="emerald" />
          <StatCard icon={Star} label={t("ref.profile.rating")} value={data?.rating_avg != null ? data.rating_avg.toFixed(1) : "—"} tone="primary" />
        </div>

        {/* Locations */}
        {data?.preferred_locations && data.preferred_locations.length > 0 && (
          <Card className="p-4 shadow-card">
            <h3 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1.5 mb-2">
              <MapPin className="h-3 w-3" /> {t("ref.profile.preferredLocations")}
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {data.preferred_locations.map(l => (
                <span key={l} className="text-[11px] px-2 py-1 rounded-lg bg-secondary text-foreground font-semibold">{l}</span>
              ))}
            </div>
          </Card>
        )}

        {/* Total */}
        <Card className="p-4 shadow-card text-center bg-gradient-to-br from-blue-500/5 to-card">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">{t("ref.profile.totalOfficiated")}</p>
          <p className="text-3xl font-stat font-bold text-foreground tabular-nums mt-1">{totalMatches}</p>
        </Card>

        {/* Ratings (R-B) */}
        {(ratings.length > 0 || (data?.rating_count ?? 0) > 0) && (
          <div>
            <h3 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1.5 mb-2 px-1">
              <Star className="h-3 w-3" /> {t("rateRef.recentRatings")} <span className="font-stat tabular-nums text-foreground">({data?.rating_count ?? 0})</span>
              {data?.rating_avg != null && (
                <span className="ml-auto inline-flex items-center gap-1 font-stat font-bold text-amber-500 tabular-nums">
                  <Star className="h-3 w-3 fill-amber-500" /> {data.rating_avg.toFixed(2)}
                </span>
              )}
            </h3>
            <div className="space-y-1.5">
              {ratings.map(r => (
                <Card key={r.id} className="p-3 shadow-card">
                  <div className="flex items-start gap-2.5">
                    <Avatar className="h-7 w-7">
                      {r.rater_avatar && <AvatarImage src={r.rater_avatar} />}
                      <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                        {r.rater_name?.[0]?.toUpperCase() ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-foreground truncate">{r.rater_name ?? "—"}</p>
                        <span className="inline-flex items-center gap-0.5 font-stat font-bold text-amber-500 text-[11px] tabular-nums">
                          {Array.from({ length: r.stars }).map((_, i) => (
                            <Star key={i} className="h-2.5 w-2.5 fill-amber-500" />
                          ))}
                        </span>
                        <span className="ml-auto text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString("vi-VN")}</span>
                      </div>
                      {r.comment && <p className="text-[11px] text-foreground/80 mt-1 leading-relaxed">{r.comment}</p>}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Tournaments served (R-A) */}
        <div>
          <h3 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1.5 mb-2 px-1">
            <Trophy className="h-3 w-3" /> {t("ref.profile.tournamentsServed")} <span className="font-stat tabular-nums text-foreground">({data?.tournaments_count ?? 0})</span>
          </h3>
          {historyLoading ? (
            <div className="py-6 flex justify-center"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground/40" /></div>
          ) : history.length === 0 ? (
            <Card className="p-4 shadow-card text-center">
              <p className="text-[11px] text-muted-foreground">{t("ref.profile.noHistory")}</p>
            </Card>
          ) : (
            <div className="space-y-1.5">
              {history.map(h => (
                <Card key={h.tournament_id} className="p-3 shadow-card flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-foreground truncate">{h.tournament_name ?? "—"}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {new Date(h.first_match_at).toLocaleDateString("vi-VN")} → {new Date(h.last_match_at).toLocaleDateString("vi-VN")}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-stat font-bold text-sm text-primary tabular-nums leading-none">{h.matches_count}</p>
                    <p className="text-[9px] text-muted-foreground uppercase font-semibold tracking-wide mt-0.5">{t("ref.profile.matches")}</p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {userId && (
        <RateRefereeDialog
          open={rateOpen}
          onOpenChange={setRateOpen}
          refereeUserId={userId}
          refereeName={profile?.display_name ?? "—"}
          hostedTournaments={hostedTournaments}
          onSubmitted={() => { refetchContrib(); refetchRatings(); }}
        />
      )}
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, tone }: any) => {
  const toneClass = tone === "amber" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" :
    tone === "emerald" ? "bg-primary/10 text-primary dark:text-primary" :
    "bg-primary/10 text-primary";
  return (
    <Card className="p-3 shadow-card text-center">
      <div className={`h-7 w-7 mx-auto rounded-lg flex items-center justify-center mb-1.5 ${toneClass}`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <p className="text-base font-display font-bold text-foreground tabular-nums">{value}</p>
      <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">{label}</p>
    </Card>
  );
};

export default RefereeProfilePage;
