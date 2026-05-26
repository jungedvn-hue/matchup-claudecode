import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Check, Loader2, Search, UserPlus, Users as UsersIcon } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useFriends } from "@/hooks/useFriends";
import { inviteFriendsToGroup, useGroupPendingInviteeIds } from "@/hooks/useGroupInvites";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  groupId: string;
  groupName: string;
  existingMemberIds: Set<string>;
  onInvited?: () => void;
}

const InviteFriendsDialog = ({ open, onOpenChange, groupId, groupName, existingMemberIds, onInvited }: Props) => {
  const { t } = useLanguage();
  const { friends, loading } = useFriends();
  const { ids: pendingInviteeIds, refetch: refetchPending } = useGroupPendingInviteeIds(open ? groupId : undefined);

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return friends
      .map(f => f.other)
      .filter(p => !q || (p.display_name ?? "").toLowerCase().includes(q));
  }, [friends, search]);

  const toggle = (id: string) => setSelected(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const handleSend = async () => {
    if (selected.size === 0) return;
    setSending(true);
    const { invited, error } = await inviteFriendsToGroup(groupId, Array.from(selected), message.trim() || undefined);
    setSending(false);
    if (error) { toast.error(error); return; }
    toast.success(t("groups.invite.sent", { count: invited }).replace("{count}", String(invited)));
    setSelected(new Set()); setMessage(""); setSearch("");
    await refetchPending();
    onInvited?.();
    onOpenChange(false);
  };

  const handleClose = (v: boolean) => {
    if (!v) { setSelected(new Set()); setMessage(""); setSearch(""); }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-primary" />
            {t("groups.invite.title")}
          </DialogTitle>
          <DialogDescription>{t("groups.invite.subtitle", { group: groupName }).replace("{group}", groupName)}</DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t("groups.invite.searchPh")}
            className="pl-9 h-10 rounded-xl"
          />
        </div>

        {/* Friends list */}
        <div className="min-h-[200px] max-h-[40vh] overflow-y-auto -mx-1 px-1">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : list.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
              <UsersIcon className="h-8 w-8 opacity-30" />
              <p className="text-xs">{friends.length === 0 ? t("groups.invite.noFriends") : t("groups.invite.noResults")}</p>
            </div>
          ) : (
            <div className="space-y-1">
              {list.map(p => {
                const already = existingMemberIds.has(p.user_id);
                const pending = pendingInviteeIds.has(p.user_id);
                const disabled = already || pending;
                const checked = selected.has(p.user_id);
                return (
                  <button
                    key={p.user_id}
                    onClick={() => !disabled && toggle(p.user_id)}
                    disabled={disabled}
                    className={cn(
                      "w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-colors",
                      checked ? "bg-primary/10" : "hover:bg-secondary/40",
                      disabled && "opacity-50 cursor-not-allowed",
                    )}
                  >
                    <div className="h-9 w-9 rounded-full overflow-hidden bg-secondary flex items-center justify-center text-muted-foreground shrink-0">
                      {p.avatar_url ? <img src={p.avatar_url} alt="" className="h-full w-full object-cover" /> : <UsersIcon className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{p.display_name ?? "—"}</p>
                      {p.skill_level && (
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{p.skill_level}</p>
                      )}
                    </div>
                    {already ? (
                      <span className="text-[10px] font-medium text-muted-foreground">{t("groups.invite.alreadyMember")}</span>
                    ) : pending ? (
                      <span className="text-[10px] font-medium text-amber-600">{t("groups.invite.alreadyInvited")}</span>
                    ) : (
                      <div className={cn(
                        "h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors",
                        checked ? "bg-primary border-primary" : "border-border",
                      )}>
                        {checked && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Optional message */}
        {selected.size > 0 && (
          <div className="space-y-1">
            <p className="text-[11px] text-muted-foreground">{t("groups.invite.messageLabel")}</p>
            <Textarea
              rows={2}
              value={message}
              onChange={e => setMessage(e.target.value.slice(0, 200))}
              placeholder={t("groups.invite.messagePh")}
              className="resize-none"
            />
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => handleClose(false)} disabled={sending}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSend} disabled={sending || selected.size === 0}>
            {sending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            {selected.size > 0
              ? t("groups.invite.sendN").replace("{count}", String(selected.size))
              : t("groups.invite.send")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InviteFriendsDialog;
