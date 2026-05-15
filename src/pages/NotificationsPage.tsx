import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Bell, Users, Megaphone, Calendar, Gift, UserPlus, Check, Coins } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useNotifications, type Notification } from "@/hooks/useNotifications";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TYPE_META: Record<string, { icon: React.ElementType; color: string }> = {
  group_join_request: { icon: UserPlus,  color: "text-amber-500 bg-amber-500/10" },
  group_approved:     { icon: Check,     color: "text-emerald-500 bg-emerald-500/10" },
  group_announcement: { icon: Megaphone, color: "text-blue-500 bg-blue-500/10" },
  event_created:      { icon: Calendar,  color: "text-purple-500 bg-purple-500/10" },
  event_reminder:     { icon: Calendar,  color: "text-orange-500 bg-orange-500/10" },
  gift_received:      { icon: Gift,      color: "text-pink-500 bg-pink-500/10" },
  friend_request:     { icon: UserPlus,  color: "text-primary bg-primary/10" },
  friend_accepted:    { icon: Users,     color: "text-emerald-500 bg-emerald-500/10" },
};

const formatTime = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const NotifItem = ({ notif, onClick }: { notif: Notification; onClick: () => void }) => {
  const meta = TYPE_META[notif.type] ?? { icon: Bell, color: "text-muted-foreground bg-secondary" };
  const Icon = meta.icon;

  return (
    <motion.button
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className={cn(
        "w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/50",
        !notif.read_at && "bg-primary/[0.03]"
      )}
    >
      <div className={cn("h-9 w-9 rounded-full flex items-center justify-center shrink-0 mt-0.5", meta.color)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm leading-snug", !notif.read_at ? "font-semibold text-foreground" : "font-medium text-foreground/80")}>
          {notif.title}
        </p>
        {notif.body && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.body}</p>
        )}
        <p className="text-[10px] text-muted-foreground/60 mt-1">{formatTime(notif.created_at)}</p>
      </div>
      {!notif.read_at && (
        <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />
      )}
    </motion.button>
  );
};

const NotificationsPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { notifications, loading, unreadCount, markRead, markAllRead } = useNotifications();

  const handleClick = (notif: Notification) => {
    if (!notif.read_at) markRead([notif.id]);
    if (notif.link) navigate(notif.link);
  };

  return (
    <div className="pb-20 min-h-screen">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-lg font-display font-bold text-foreground flex-1">{t("notif.title")}</h1>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="text-xs text-primary h-8" onClick={markAllRead}>
              {t("notif.markAllRead")}
            </Button>
          )}
        </div>
      </div>

      <div className="pt-2">
        {loading ? (
          <div className="flex flex-col gap-2 px-4 pt-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-secondary animate-pulse" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
            <Bell className="h-10 w-10 opacity-20" />
            <p className="text-sm">{t("notif.empty")}</p>
          </div>
        ) : (
          <Card className="mx-4 mt-2 shadow-card overflow-hidden divide-y divide-border">
            {notifications.map(n => (
              <NotifItem key={n.id} notif={n} onClick={() => handleClick(n)} />
            ))}
          </Card>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
