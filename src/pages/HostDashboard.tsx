import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Users, Calendar, DollarSign, Bell, ChevronRight,
  Clock, TrendingUp, ListChecks, Megaphone, QrCode, Ticket,
  Check, X, MessageSquare, ScanLine, CheckCircle2,
  UserPlus, Shield, MapPin
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { groupEvents } from "@/data/events";
import { groups as groupsData, GroupAssistant } from "@/data/groups";
import { toast } from "@/hooks/use-toast";
import AssignAssistantDialog from "@/components/AssignAssistantDialog";
import { useLanguage } from "@/i18n/LanguageContext";

// Demo data: players who can be checked in (approved tickets)
const checkInList = [
  { id: "tk-3", name: "David P.", avatar: "🧔", event: "Open Play Session", ticketCode: "TICKET-my-1-evt-1", checkedIn: false },
  { id: "tk-4", name: "Lisa M.", avatar: "👩‍🦰", event: "Open Play Session", ticketCode: "TICKET-my-4-evt-1", checkedIn: false },
  { id: "tk-6", name: "Maria G.", avatar: "👩", event: "Open Play Session", ticketCode: "TICKET-my-1-evt-1", checkedIn: false },
];

const HostDashboard = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [checkedInIds, setCheckedInIds] = useState<Set<string>>(new Set());
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignGroupId, setAssignGroupId] = useState<string | null>(null);

  const stats = [
    { label: t("dashboard.activePlayers"), value: "127", change: "+12", icon: Users, color: "text-primary" },
    { label: t("dashboard.eventsThisWeek"), value: "5", change: "+2", icon: Calendar, color: "text-sport-blue" },
    { label: t("dashboard.revenue"), value: "$2,340", change: "+18%", icon: DollarSign, color: "text-court" },
    { label: t("dashboard.avgAttendance"), value: "89%", change: "+5%", icon: TrendingUp, color: "text-sport-orange" },
  ];

  const quickActions = [
    { label: t("dashboard.createEvent"), icon: Plus, desc: t("dashboard.createEventDesc"), action: "create" },
    { label: t("dashboard.startTournament"), icon: ListChecks, desc: t("dashboard.startTournamentDesc"), action: "tournament" },
    { label: t("dashboard.announcement"), icon: Megaphone, desc: t("dashboard.announcementDesc"), action: "announce" },
    { label: t("dashboard.checkIn"), icon: QrCode, desc: t("dashboard.checkInDesc"), action: "checkin" },
  ];

  // Group-level assistants state
  const [groupAssistants, setGroupAssistants] = useState<Record<string, GroupAssistant[]>>(() => {
    const init: Record<string, GroupAssistant[]> = {};
    groupsData.filter((g) => g.role === "Host").forEach((g) => {
      init[g.id] = [...g.assistants];
    });
    return init;
  });

  const myGroups = groupsData.filter((g) => g.role === "Host");

  // Ticket approval state
  const allPendingTickets = groupEvents.flatMap((event) =>
    event.ticketRequests
      .filter((t) => t.status === "pending")
      .map((t) => ({ ...t, eventTitle: event.title, eventDate: event.date, eventTime: event.time, eventId: event.id }))
  );
  const [ticketStatuses, setTicketStatuses] = useState<Record<string, "approved" | "rejected">>({});
  const pendingTickets = allPendingTickets.filter((t) => !ticketStatuses[t.id]);

  const handleTicketAction = (ticketId: string, action: "approved" | "rejected", playerName: string) => {
    setTicketStatuses((prev) => ({ ...prev, [ticketId]: action }));
    toast({
      title: action === "approved" ? `${t("dashboard.approved")} ${playerName}` : `${t("dashboard.rejected")} ${playerName}`,
      description: action === "approved" ? t("dashboard.approvedDesc") : t("dashboard.rejectedDesc"),
    });
  };

  const handleScanSimulate = () => {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      const unchecked = checkInList.find((p) => !checkedInIds.has(p.id));
      if (unchecked) {
        setCheckedInIds((prev) => new Set(prev).add(unchecked.id));
        toast({ title: t("dashboard.checkInSuccess"), description: `${unchecked.name} — ${unchecked.event}` });
      } else {
        toast({ title: t("dashboard.allCheckedIn"), description: t("dashboard.allCheckedInDesc") });
      }
    }, 1500);
  };

  const handleManualCheckIn = (playerId: string, playerName: string) => {
    setCheckedInIds((prev) => new Set(prev).add(playerId));
    toast({ title: t("dashboard.checkInSuccess"), description: `${playerName}` });
  };

  const handleQuickAction = (action: string) => {
    if (action === "create") navigate("/create-event");
    else if (action === "tournament") navigate("/create-tournament");
    else if (action === "checkin") setScannerOpen(true);
  };

  const assignGroup = assignGroupId ? myGroups.find((g) => g.id === assignGroupId) : null;

  return (
    <div className="pb-20 min-h-screen">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-display font-bold text-foreground">{t("dashboard.title")}</h1>
            <p className="text-xs text-muted-foreground">{t("dashboard.managing")} {myGroups.length} {t("dashboard.groups")} · 127 {t("dashboard.players")}</p>
          </div>
          <button className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground relative">
            <Bell className="h-4 w-4" />
            {pendingTickets.length > 0 && (
              <div className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] px-1 rounded-full bg-destructive text-[9px] font-bold flex items-center justify-center text-destructive-foreground">
                {pendingTickets.length}
              </div>
            )}
          </button>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-5">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          {stats.map((stat, i) => (
            <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.06 }}>
              <Card className="p-3 shadow-card">
                <div className="flex items-center justify-between mb-2">
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">{stat.change}</span>
                </div>
                <p className="text-xl font-display font-bold text-card-foreground">{stat.value}</p>
                <p className="text-[11px] text-muted-foreground">{stat.label}</p>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Pending Ticket Requests */}
        {pendingTickets.length > 0 && (
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <div className="flex items-center justify-between mb-2.5">
              <h2 className="text-sm font-display font-semibold text-foreground flex items-center gap-1.5">
                <Ticket className="h-4 w-4 text-accent" /> {t("dashboard.ticketRequests")}
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive font-bold">
                  {pendingTickets.length}
                </span>
              </h2>
            </div>
            <div className="space-y-2">
              <AnimatePresence>
                {pendingTickets.map((ticket) => (
                  <motion.div key={ticket.id} initial={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0, marginBottom: 0 }} transition={{ duration: 0.3 }}>
                    <Card className="p-3 shadow-card border-accent/20">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-lg shrink-0">
                          {ticket.playerAvatar}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-card-foreground">{ticket.playerName}</p>
                            <span className="text-[9px] text-muted-foreground">{ticket.requestedAt}</span>
                          </div>
                          <p className="text-[10px] text-primary font-medium mt-0.5">
                            🎫 {ticket.eventTitle} · {ticket.eventDate}, {ticket.eventTime}
                          </p>
                          {ticket.message && (
                            <div className="flex items-start gap-1 mt-1.5 p-2 rounded-lg bg-secondary">
                              <MessageSquare className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
                              <p className="text-[10px] text-muted-foreground leading-relaxed">{ticket.message}</p>
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <Button size="sm" className="h-7 flex-1 text-[10px] rounded-lg gap-1" onClick={() => handleTicketAction(ticket.id, "approved", ticket.playerName)}>
                              <Check className="h-3 w-3" /> {t("dashboard.approve")}
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 flex-1 text-[10px] rounded-lg gap-1 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => handleTicketAction(ticket.id, "rejected", ticket.playerName)}>
                              <X className="h-3 w-3" /> {t("dashboard.reject")}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.section>
        )}

        {/* Quick Actions */}
        <section>
          <h2 className="text-sm font-display font-semibold text-foreground mb-2.5">{t("dashboard.quickActions")}</h2>
          <div className="grid grid-cols-2 gap-2">
            {quickActions.map((action, i) => (
              <button key={i} onClick={() => handleQuickAction(action.action)} className="flex items-center gap-2.5 p-3 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-card transition-all text-left">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <action.icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-card-foreground">{action.label}</p>
                  <p className="text-[10px] text-muted-foreground">{action.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* My Groups with Assistants */}
        <section>
          <h2 className="text-sm font-display font-semibold text-foreground mb-2.5">{t("dashboard.myGroups")}</h2>
          <div className="space-y-2">
            {myGroups.map((group) => {
              const assistants = groupAssistants[group.id] || [];
              const groupEventsList = groupEvents.filter((e) => e.groupId === group.id);
              const pendingCount = groupEventsList.reduce(
                (sum, e) => sum + e.ticketRequests.filter((t) => t.status === "pending" && !ticketStatuses[t.id]).length, 0
              );
              return (
                <Card key={group.id} className="p-3 shadow-card">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-lg">{group.emoji}</div>
                      <div>
                        <p className="text-sm font-semibold text-card-foreground">{group.name}</p>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-2.5 w-2.5" /> {group.courtName}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {pendingCount > 0 && (
                        <span className="h-5 min-w-[20px] px-1 rounded-full bg-sport-orange text-[10px] font-bold flex items-center justify-center text-primary-foreground">
                          {pendingCount}
                        </span>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>

                  {/* Group-level Assistants */}
                  <div className="mt-3 pt-2.5 border-t border-border">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                        <Shield className="h-3 w-3" /> {t("dashboard.groupAssistants")} ({assistants.length})
                      </p>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-[10px] gap-1 px-2"
                        onClick={() => {
                          setAssignGroupId(group.id);
                          setAssignDialogOpen(true);
                        }}
                      >
                        <UserPlus className="h-3 w-3" /> {t("dashboard.add")}
                      </Button>
                    </div>
                    {assistants.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {assistants.map((a) => (
                          <button
                            key={a.id}
                            onClick={() => navigate(`/assistant-checkin?group=${group.id}&courts=${a.assignedCourts.join(",")}`)}
                            className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-secondary/70 hover:bg-secondary transition-all"
                          >
                            <span className="text-sm">{a.avatar}</span>
                            <div className="text-left">
                              <p className="text-[10px] font-medium text-card-foreground">{a.name}</p>
                              <p className="text-[8px] text-muted-foreground flex items-center gap-0.5">
                                <MapPin className="h-2 w-2" />{a.assignedCourts.join(", ")}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-muted-foreground">{t("dashboard.noAssistants")}</p>
                    )}
                  </div>

                  {/* Events count */}
                  <div className="mt-2 pt-2 border-t border-border flex items-center justify-between">
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {groupEventsList.length} {t("dashboard.upcomingEvents")}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{group.members} {t("common.members")}</p>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Upcoming Events */}
        <section>
          <h2 className="text-sm font-display font-semibold text-foreground mb-2.5">{t("dashboard.upcomingEventsTitle")}</h2>
          <div className="space-y-2">
            {groupEvents.slice(0, 3).map((event) => (
              <Card key={event.id} className="p-3 shadow-card">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-card-foreground">{event.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" />{event.time}</span>
                      <span>{event.date}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-display font-bold text-card-foreground">{event.bookedSpots}/{event.maxSpots}</p>
                    {event.ticketRequests.filter((t) => t.status === "pending" && !ticketStatuses[t.id]).length > 0 && (
                      <p className="text-[10px] text-accent font-medium flex items-center gap-0.5 justify-end">
                        <Ticket className="h-2.5 w-2.5" />
                        {event.ticketRequests.filter((t) => t.status === "pending" && !ticketStatuses[t.id]).length} {t("dashboard.waitingApproval")}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-2 h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${(event.bookedSpots / event.maxSpots) * 100}%` }} />
                </div>
              </Card>
            ))}
          </div>
        </section>
      </div>

      {/* QR Scanner Dialog */}
      <Dialog open={scannerOpen} onOpenChange={setScannerOpen}>
        <DialogContent className="max-w-sm rounded-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <QrCode className="h-5 w-5 text-primary" /> {t("dashboard.checkInPlayer")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative aspect-square max-h-48 mx-auto bg-muted rounded-xl overflow-hidden flex items-center justify-center">
              <div className="absolute inset-4 border-2 border-dashed border-primary/40 rounded-lg" />
              {scanning && (
                <motion.div className="absolute left-4 right-4 h-0.5 bg-primary rounded-full" animate={{ top: ["15%", "85%", "15%"] }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} />
              )}
              <div className="text-center z-10">
                <ScanLine className={`h-10 w-10 mx-auto mb-2 ${scanning ? "text-primary animate-pulse" : "text-muted-foreground"}`} />
                <p className="text-xs text-muted-foreground">{scanning ? t("dashboard.scanning") : t("dashboard.scanQR")}</p>
              </div>
            </div>
            <Button className="w-full rounded-xl gap-2" onClick={handleScanSimulate} disabled={scanning}>
              <ScanLine className="h-4 w-4" />
              {scanning ? t("dashboard.scanning") : t("dashboard.simulateScan")}
            </Button>
            <div>
              <p className="text-xs font-semibold text-foreground mb-2">{t("dashboard.manualCheckIn")}:</p>
              <div className="space-y-2">
                {checkInList.map((player) => {
                  const done = checkedInIds.has(player.id);
                  return (
                    <div key={player.id} className="flex items-center justify-between p-2.5 rounded-xl bg-secondary/50">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-sm">{player.avatar}</div>
                        <div>
                          <p className="text-xs font-medium text-card-foreground">{player.name}</p>
                          <p className="text-[10px] text-muted-foreground">{player.event}</p>
                        </div>
                      </div>
                      {done ? (
                        <Badge variant="outline" className="text-[10px] gap-1 bg-primary/10 text-primary border-primary/20">
                          <CheckCircle2 className="h-3 w-3" /> {t("dashboard.checkedIn")}
                        </Badge>
                      ) : (
                        <Button size="sm" variant="outline" className="h-7 text-[10px] rounded-lg gap-1" onClick={() => handleManualCheckIn(player.id, player.name)}>
                          <Check className="h-3 w-3" /> {t("dashboard.checkIn")}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="text-center pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground">
                {t("dashboard.checkedIn")}: <span className="font-bold text-primary">{checkedInIds.size}</span> / {checkInList.length}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Assistant Dialog - Group level */}
      {assignGroup && (
        <AssignAssistantDialog
          open={assignDialogOpen}
          onOpenChange={setAssignDialogOpen}
          group={{
            ...assignGroup,
            assistants: groupAssistants[assignGroup.id] || [],
          }}
          onAssign={(assistant) => {
            setGroupAssistants((prev) => ({
              ...prev,
              [assignGroup.id]: [...(prev[assignGroup.id] || []), assistant],
            }));
          }}
        />
      )}
    </div>
  );
};

export default HostDashboard;
