import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Users, MapPin, Lock, Crown, Check, Clock, Loader2, UserMinus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import SkillBadge from "@/components/SkillBadge";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { useGroup, useGroupMembership } from "@/hooks/useGroups";
import { toast } from "sonner";

const GroupDetailPage = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { group, members, myMembership, loading, refetch } = useGroup(groupId);
  const { join, leave, approve, removeMember } = useGroupMembership(groupId);
  const [acting, setActing] = useState(false);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary opacity-40" />
    </div>
  );

  if (!group) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-muted-foreground">
      <Users className="h-10 w-10 opacity-20" />
      <p className="text-sm">{t("groups.notFound")}</p>
      <button onClick={() => navigate(-1)} className="text-xs text-primary font-medium">{t("common.goBack")}</button>
    </div>
  );

  const isHost = myMembership?.role === "host" || myMembership?.role === "admin";
  const isMember = myMembership?.status === "active";
  const isPending = myMembership?.status === "pending";
  const pendingMembers = members.filter(m => m.status === "pending");
  const activeMembers = members.filter(m => m.status === "active");

  const handleJoin = async () => {
    setActing(true);
    const res = await join();
    if (res.error) toast.error(res.error);
    else toast.success(group.is_open ? t("groups.joined") : t("groups.requestSent"));
    await refetch();
    setActing(false);
  };

  const handleLeave = async () => {
    setActing(true);
    const res = await leave();
    if (res.error) toast.error(res.error);
    else toast.success(t("groups.left"));
    await refetch();
    setActing(false);
  };

  const handleApprove = async (userId: string) => {
    const res = await approve(userId);
    if (res.error) toast.error(res.error);
    else toast.success(t("groups.approved"));
    refetch();
  };

  const handleRemove = async (userId: string) => {
    const res = await removeMember(userId);
    if (res.error) toast.error(res.error);
    else toast.success(t("groups.removed"));
    refetch();
  };

  return (
    <div className="pb-20 min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button onClick={() => navigate(-1)} className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-base font-display font-bold text-foreground truncate flex-1">{group.name}</h1>
        </div>
      </div>

      <div className="px-4 pt-4 max-w-2xl mx-auto space-y-4">
        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-4 shadow-card bg-gradient-to-br from-primary/5 via-card to-card space-y-3">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-4xl shrink-0">
                {group.cover_emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-display font-bold text-card-foreground">{group.name}</h2>
                  {!group.is_open && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {group.skill_level !== "all" && <SkillBadge level={group.skill_level as any} />}
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Users className="h-3 w-3" /> {group.member_count} {t("common.members")}
                  </span>
                  {group.location && (
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <MapPin className="h-3 w-3" /> {group.location}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {group.description && (
              <p className="text-sm text-muted-foreground">{group.description}</p>
            )}

            {/* CTA */}
            {user && !isMember && !isPending && (
              <Button onClick={handleJoin} disabled={acting} className="w-full rounded-xl font-bold">
                {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : group.is_open ? t("groups.joinNow") : t("groups.requestJoin")}
              </Button>
            )}
            {isPending && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <p className="text-xs font-medium text-amber-700 dark:text-amber-400">{t("groups.pendingApproval")}</p>
              </div>
            )}
            {isMember && !isHost && (
              <button onClick={handleLeave} disabled={acting} className="w-full flex items-center justify-center gap-1.5 h-9 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:border-destructive/30 hover:text-destructive transition-colors">
                <UserMinus className="h-3.5 w-3.5" /> {t("groups.leaveGroup")}
              </button>
            )}
          </Card>
        </motion.div>

        {/* Pending approvals (host only) */}
        {isHost && pendingMembers.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-display font-bold text-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              {t("groups.pendingRequests")} ({pendingMembers.length})
            </h2>
            <Card className="shadow-card overflow-hidden">
              {pendingMembers.map((m, i) => (
                <div key={m.id} className={`flex items-center gap-3 px-3.5 py-2.5 ${i < pendingMembers.length - 1 ? "border-b border-border" : ""}`}>
                  <Avatar className="h-8 w-8 shrink-0">
                    {m.avatar_url && <AvatarImage src={m.avatar_url} />}
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">{(m.display_name || "?")[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <p className="flex-1 text-sm font-medium text-foreground truncate">{m.display_name || t("common.unknown")}</p>
                  <Button size="sm" className="h-7 px-3 text-xs gap-1" onClick={() => handleApprove(m.user_id)}>
                    <Check className="h-3 w-3" /> {t("groups.approve")}
                  </Button>
                </div>
              ))}
            </Card>
          </section>
        )}

        {/* Members */}
        <section className="space-y-2">
          <h2 className="text-sm font-display font-bold text-foreground flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            {t("groups.members")} ({activeMembers.length})
          </h2>
          <Card className="shadow-card overflow-hidden">
            {activeMembers.map((m, i) => (
              <div key={m.id} className={`flex items-center gap-3 px-3.5 py-2.5 ${i < activeMembers.length - 1 ? "border-b border-border" : ""}`}>
                <Avatar className="h-8 w-8 shrink-0">
                  {m.avatar_url && <AvatarImage src={m.avatar_url} />}
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">{(m.display_name || "?")[0].toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{m.display_name || t("common.unknown")}</p>
                </div>
                {m.role === "host" && (
                  <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                )}
                {isHost && m.user_id !== user?.id && (
                  <button onClick={() => handleRemove(m.user_id)} className="text-[10px] text-muted-foreground hover:text-destructive px-1.5 py-0.5 rounded transition-colors">
                    {t("groups.remove")}
                  </button>
                )}
              </div>
            ))}
          </Card>
        </section>
      </div>
    </div>
  );
};

export default GroupDetailPage;
