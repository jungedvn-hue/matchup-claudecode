import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Users, UserPlus, UserCheck, Clock, Check, X, Loader2, Search, UserMinus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import SkillBadge from "@/components/SkillBadge";
import { useLanguage } from "@/i18n/LanguageContext";
import { useFriends, useFriendActions, useFriendRelation, type FriendEntry } from "@/hooks/useFriends";
import { useUserSearch, type UserSearchResult } from "@/hooks/useUserSearch";
import { toast } from "sonner";

type Tab = "friends" | "incoming" | "outgoing" | "search";

// ── Per-result row: own hook call for relation status ─────────────────────────
const SearchResultRow = ({ result, onAction }: { result: UserSearchResult; onAction: () => void }) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { relation, friendshipId, loading: relLoading, refetch: refetchRel } = useFriendRelation(result.user_id);
  const { sendRequest, cancelRequest, removeFriend, acceptRequest } = useFriendActions();
  const [acting, setActing] = useState(false);

  const act = async (fn: () => Promise<{ error?: string }>, msg: string) => {
    setActing(true);
    const { error } = await fn();
    if (error) toast.error(error); else { toast.success(msg); refetchRel(); onAction(); }
    setActing(false);
  };

  const actionBtn = () => {
    if (relLoading || acting) return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
    if (relation === "friends") return (
      <Button variant="outline" size="sm" className="rounded-xl h-8 px-2.5 text-[11px]"
        onClick={() => { if (confirm(t("friends.confirmUnfriend"))) act(() => removeFriend(friendshipId!), t("friends.unfriended")); }}>
        <UserMinus className="h-3.5 w-3.5 mr-1" />{t("friends.alreadyFriends")}
      </Button>
    );
    if (relation === "outgoing") return (
      <Button variant="outline" size="sm" className="rounded-xl h-8 px-2.5 text-[11px]"
        onClick={() => act(() => cancelRequest(friendshipId!), t("friends.requestCancelled"))}>
        {t("friends.pendingRequest")}
      </Button>
    );
    if (relation === "incoming") return (
      <Button size="sm" className="rounded-xl h-8 px-2.5 text-[11px]"
        onClick={() => act(() => acceptRequest(friendshipId!), t("friends.accepted"))}>
        <Check className="h-3.5 w-3.5 mr-1" />{t("friends.accept")}
      </Button>
    );
    return (
      <Button size="sm" className="rounded-xl h-8 px-2.5 text-[11px]"
        onClick={() => act(() => sendRequest(result.user_id), t("friends.requestSent"))}>
        <UserPlus className="h-3.5 w-3.5 mr-1" />{t("friends.addFriend")}
      </Button>
    );
  };

  return (
    <Card className="p-3 shadow-card flex items-center gap-3">
      <button onClick={() => navigate(`/user/${result.user_id}`)} className="flex items-center gap-3 flex-1 min-w-0">
        <Avatar className="h-11 w-11">
          <AvatarImage src={result.avatar_url ?? undefined} />
          <AvatarFallback className="bg-secondary text-foreground font-display font-bold">
            {(result.display_name ?? "?").charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 text-left">
          <p className="text-sm font-semibold text-foreground truncate">{result.display_name ?? t("common.unknown")}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {result.skill_level && <SkillBadge level={result.skill_level as any} />}
            {result.location && <span className="text-[10px] text-muted-foreground truncate">{result.location}</span>}
          </div>
        </div>
      </button>
      <div className="shrink-0">{actionBtn()}</div>
    </Card>
  );
};

// ── Search panel ──────────────────────────────────────────────────────────────
const SearchPanel = ({ onAction }: { onAction: () => void }) => {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const { results, loading } = useUserSearch(query);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={t("friends.searchPlaceholder")}
          className="w-full h-10 pl-9 pr-3 rounded-xl border border-border bg-secondary/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
        />
      </div>
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary opacity-40" /></div>
      ) : query.trim().length < 2 ? (
        <Card className="p-8 text-center text-muted-foreground shadow-card">
          <Search className="h-8 w-8 mx-auto opacity-20 mb-2" />
          <p className="text-sm">{t("friends.searchPrompt")}</p>
        </Card>
      ) : results.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground shadow-card">
          <Users className="h-8 w-8 mx-auto opacity-20 mb-2" />
          <p className="text-sm">{t("friends.searchEmpty")}</p>
        </Card>
      ) : (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
          {results.map(r => <SearchResultRow key={r.user_id} result={r} onAction={onAction} />)}
        </motion.div>
      )}
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────
const FriendsPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { friends, incoming, outgoing, loading, refetch } = useFriends();
  const { acceptRequest, rejectRequest, cancelRequest, removeFriend } = useFriendActions();
  const [tab, setTab] = useState<Tab>(incoming.length > 0 ? "incoming" : "friends");
  const [actingId, setActingId] = useState<string | null>(null);

  const run = async (fid: string, fn: () => Promise<{ error?: string }>, okMsg: string) => {
    setActingId(fid);
    const { error } = await fn();
    if (error) toast.error(error);
    else toast.success(okMsg);
    await refetch();
    setActingId(null);
  };

  const renderRow = (e: FriendEntry, actions: React.ReactNode) => (
    <Card key={e.friendship.id} className="p-3 shadow-card flex items-center gap-3">
      <button onClick={() => navigate(`/user/${e.other.user_id}`)} className="flex items-center gap-3 flex-1 min-w-0">
        <Avatar className="h-11 w-11">
          <AvatarImage src={e.other.avatar_url ?? undefined} />
          <AvatarFallback className="bg-secondary text-foreground font-display font-bold">
            {(e.other.display_name ?? "?").charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 text-left">
          <p className="text-sm font-semibold text-foreground truncate">{e.other.display_name ?? t("common.unknown")}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {e.other.skill_level && <SkillBadge level={e.other.skill_level as any} />}
            {e.other.location && <span className="text-[10px] text-muted-foreground truncate">{e.other.location}</span>}
          </div>
        </div>
      </button>
      {actions}
    </Card>
  );

  const friendsList = friends.map(e => renderRow(e,
    <Button variant="outline" size="sm" disabled={actingId === e.friendship.id} className="rounded-xl"
      onClick={() => { if (confirm(t("friends.confirmUnfriend"))) run(e.friendship.id, () => removeFriend(e.friendship.id), t("friends.unfriended")); }}>
      {actingId === e.friendship.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
    </Button>
  ));

  const incomingList = incoming.map(e => renderRow(e,
    <div className="flex gap-1.5">
      <Button size="sm" disabled={actingId === e.friendship.id} className="rounded-xl h-8 px-2.5"
        onClick={() => run(e.friendship.id, () => acceptRequest(e.friendship.id), t("friends.accepted"))}>
        {actingId === e.friendship.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-4 w-4" />}
      </Button>
      <Button variant="outline" size="sm" disabled={actingId === e.friendship.id} className="rounded-xl h-8 px-2.5"
        onClick={() => run(e.friendship.id, () => rejectRequest(e.friendship.id), t("friends.rejected"))}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  ));

  const outgoingList = outgoing.map(e => renderRow(e,
    <Button variant="outline" size="sm" disabled={actingId === e.friendship.id} className="rounded-xl h-8 px-2.5"
      onClick={() => run(e.friendship.id, () => cancelRequest(e.friendship.id), t("friends.requestCancelled"))}>
      {actingId === e.friendship.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t("common.cancel")}
    </Button>
  ));

  const tabs: Array<{ key: Tab; label: string; count: number; icon: typeof Users }> = [
    { key: "friends", label: t("friends.friends"), count: friends.length, icon: UserCheck },
    { key: "incoming", label: t("friends.incoming"), count: incoming.length, icon: UserPlus },
    { key: "outgoing", label: t("friends.outgoing"), count: outgoing.length, icon: Clock },
    { key: "search", label: t("friends.search"), count: 0, icon: Search },
  ];

  const activeList = tab === "friends" ? friendsList : tab === "incoming" ? incomingList : outgoingList;
  const activeCount = tab === "friends" ? friends.length : tab === "incoming" ? incoming.length : outgoing.length;

  return (
    <div className="pb-20 min-h-screen">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button onClick={() => navigate(-1)} className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-lg font-display font-bold text-foreground flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            {t("friends.title")}
          </h1>
        </div>
      </div>

      <div className="px-4 pt-3 max-w-2xl mx-auto">
        {/* Tabs */}
        <div className="grid grid-cols-4 gap-1.5 p-1 rounded-2xl bg-secondary/60 mb-4">
          {tabs.map(({ key, label, count, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`relative flex flex-col items-center gap-0.5 py-2 px-1 rounded-xl text-[11px] font-semibold transition-all ${tab === key ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}>
              <Icon className="h-4 w-4" />
              <span>{label}</span>
              {count > 0 && (
                <span className={`absolute top-1 right-1.5 h-4 min-w-4 px-1 rounded-full text-[9px] flex items-center justify-center font-bold ${tab === key ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>{count}</span>
              )}
            </button>
          ))}
        </div>

        {tab === "search" ? (
          <SearchPanel onAction={refetch} />
        ) : loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary opacity-40" />
          </div>
        ) : activeCount === 0 ? (
          <Card className="p-8 text-center text-muted-foreground shadow-card">
            <Users className="h-10 w-10 mx-auto opacity-20 mb-2" />
            <p className="text-sm">
              {tab === "friends" ? t("friends.emptyFriends") :
               tab === "incoming" ? t("friends.emptyIncoming") :
               t("friends.emptyOutgoing")}
            </p>
          </Card>
        ) : (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
            {activeList}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default FriendsPage;
