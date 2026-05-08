import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Users, MapPin, Search, Loader2, Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/i18n/LanguageContext";
import { useNavigate } from "react-router-dom";
import { useGroups, useMyGroups, type SkillLevel } from "@/hooks/useGroups";
import { useAuth } from "@/context/AuthContext";
import SkillBadge from "@/components/SkillBadge";
import CreateGroupDialog from "@/components/CreateGroupDialog";

const SKILL_FILTERS: SkillLevel[] = ["all", "beginner", "intermediate", "advanced", "pro"];

const GroupsPage = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { session } = useAuth();

  const [tab, setTab] = useState<"discover" | "mine">("discover");
  const [skill, setSkill] = useState<SkillLevel>("all");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const { groups: discovered, loading: loadingDiscover, refetch: refetchDiscover } = useGroups({ skill, search });
  const { groups: myGroups, loading: loadingMine, refetch: refetchMine } = useMyGroups();

  const list = tab === "discover" ? discovered : myGroups;
  const loading = tab === "discover" ? loadingDiscover : loadingMine;

  const handleCreated = () => { refetchDiscover(); refetchMine(); setTab("mine"); };

  return (
    <div className="pb-20 min-h-screen">
      <CreateGroupDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={handleCreated} />

      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3 space-y-3">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <h1 className="text-lg font-display font-bold text-foreground flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> {t("groups.title")}
          </h1>
          {session && (
            <button onClick={() => setCreateOpen(true)}
              className="flex items-center gap-1.5 h-8 px-3 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors">
              <Plus className="h-3.5 w-3.5" /> {t("groups.newGroup")}
            </button>
          )}
        </div>

        <div className="max-w-2xl mx-auto flex gap-1 bg-secondary/60 rounded-xl p-0.5">
          {([["discover", t("groups.discover")], ["mine", t("groups.myGroups")]] as const).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${tab === key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              {label}
            </button>
          ))}
        </div>

        {tab === "discover" && (
          <>
            <div className="max-w-2xl mx-auto relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input placeholder={t("groups.searchPh")} value={search} onChange={e => setSearch(e.target.value)}
                className="w-full h-9 pl-9 pr-4 rounded-xl bg-secondary/60 text-sm placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div className="max-w-2xl mx-auto flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
              {SKILL_FILTERS.map(s => (
                <button key={s} onClick={() => setSkill(s)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-all shrink-0 ${skill === s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                  {s === "all" ? t("common.all") : t(`skill.${s}`)}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="px-4 pt-4 max-w-2xl mx-auto space-y-2.5">
        {loading ? (
          <div className="py-20 flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin opacity-40" />
            <p className="text-sm">{t("common.loading")}</p>
          </div>
        ) : list.length === 0 ? (
          <div className="py-20 flex flex-col items-center gap-3 text-muted-foreground">
            <Users className="h-10 w-10 opacity-20" />
            <p className="text-sm">{tab === "mine" ? t("groups.noMyGroups") : t("groups.noGroups")}</p>
            {session && tab === "mine" && (
              <button onClick={() => setCreateOpen(true)}
                className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-semibold">
                <Plus className="h-3.5 w-3.5" /> {t("groups.newGroup")}
              </button>
            )}
          </div>
        ) : list.map((group, i) => (
          <motion.div key={group.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <button className="w-full text-left" onClick={() => navigate(`/group/${group.id}`)}>
              <Card className="p-3.5 shadow-card hover:border-primary/30 transition-all bg-gradient-to-br from-primary/5 via-card to-card">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl shrink-0">
                    {group.cover_emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-display font-bold text-foreground truncate">{group.name}</p>
                      {group.skill_level !== "all" && <SkillBadge level={group.skill_level as any} />}
                      {!group.is_open && <Lock className="h-3 w-3 text-muted-foreground shrink-0" />}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-0.5"><Users className="h-3 w-3" /> {group.member_count}</span>
                      {group.location && <span className="flex items-center gap-0.5 truncate"><MapPin className="h-3 w-3 shrink-0" /> {group.location}</span>}
                    </div>
                    {group.description && <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{group.description}</p>}
                  </div>
                  <span className={`shrink-0 text-[9px] font-bold px-2 py-1 rounded-full ${group.is_open ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-secondary text-muted-foreground"}`}>
                    {group.is_open ? t("groups.open") : t("groups.closed")}
                  </span>
                </div>
              </Card>
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default GroupsPage;
