import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, UserPlus, UserCheck, UserX, Clock, Check, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useFriendRelation, useFriendActions } from "@/hooks/useFriends";
import { useLanguage } from "@/i18n/LanguageContext";
import { toast } from "sonner";

interface Props {
  userId: string;
  size?: "sm" | "default";
  className?: string;
}

const FriendButton = ({ userId, size = "sm", className = "" }: Props) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { relation, friendshipId, refetch } = useFriendRelation(userId);
  const { sendRequest, acceptRequest, rejectRequest, cancelRequest, removeFriend } = useFriendActions();
  const [busy, setBusy] = useState(false);

  if (!user || user.id === userId) return null;

  const run = async (fn: () => Promise<{ error?: string }>, okMsg: string) => {
    setBusy(true);
    const { error } = await fn();
    if (error) toast.error(error);
    else toast.success(okMsg);
    await refetch();
    setBusy(false);
  };

  if (relation === "friends") {
    return (
      <Button
        variant="outline"
        size={size}
        disabled={busy}
        className={`rounded-xl ${className}`}
        onClick={() => {
          if (friendshipId && confirm(t("friends.confirmUnfriend"))) {
            run(() => removeFriend(friendshipId), t("friends.unfriended"));
          }
        }}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><UserCheck className="h-4 w-4 mr-1.5" />{t("friends.friends")}</>}
      </Button>
    );
  }

  if (relation === "outgoing") {
    return (
      <Button
        variant="outline"
        size={size}
        disabled={busy}
        className={`rounded-xl ${className}`}
        onClick={() => friendshipId && run(() => cancelRequest(friendshipId), t("friends.requestCancelled"))}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Clock className="h-4 w-4 mr-1.5" />{t("friends.requestSent")}</>}
      </Button>
    );
  }

  if (relation === "incoming") {
    return (
      <div className={`flex gap-1.5 ${className}`}>
        <Button
          size={size}
          disabled={busy}
          className="rounded-xl"
          onClick={() => friendshipId && run(() => acceptRequest(friendshipId), t("friends.accepted"))}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4 mr-1" />{t("friends.accept")}</>}
        </Button>
        <Button
          variant="outline"
          size={size}
          disabled={busy}
          className="rounded-xl"
          onClick={() => friendshipId && run(() => rejectRequest(friendshipId), t("friends.rejected"))}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  if (relation === "blocked") {
    return (
      <Button variant="outline" size={size} disabled className={`rounded-xl ${className}`}>
        <UserX className="h-4 w-4 mr-1.5" />{t("friends.blocked")}
      </Button>
    );
  }

  return (
    <Button
      size={size}
      disabled={busy}
      className={`rounded-xl ${className}`}
      onClick={() => run(() => sendRequest(userId), t("friends.requestSent"))}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><UserPlus className="h-4 w-4 mr-1.5" />{t("friends.addFriend")}</>}
    </Button>
  );
};

export default FriendButton;
