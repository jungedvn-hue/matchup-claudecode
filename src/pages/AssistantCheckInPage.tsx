import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ScanLine, MapPin, Calendar, Clock, Users, Shield, Lock, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { useGroup } from "@/hooks/useGroups";
import { useGroupEvents } from "@/hooks/useGroupEvents";
import { useMyAssistantPermissions, type AssistantPermission } from "@/hooks/useAssistants";

const AssistantCheckInPage = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { group, loading: loadingGroup } = useGroup(groupId);
  const { events } = useGroupEvents(groupId);
  const { row: assistantRow, can, loading: loadingPerms } = useMyAssistantPermissions(groupId);

  const isHost = group && user && group.host_user_id === user.id;
  const hasCheckIn = isHost || can("check_in");

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  // Today's events: from -2h to +10h window
  const todayEvents = events.filter(e => {
    const t = new Date(e.event_date).getTime();
    return t > now - 2 * 3600_000 && t < now + 10 * 3600_000;
  });

  if (loadingGroup || loadingPerms) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary opacity-40" />
    </div>
  );

  if (!group) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-muted-foreground">
      <p className="text-sm">{t("groups.notFound")}</p>
      <button onClick={() => navigate(-1)} className="text-xs text-primary font-medium">{t("common.goBack")}</button>
    </div>
  );

  if (!hasCheckIn) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-muted-foreground px-6">
      <Lock className="h-10 w-10 opacity-30" />
      <p className="text-sm text-center">{t("assistant.noPermission")}</p>
      <button onClick={() => navigate(-1)} className="text-xs text-primary font-medium">{t("common.goBack")}</button>
    </div>
  );

  const assignedCourts = assistantRow?.assigned_courts ?? [];
  const myPerms: AssistantPermission[] = (assistantRow?.permissions ?? []) as AssistantPermission[];

  return (
    <div className="pb-20 min-h-screen">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <h1 className="text-base font-display font-bold text-foreground truncate flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary shrink-0" />
              {t("assistant.workspaceTitle")}
            </h1>
            <p className="text-[11px] text-muted-foreground truncate">{group.cover_emoji} {group.name}</p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 max-w-2xl mx-auto space-y-4">
        {/* Assignment summary */}
        {!isHost && assistantRow && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="p-3.5 shadow-card bg-gradient-to-br from-primary/5 via-card to-card">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">{t("assistant.yourAssignment")}</p>
              <div className="space-y-2">
                {assignedCourts.length > 0 && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                    <div className="flex flex-wrap gap-1">
                      {assignedCourts.map(c => (
                        <span key={c} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">{c}</span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <Shield className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                  <div className="flex flex-wrap gap-1">
                    {myPerms.map(p => (
                      <span key={p} className="px-2 py-0.5 rounded-full bg-secondary text-foreground text-[10px] font-medium">{t(`assistant.perm.${p}`)}</span>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Today's events */}
        <section>
          <h2 className="text-sm font-display font-bold text-foreground flex items-center gap-2 mb-2">
            <Calendar className="h-4 w-4 text-primary" />
            {t("assistant.todayEvents")} ({todayEvents.length})
          </h2>
          {todayEvents.length === 0 ? (
            <Card className="p-6 text-center text-muted-foreground shadow-card">
              <Calendar className="h-9 w-9 mx-auto opacity-20 mb-2" />
              <p className="text-xs">{t("assistant.noEventsToday")}</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {todayEvents.map(e => (
                <Card key={e.id} className="p-3 shadow-card">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{e.title}</p>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3" /> {new Date(e.event_date).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                        {e.location && <><span>·</span><span className="truncate">{e.location}</span></>}
                      </p>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Users className="h-3 w-3" /> {e.attendee_count}{e.max_attendees ? `/${e.max_attendees}` : ""} {t("events.going")}
                      </p>
                    </div>
                    <button
                      onClick={() => navigate(`/checkin/${e.id}`)}
                      className="h-9 px-3 rounded-xl bg-primary text-primary-foreground text-[11px] font-bold flex items-center gap-1.5 hover:bg-primary/90"
                    >
                      <ScanLine className="h-3.5 w-3.5" /> {t("assistant.scan")}
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default AssistantCheckInPage;
