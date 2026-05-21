import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Gavel, Star, MapPin, Trophy, Activity, Loader2, Edit, Coins, Calendar, Globe2, CalendarClock, Inbox, Share2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { useRefereeContribution, useRefereeTournamentHistory, useRefereeRatings, useCanRateReferee, useRefereeEarnings } from "@/hooks/useReferee";
import RateRefereeDialog from "@/components/RateRefereeDialog";
import RefereeBadgeStrip from "@/components/RefereeBadgeStrip";
import PayRefereeDialog from "@/components/PayRefereeDialog";
import RefereeAvailabilityCalendar from "@/components/RefereeAvailabilityCalendar";
import RefereeShareCardDialog from "@/components/RefereeShareCardDialog";
import { useRoles } from "@/hooks/use-roles";
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
  const { data, loading, updateProfile, refetch: refetchContrib } = useRefereeContribution(userId);
  const { items: history, loading: historyLoading } = useRefereeTournamentHistory(userId);
  const { items: ratings, refetch: refetchRatings } = useRefereeRatings(userId, 5);
  const { eligible: canRate, hostedTournaments } = useCanRateReferee(userId);
  const { items: earnings, loading: earningsLoading, refetch: refetchEarnings } = useRefereeEarnings(user?.id === userId ? userId : undefined);
  const viewerRoles = useRoles();
  const viewerIsHost = viewerRoles.includes("host") || viewerRoles.includes("master");
  const [rateOpen, setRateOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const [profile, setProfile] = useState<{ display_name: string | null; avatar_url: string | null; location: string | null } | null>(null);
  const [isVerifiedReferee, setIsVerifiedReferee] = useState(false);
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState("");
  const [locText, setLocText] = useState("");
  const [sportsText, setSportsText] = useState("");
  const [formatsText, setFormatsText] = useState("");
  const [langsText, setLangsText] = useState("");
  const [ratePerMatch, setRatePerMatch] = useState("");
  const [ratePerDay, setRatePerDay] = useState("");
  const [availNote, setAvailNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!userId) return;
    sb.from("profiles").select("display_name, avatar_url, location").eq("user_id", userId).maybeSingle()
      .then(({ data }: any) => setProfile(data ?? null));
    sb.from("user_roles").select("role").eq("user_id", userId).is("revoked_at", null)
      .then(({ data }: any) => {
        const roles: string[] = (data ?? []).map((r: any) => r.role);
        setIsVerifiedReferee(roles.includes("referee") || roles.includes("master"));
      });
  }, [userId]);

  useEffect(() => {
    if (data) {
      setBio(data.bio ?? "");
      setLocText((data.preferred_locations ?? []).join(", "));
      setSportsText((data.sports ?? []).join(", "));
      setFormatsText((data.formats ?? []).join(", "));
      setLangsText((data.languages ?? []).join(", "));
      setRatePerMatch(data.rate_per_match_coins != null ? String(data.rate_per_match_coins) : "");
      setRatePerDay(data.rate_per_day_coins != null ? String(data.rate_per_day_coins) : "");
      setAvailNote(data.availability_note ?? "");
    }
  }, [data]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary opacity-40" /></div>;

  const isOwn = user?.id === userId;
  const totalMatches = (data?.matches_officiated ?? 0) + (data?.social_verifications ?? 0);

  const csv = (s: string) => s.split(",").map(x => x.trim()).filter(Boolean);
  const parseRate = (s: string) => {
    const n = parseInt(s, 10);
    return Number.isFinite(n) && n >= 0 ? n : null;
  };

  const handleSave = async () => {
    setSaving(true);
    const locs = csv(locText);
    const sports = csv(sportsText);
    const formats = csv(formatsText);
    const langs = csv(langsText);
    const { error } = await updateProfile({
      bio: bio.trim() || null,
      preferred_locations: locs.length > 0 ? locs : null,
      sports: sports.length > 0 ? sports : null,
      formats: formats.length > 0 ? formats : null,
      languages: langs.length > 0 ? langs : null,
      rate_per_match_coins: ratePerMatch.trim() ? parseRate(ratePerMatch) : null,
      rate_per_day_coins: ratePerDay.trim() ? parseRate(ratePerDay) : null,
      availability_note: availNote.trim() || null,
    });
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
                <div className="mt-2">
                  <RefereeBadgeStrip
                    contrib={data}
                    isVerifiedReferee={isVerifiedReferee}
                    hasAvatar={!!profile?.avatar_url}
                    hasBio={!!data?.bio}
                    hasLocations={(data?.preferred_locations?.length ?? 0) > 0}
                  />
                </div>
              </div>
              {isOwn && !editing && (
                <button onClick={() => setEditing(true)} className="h-8 w-8 rounded-lg bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground">
                  <Edit className="h-3.5 w-3.5" />
                </button>
              )}
              {!isOwn && (canRate || viewerIsHost) && (
                <div className="flex flex-col gap-1">
                  {canRate && (
                    <button
                      onClick={() => setRateOpen(true)}
                      className="h-8 px-3 rounded-lg bg-primary text-primary-foreground text-[11px] font-bold flex items-center gap-1 hover:bg-primary/90"
                    >
                      <Star className="h-3.5 w-3.5" /> {t("rateRef.btn")}
                    </button>
                  )}
                  {viewerIsHost && (
                    <button
                      onClick={() => setPayOpen(true)}
                      className="h-8 px-3 rounded-lg bg-amber-500 text-white text-[11px] font-bold flex items-center gap-1 hover:bg-amber-600"
                    >
                      <Coins className="h-3.5 w-3.5" /> {t("payRef.btn")}
                    </button>
                  )}
                </div>
              )}
            </div>

            {editing && (
              <div className="mt-3 space-y-2">
                <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder={t("ref.profile.bioPh")} maxLength={300} rows={3}
                  className="w-full p-2.5 rounded-xl border border-border bg-card text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
                <input value={locText} onChange={e => setLocText(e.target.value)} placeholder={t("ref.profile.locsPh")}
                  className="w-full h-10 px-3 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                <input value={sportsText} onChange={e => setSportsText(e.target.value)} placeholder={t("ref.profile.sportsPh")}
                  className="w-full h-10 px-3 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                <input value={formatsText} onChange={e => setFormatsText(e.target.value)} placeholder={t("ref.profile.formatsPh")}
                  className="w-full h-10 px-3 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                <input value={langsText} onChange={e => setLangsText(e.target.value)} placeholder={t("ref.profile.langsPh")}
                  className="w-full h-10 px-3 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                <div className="grid grid-cols-2 gap-2">
                  <input value={ratePerMatch} onChange={e => setRatePerMatch(e.target.value)} inputMode="numeric" placeholder={t("ref.profile.ratePerMatchPh")}
                    className="h-10 px-3 rounded-xl border border-border bg-card text-sm font-stat tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  <input value={ratePerDay} onChange={e => setRatePerDay(e.target.value)} inputMode="numeric" placeholder={t("ref.profile.ratePerDayPh")}
                    className="h-10 px-3 rounded-xl border border-border bg-card text-sm font-stat tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <input value={availNote} onChange={e => setAvailNote(e.target.value)} maxLength={200} placeholder={t("ref.profile.availPh")}
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

        {/* Share card */}
        {data && (
          <button
            onClick={() => setShareOpen(true)}
            className="w-full rounded-xl bg-card border border-border p-3 flex items-center justify-center gap-2 hover:border-primary/30 transition-colors text-sm font-bold text-foreground"
          >
            <Share2 className="h-4 w-4 text-primary" /> {t("refShare.cta")}
          </button>
        )}

        {/* Owner quick actions */}
        {isOwn && (
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => navigate("/referee/invites")} className="rounded-xl bg-card border border-border p-3 flex items-center gap-2 hover:border-primary/30 transition-colors text-left">
              <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><Inbox className="h-4 w-4" /></div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground">{t("refInvites.title")}</p>
                <p className="text-[10px] text-muted-foreground">{t("refInvites.navDesc")}</p>
              </div>
            </button>
            <button onClick={() => navigate("/referee/schedule")} className="rounded-xl bg-card border border-border p-3 flex items-center gap-2 hover:border-primary/30 transition-colors text-left">
              <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><CalendarClock className="h-4 w-4" /></div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground">{t("refSchedule.title")}</p>
                <p className="text-[10px] text-muted-foreground">{t("refSchedule.navDesc")}</p>
              </div>
            </button>
          </div>
        )}

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

        {/* Specialization (R-C) */}
        {((data?.sports?.length ?? 0) > 0 || (data?.formats?.length ?? 0) > 0 || (data?.languages?.length ?? 0) > 0) && (
          <Card className="p-4 shadow-card space-y-3">
            {(data?.sports?.length ?? 0) > 0 && (
              <div>
                <h3 className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1.5 mb-1.5">
                  <Activity className="h-3 w-3" /> {t("ref.profile.sports")}
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {data!.sports!.map(s => <span key={s} className="text-[11px] px-2 py-1 rounded-lg bg-primary/10 text-primary font-semibold capitalize">{s}</span>)}
                </div>
              </div>
            )}
            {(data?.formats?.length ?? 0) > 0 && (
              <div>
                <h3 className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">{t("ref.profile.formats")}</h3>
                <div className="flex flex-wrap gap-1.5">
                  {data!.formats!.map(f => <span key={f} className="text-[11px] px-2 py-1 rounded-lg bg-secondary text-foreground font-semibold capitalize">{f}</span>)}
                </div>
              </div>
            )}
            {(data?.languages?.length ?? 0) > 0 && (
              <div>
                <h3 className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1.5 mb-1.5">
                  <Globe2 className="h-3 w-3" /> {t("ref.profile.languages")}
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {data!.languages!.map(l => <span key={l} className="text-[11px] px-2 py-1 rounded-lg bg-secondary text-foreground font-semibold uppercase">{l}</span>)}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Rate card (R-C) */}
        {(data?.rate_per_match_coins != null || data?.rate_per_day_coins != null) && (
          <Card className="p-4 shadow-card bg-gradient-to-br from-amber-500/5 to-card border-amber-500/20">
            <h3 className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1.5 mb-2">
              <Coins className="h-3 w-3" /> {t("ref.profile.rateCard")}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {data?.rate_per_match_coins != null && (
                <div className="rounded-xl bg-card border border-border p-3 text-center">
                  <p className="font-stat font-bold text-xl text-foreground tabular-nums">{data.rate_per_match_coins}</p>
                  <p className="text-[9px] uppercase tracking-wide text-muted-foreground font-semibold mt-0.5">{t("ref.profile.perMatch")}</p>
                </div>
              )}
              {data?.rate_per_day_coins != null && (
                <div className="rounded-xl bg-card border border-border p-3 text-center">
                  <p className="font-stat font-bold text-xl text-foreground tabular-nums">{data.rate_per_day_coins}</p>
                  <p className="text-[9px] uppercase tracking-wide text-muted-foreground font-semibold mt-0.5">{t("ref.profile.perDay")}</p>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Availability (R-C) */}
        {data?.availability_note && (
          <Card className="p-4 shadow-card">
            <h3 className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1.5 mb-1.5">
              <Calendar className="h-3 w-3" /> {t("ref.profile.availability")}
            </h3>
            <p className="text-xs text-foreground/85 leading-relaxed">{data.availability_note}</p>
          </Card>
        )}

        {/* Availability calendar — blocked dates */}
        {userId && <RefereeAvailabilityCalendar userId={userId} isOwn={isOwn} />}

        {/* Earnings (R-F) — owner only */}
        {isOwn && (
          <Card className="p-4 shadow-card bg-gradient-to-br from-amber-500/10 via-card to-card border-amber-500/20">
            <h3 className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1.5 mb-2">
              <Coins className="h-3 w-3" /> {t("ref.profile.earnings")} <span className="ml-1 text-[9px] font-bold text-amber-600 dark:text-amber-400">{t("ref.profile.private")}</span>
            </h3>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="rounded-xl bg-card border border-border p-3 text-center">
                <p className="font-stat font-bold text-2xl text-foreground tabular-nums">{data?.total_earned_coins ?? 0}</p>
                <p className="text-[9px] uppercase tracking-wide text-muted-foreground font-semibold mt-0.5">{t("ref.profile.totalEarned")}</p>
              </div>
              <div className="rounded-xl bg-card border border-border p-3 text-center">
                <p className="font-stat font-bold text-2xl text-foreground tabular-nums">{data?.repeat_hosts_count ?? 0}</p>
                <p className="text-[9px] uppercase tracking-wide text-muted-foreground font-semibold mt-0.5">{t("ref.profile.repeatHosts")}</p>
              </div>
            </div>
            {earningsLoading ? (
              <div className="flex justify-center py-3"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground/40" /></div>
            ) : earnings.length === 0 ? (
              <p className="text-[11px] text-center text-muted-foreground py-2">{t("ref.profile.noEarnings")}</p>
            ) : (
              <div className="space-y-1.5">
                {earnings.slice(0, 5).map(e => (
                  <div key={e.id} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card p-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-foreground truncate">{e.tournament_name ?? "—"}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{e.host_name ?? "—"} · {new Date(e.recorded_at).toLocaleDateString("vi-VN")}</p>
                      {e.note && <p className="text-[10px] text-foreground/70 mt-0.5 truncate">{e.note}</p>}
                    </div>
                    <p className="font-stat font-bold text-sm text-amber-600 dark:text-amber-400 tabular-nums shrink-0">+{e.amount_coins}</p>
                  </div>
                ))}
              </div>
            )}
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

      {userId && !isOwn && viewerIsHost && (
        <PayRefereeDialog
          open={payOpen}
          onOpenChange={setPayOpen}
          refereeUserId={userId}
          refereeName={profile?.display_name ?? "—"}
          onRecorded={() => { refetchContrib(); refetchEarnings(); }}
        />
      )}

      {userId && data && (
        <RefereeShareCardDialog
          open={shareOpen}
          onOpenChange={setShareOpen}
          data={{
            userId,
            name: profile?.display_name ?? "—",
            avatarUrl: profile?.avatar_url ?? null,
            location: profile?.location ?? null,
            matchesOfficiated: data.matches_officiated ?? 0,
            tournamentsCount: data.tournaments_count ?? 0,
            ratingAvg: data.rating_avg,
            ratingCount: data.rating_count ?? 0,
            certificationLevel: data.certification_level ?? "community",
            sports: data.sports,
          }}
        />
      )}

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
