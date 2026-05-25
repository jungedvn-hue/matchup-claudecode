import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search, Loader2, Gavel, Star, Trophy, ShieldCheck, MapPin, Coins, Activity } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { useRefereeBrowse, type RefereeProfile } from "@/hooks/useReferee";
import InviteRefereeDialog from "@/components/InviteRefereeDialog";

type Sort = "nearby" | "matches" | "rating" | "tournaments";

const RefereesTab = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user, roles } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const sortParam = (searchParams.get("sort") as Sort | null) ?? "nearby";
  const [search, setSearch] = useState("");
  const { results, loading } = useRefereeBrowse(search);
  const [invitee, setInvitee] = useState<RefereeProfile | null>(null);

  const isHost = roles.includes("host") || roles.includes("master") || roles.includes("court_owner");

  const setSort = (s: Sort) => {
    const next = new URLSearchParams(searchParams);
    if (s === "nearby") next.delete("sort"); else next.set("sort", s);
    setSearchParams(next, { replace: true });
  };

  const sorted = useMemo(() => {
    const arr = [...results];
    if (sortParam === "matches") arr.sort((a, b) => (b.matches_officiated ?? 0) - (a.matches_officiated ?? 0));
    else if (sortParam === "rating") arr.sort((a, b) => {
      const ra = (a.rating_count ?? 0) >= 3 ? (a.rating_avg ?? 0) : -1;
      const rb = (b.rating_count ?? 0) >= 3 ? (b.rating_avg ?? 0) : -1;
      return rb - ra;
    });
    else if (sortParam === "tournaments") arr.sort((a, b) => (b.tournaments_count ?? 0) - (a.tournaments_count ?? 0));
    return arr.slice(0, 50);
  }, [results, sortParam]);

  const isLeaderboard = sortParam !== "nearby";

  const sorts: { key: Sort; label: string; icon: any }[] = [
    { key: "nearby",      label: t("refDisc.sort.nearby"),      icon: MapPin },
    { key: "matches",     label: t("refDisc.sort.matches"),     icon: Trophy },
    { key: "rating",      label: t("refDisc.sort.rating"),      icon: Star },
    { key: "tournaments", label: t("refDisc.sort.tournaments"), icon: Activity },
  ];

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={t("refBrowse.searchPh")} className="pl-9 h-10 rounded-xl" />
      </div>

      <div className="flex gap-1.5 overflow-x-auto -mx-4 px-4 pb-1">
        {sorts.map(s => {
          const Icon = s.icon;
          const active = sortParam === s.key;
          return (
            <button
              key={s.key}
              onClick={() => setSort(s.key)}
              className={`h-8 px-3 rounded-full text-[11px] font-bold flex items-center gap-1 whitespace-nowrap transition-colors ${
                active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3 w-3" /> {s.label}
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        {loading ? (
          <div className="py-12 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground/50" /></div>
        ) : sorted.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground space-y-1">
            <p className="font-semibold">{t("refBrowse.empty")}</p>
            <p className="text-[11px]">{t("refBrowse.emptyDesc")}</p>
          </Card>
        ) : (
          sorted.map((r, i) => (
            <motion.div key={r.user_id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.015 }}>
              <Card className="p-3 shadow-card hover:border-primary/30 transition-all">
                <div className="flex items-center gap-3">
                  {isLeaderboard && (
                    <div className={`w-7 text-center font-stat font-bold tabular-nums shrink-0 ${
                      i === 0 ? "text-amber-500 text-lg" : i < 3 ? "text-foreground" : "text-muted-foreground"
                    }`}>
                      {i + 1}
                    </div>
                  )}
                  <button onClick={() => navigate(`/referee/${r.user_id}`)} className="shrink-0">
                    <Avatar className="h-11 w-11">
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
                      {r.rate_per_match_coins != null && (
                        <span className="inline-flex items-center gap-0.5 font-stat tabular-nums text-primary">
                          <Coins className="h-3 w-3" />{r.rate_per_match_coins}/{t("ref.profile.matchShort")}
                        </span>
                      )}
                    </div>
                    {(r.sports?.length ?? 0) > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {r.sports!.slice(0, 3).map(s => (
                          <span key={s} className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold uppercase tracking-wide">{s}</span>
                        ))}
                      </div>
                    )}
                  </button>
                  {isLeaderboard ? (
                    <div className="text-right shrink-0">
                      <p className="font-stat font-bold text-lg text-primary tabular-nums leading-none">
                        {sortParam === "matches" ? r.matches_officiated
                          : sortParam === "rating" ? (r.rating_count >= 3 && r.rating_avg != null ? r.rating_avg.toFixed(2) : "—")
                          : (r.tournaments_count ?? 0)}
                      </p>
                      <p className="text-[9px] uppercase tracking-wide text-muted-foreground font-semibold mt-0.5">
                        {sortParam === "matches" ? t("refLB.matchesUnit") : sortParam === "rating" ? t("refLB.ratingUnit") : t("refLB.tournamentsUnit")}
                      </p>
                    </div>
                  ) : isHost && user?.id !== r.user_id ? (
                    <button onClick={() => setInvitee(r)} className="shrink-0 h-8 px-3 rounded-lg bg-primary text-primary-foreground text-[11px] font-bold flex items-center gap-1 hover:bg-primary/90">
                      <Gavel className="h-3 w-3" /> {t("refBrowse.invite")}
                    </button>
                  ) : null}
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

export default RefereesTab;
