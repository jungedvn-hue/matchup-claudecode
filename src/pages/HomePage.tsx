import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Bell, Search, Plus, Users, Calendar, ChevronRight, Crown, Navigation, Filter, X, Star, LayoutDashboard, ShoppingBag, Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import SkillBadge from "@/components/SkillBadge";
import { GroupRating, StarDisplay } from "@/components/GroupRating";
import { useNavigate } from "react-router-dom";
import LogMatchDialog from "@/components/LogMatchDialog";
import { pendingMatches } from "@/data/profile";
import { ShieldCheck } from "lucide-react";
import { groups, nearbyGroups, Group } from "@/data/groups";
import JoinGroupDialog from "@/components/JoinGroupDialog";
import { toast } from "@/hooks/use-toast";
import { useRoles, hasRole } from "@/hooks/use-roles";
import { useLanguage } from "@/i18n/LanguageContext";

const skillFilters = ["all", "beginner", "intermediate", "advanced", "pro"] as const;

const HomePage = () => {
  const navigate = useNavigate();
  const roles = useRoles();
  const { t } = useLanguage();
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [joinGroup, setJoinGroup] = useState<Group | null>(null);
  const [joinMode, setJoinMode] = useState<"join" | "request">("join");
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());
  const [logDialogOpen, setLogDialogOpen] = useState(false);

  const isPlayer = hasRole(roles, "player");
  const isHost = hasRole(roles, "host");
  const isCourtOwner = hasRole(roles, "court_owner");
  const isStoreOwner = hasRole(roles, "store_owner");

  const quickStats = [
    isPlayer && { label: t("stats.myGroups"), value: "5", icon: Users },
    isPlayer && { label: t("stats.upcoming"), value: "3", icon: Calendar },
    isHost && { label: t("stats.hosting"), value: "3", icon: Crown },
    isCourtOwner && { label: t("stats.courts"), value: "4", icon: MapPin },
    isStoreOwner && { label: t("stats.orders"), value: "12", icon: ShoppingBag },
  ].filter(Boolean) as { label: string; value: string; icon: any }[];

  const handleJoinClick = (e: React.MouseEvent, group: Group, mode: "join" | "request") => {
    e.stopPropagation();
    setJoinGroup(group);
    setJoinMode(mode);
  };

  const handleJoinConfirm = (groupId: string) => {
    setJoinedIds((prev) => new Set(prev).add(groupId));
    toast({
      title: joinMode === "join" ? t("home.joinedGroup") : t("home.requestSent"),
      description: joinMode === "join" ? t("home.joinedGroupDesc") : t("home.requestSentDesc"),
    });
  };

  const filterGroups = (list: Group[]) =>
    list.filter((g) => {
      const matchSkill = activeFilter === "all" || g.skill === activeFilter;
      const matchSearch = !searchQuery || g.name.toLowerCase().includes(searchQuery.toLowerCase()) || g.location.toLowerCase().includes(searchQuery.toLowerCase());
      return matchSkill && matchSearch;
    });

  const filteredMyGroups = filterGroups(groups);
  const filteredNearby = filterGroups(nearbyGroups);

  const dashboardTiles = [
    isHost && { emoji: "📋", label: t("tile.hostDashboard"), desc: t("tile.hostDashboardDesc"), path: "/dashboard" },
    isHost && { emoji: "🏆", label: t("tile.tournaments"), desc: t("tile.tournamentsDesc"), path: "/tournaments" },
    isPlayer && { emoji: "⚡", label: "Ghi điểm DUPR", desc: "Cập nhật rating ngay", action: () => setLogDialogOpen(true) },
    isCourtOwner && { emoji: "🏟️", label: t("tile.myCourts"), desc: t("tile.myCourtsDesc"), path: "/dashboard" },
    isStoreOwner && { emoji: "🛒", label: t("tile.myStore"), desc: t("tile.myStoreDesc"), path: "/marketplace" },
  ].filter(Boolean) as { emoji: string; label: string; desc: string; path?: string; action?: () => void }[];

  return (
    <div className="pb-20 min-h-screen">
      <LogMatchDialog open={logDialogOpen} onOpenChange={setLogDialogOpen} />
      <JoinGroupDialog
        group={joinGroup}
        open={!!joinGroup}
        onOpenChange={(open) => !open && setJoinGroup(null)}
        onJoin={handleJoinConfirm}
        mode={joinMode}
      />

      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-display font-bold text-foreground">{t("home.title")}</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" /> San Francisco, CA
              </p>
              <div className="flex gap-1">
                {roles.map(r => (
                  <span key={r} className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium capitalize">
                    {r === "court_owner" ? "Court" : r === "store_owner" ? "Store" : r}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className={`h-9 w-9 rounded-xl flex items-center justify-center transition-colors ${
                searchOpen ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {searchOpen ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
            </button>
            <button className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors relative">
              <Bell className="h-4 w-4" />
              <div className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-sport-orange" />
            </button>
          </div>
        </div>

        <AnimatePresence>
          {searchOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="pt-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder={t("home.searchPlaceholder")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-10 pl-10 pr-4 rounded-xl bg-secondary text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30"
                    autoFocus
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Pending Verifications Alert */}
      {pendingMatches.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="px-4 pt-2"
        >
          <div 
            onClick={() => navigate("/verify")}
            className="flex items-center justify-between p-3 bg-sport-orange/10 border border-sport-orange/20 rounded-xl cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-sport-orange" />
              <p className="text-[11px] font-bold text-sport-orange">BẠN CÓ {pendingMatches.length} TRẬN ĐẤU CẦN XÁC THỰC</p>
            </div>
            <ChevronRight className="h-4 w-4 text-sport-orange" />
          </div>
        </motion.div>
      )}

      <div className="px-4 space-y-5 pt-4">
        {/* Quick Stats */}
        {quickStats.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`grid gap-2 ${quickStats.length <= 3 ? `grid-cols-${quickStats.length}` : "grid-cols-3"}`}
            style={{ gridTemplateColumns: `repeat(${Math.min(quickStats.length, 4)}, 1fr)` }}
          >
            {quickStats.map((stat, i) => (
              <Card key={i} className="p-3 text-center shadow-card">
                <stat.icon className="h-4 w-4 mx-auto text-primary mb-1" />
                <p className="text-lg font-display font-bold text-foreground">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground font-medium">{stat.label}</p>
              </Card>
            ))}
          </motion.div>
        )}

        {/* Dashboard Tiles */}
        {dashboardTiles.length > 0 && (
          <div>
            <h2 className="text-base font-display font-semibold text-foreground mb-3">{t("common.manage")}</h2>
            <div className="grid grid-cols-2 gap-3">
              {dashboardTiles.map((tile, i) => (
                <motion.div key={tile.label} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
                  <Card
                    className="p-4 shadow-card hover:shadow-elevated transition-all cursor-pointer active:scale-[0.97]"
                    onClick={() => tile.path ? navigate(tile.path) : tile.action?.()}
                  >
                    <span className="text-2xl">{tile.emoji}</span>
                    <h3 className="text-xs font-display font-bold text-card-foreground mt-2">{tile.label}</h3>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{tile.desc}</p>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Player sections */}
        {isPlayer && (
          <>
            {/* Skill Filter Chips */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                {skillFilters.map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-all ${
                      activeFilter === filter
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {filter === "all" ? t("common.all") : filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </button>
                ))}
              </div>
            </motion.div>

            {/* My Groups */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-display font-semibold text-foreground">{t("home.myGroups")}</h2>
                <Button size="sm" variant="outline" className="rounded-xl gap-1 text-xs h-8">
                  <Plus className="h-3.5 w-3.5" /> {t("home.newGroup")}
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {filteredMyGroups.map((group, i) => {
                  const isFeatured = i === 0;
                  return (
                    <motion.div key={group.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }} className={isFeatured ? "col-span-2" : ""}>
                      <Card
                        className={`overflow-hidden shadow-card hover:shadow-elevated transition-all cursor-pointer group relative ${isFeatured ? "p-0" : ""}`}
                        onClick={() => navigate(`/group/${group.id}`)}
                      >
                        {isFeatured ? (
                          <div className="relative">
                            <div className="h-2 bg-gradient-to-r from-primary to-accent" />
                            <div className="p-4">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-2xl">{group.emoji}</span>
                                <div className="flex-1">
                                  <h3 className="text-sm font-display font-bold text-card-foreground">{group.name}</h3>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-primary/10 text-primary">{group.role}</span>
                                    <SkillBadge level={group.skill} />
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                    <Navigation className="h-2.5 w-2.5" /> {group.distance}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {group.members} {t("common.members")}</span>
                                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {group.location}</span>
                                <span className="flex items-center gap-1">
                                  <StarDisplay rating={group.avgRating} />
                                  <span className="text-[10px]">{group.avgRating}</span>
                                </span>
                              </div>
                              <div className="flex items-center justify-between mt-3">
                                <div className="flex items-center gap-1.5">
                                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                                  <span className="text-xs text-primary font-medium">{group.activePlayers} {t("common.playingNow")}</span>
                                </div>
                                <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                                  Next: {group.nextEvent}
                                  <ChevronRight className="h-3.5 w-3.5 group-hover:text-primary transition-colors" />
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 flex flex-col h-full min-h-[140px] justify-between">
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xl">{group.emoji}</span>
                                <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                                  <Navigation className="h-2 w-2" /> {group.distance}
                                </span>
                              </div>
                              <h3 className="text-xs font-display font-bold text-card-foreground leading-tight">{group.name}</h3>
                              <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-0.5">
                                <MapPin className="h-2.5 w-2.5" /> {group.location}
                              </p>
                            </div>
                            <div className="mt-auto pt-2 border-t border-border">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                  <Users className="h-2.5 w-2.5" /> {group.members}
                                </span>
                                <SkillBadge level={group.skill} />
                              </div>
                              <p className="text-[10px] text-primary font-medium mt-1">{group.nextEvent}</p>
                            </div>
                          </div>
                        )}
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Nearby Groups */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-base font-display font-semibold text-foreground flex items-center gap-1.5">
                    <Navigation className="h-4 w-4 text-primary" /> {t("home.nearbyGroups")}
                  </h2>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{t("home.exploreNearby")}</p>
                </div>
                <button className="text-[11px] text-primary font-medium" onClick={() => navigate("/discover")}>
                  {t("home.viewAll")}
                </button>
              </div>
              <div className="space-y-2.5">
                {filteredNearby.map((group, i) => (
                  <motion.div key={group.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.06 }}>
                    <Card className="p-3 shadow-card hover:shadow-elevated transition-all cursor-pointer group" onClick={() => navigate(`/group/${group.id}`)}>
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-xl shrink-0">
                          {group.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="text-xs font-display font-bold text-card-foreground truncate">{group.name}</h3>
                            <span className="text-[9px] text-muted-foreground flex items-center gap-0.5 shrink-0 ml-2">
                              <Navigation className="h-2.5 w-2.5" /> {group.distance}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                              <MapPin className="h-2.5 w-2.5" /> {group.location}
                            </span>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                              <Users className="h-2.5 w-2.5" /> {group.members}
                            </span>
                            <span className="flex items-center gap-0.5">
                              <StarDisplay rating={group.avgRating} />
                              <span className="text-[9px] text-muted-foreground">{group.avgRating}</span>
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-1.5">
                            <div className="flex items-center gap-1.5">
                              {group.activePlayers > 0 ? (
                                <>
                                  <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                                  <span className="text-[10px] text-primary font-medium">{group.activePlayers} {t("common.playingNow")}</span>
                                </>
                              ) : (
                                <span className="text-[10px] text-muted-foreground">Next: {group.nextEvent}</span>
                              )}
                            </div>
                            {joinedIds.has(group.id) ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">✓ Joined</span>
                            ) : group.isOpen ? (
                              <Button size="sm" className="h-6 px-3 text-[10px] rounded-full font-semibold" onClick={(e) => handleJoinClick(e, group, "join")}>Join</Button>
                            ) : (
                              <button className="text-[9px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-medium hover:bg-primary/10 hover:text-primary transition-colors" onClick={(e) => handleJoinClick(e, group, "request")}>Request</button>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default HomePage;
