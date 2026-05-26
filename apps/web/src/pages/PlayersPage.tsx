import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, MapPin, Loader2, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import PageHeader from "@/components/PageHeader";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as unknown as { from: (t: string) => any };

type PlayerRow = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  skill_level: string | null;
  dupr_rating: number | null;
  location: string | null;
  current_level: number | null;
};

const SKILL_LEVELS = ["beginner", "intermediate", "advanced"] as const;
type Skill = (typeof SKILL_LEVELS)[number];

const PlayersPage = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [skill, setSkill] = useState<Skill | "all">("all");
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      let q = sb.from("profiles")
        .select("user_id, display_name, avatar_url, skill_level, dupr_rating, location, current_level")
        .order("current_level", { ascending: false })
        .limit(50);
      if (user) q = q.neq("user_id", user.id);
      if (skill !== "all") q = q.eq("skill_level", skill);
      const { data } = await q;
      if (!cancelled) {
        setPlayers((data ?? []) as PlayerRow[]);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user, skill]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return players;
    return players.filter(p =>
      (p.display_name ?? "").toLowerCase().includes(term) ||
      (p.location ?? "").toLowerCase().includes(term)
    );
  }, [players, search]);

  return (
    <div className="pb-24 min-h-screen">
      <PageHeader
        title={t("players.title")}
        back
        onBack={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}
        right={<span className="text-xs text-muted-foreground">{filtered.length}</span>}
        className="space-y-3"
      >
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t("players.searchPh")}
            className="pl-9 h-10 rounded-xl"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
          <SkillChip active={skill === "all"} onClick={() => setSkill("all")} label={t("common.all")} />
          {SKILL_LEVELS.map(s => (
            <SkillChip key={s} active={skill === s} onClick={() => setSkill(s)} label={t(`players.skill.${s}`)} />
          ))}
        </div>
      </PageHeader>

      <div className="px-4 pt-4 max-w-2xl mx-auto">
        {loading ? (
          <div className="py-12 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground/50" /></div>
        ) : filtered.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground space-y-2">
            <Users className="h-8 w-8 mx-auto text-muted-foreground/30" />
            <p className="font-semibold">{t("players.empty")}</p>
            <p className="text-[11px]">{t("players.emptyDesc")}</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map(p => (
              <PlayerCard key={p.user_id} p={p} onClick={() => navigate(`/user/${p.user_id}`)} t={t} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const SkillChip = ({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) => (
  <button
    onClick={onClick}
    className={`shrink-0 px-3 h-8 rounded-full text-xs font-semibold transition-colors ${
      active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
    }`}
  >
    {label}
  </button>
);

const PlayerCard = ({ p, onClick, t }: { p: PlayerRow; onClick: () => void; t: (k: string) => string }) => {
  const name = p.display_name || "Player";
  return (
    <button onClick={onClick} className="w-full text-left">
      <Card className="p-3 flex items-center gap-3 hover:border-primary/40 transition-all active:scale-[0.99]">
        <Avatar className="h-12 w-12 shrink-0">
          {p.avatar_url && <AvatarImage src={p.avatar_url} />}
          <AvatarFallback className="bg-primary/10 text-primary font-display font-semibold">
            {name[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold text-foreground truncate">{name}</p>
            {p.current_level != null && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary tabular-nums shrink-0">
                Lv.{p.current_level}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
            {p.skill_level && (
              <span className="capitalize">{t(`players.skill.${p.skill_level}`)}</span>
            )}
            {p.dupr_rating != null && p.dupr_rating > 0 && (
              <span className="tabular-nums">DUPR {p.dupr_rating.toFixed(2)}</span>
            )}
          </div>
          {p.location && (
            <p className="text-[11px] text-muted-foreground flex items-center gap-0.5 mt-0.5 truncate">
              <MapPin className="h-3 w-3 shrink-0" /> {p.location}
            </p>
          )}
        </div>
      </Card>
    </button>
  );
};

export default PlayersPage;
