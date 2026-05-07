import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, ScanLine, CheckCircle2, Check, MapPin, Clock, Users, Calendar
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { groupEvents } from "@/data/events";
import { groups } from "@/data/groups";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";

// Demo: players to check in at assigned courts
const courtPlayers: Record<string, { id: string; name: string; avatar: string; ticketCode: string }[]> = {
  "Sân 1": [
    { id: "cp-1", name: "David P.", avatar: "🧔", ticketCode: "TICKET-tk-3" },
    { id: "cp-2", name: "Lisa M.", avatar: "👩‍🦰", ticketCode: "TICKET-tk-4" },
  ],
  "Sân 2": [
    { id: "cp-3", name: "Maria G.", avatar: "👩", ticketCode: "TICKET-tk-6" },
    { id: "cp-4", name: "Minh N.", avatar: "🧑", ticketCode: "TICKET-tk-1" },
  ],
  "Sân 3": [
    { id: "cp-5", name: "Tom H.", avatar: "🧑", ticketCode: "TICKET-tk-5" },
  ],
  "Sân 4": [],
};

const AssistantCheckInPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const groupId = searchParams.get("group") || "sunset-smashers";
  const courts = searchParams.get("courts")?.split(",") || ["Sân 1"];

  const group = groups.find((g) => g.id === groupId);
  const groupEventsList = groupEvents.filter((e) => e.groupId === groupId);
  const [checkedInIds, setCheckedInIds] = useState<Set<string>>(new Set());
  const [scanning, setScanning] = useState(false);
  const [activeCourt, setActiveCourt] = useState(courts[0]);

  const players = courtPlayers[activeCourt] || [];
  const totalPlayers = courts.flatMap((c) => courtPlayers[c] || []);
  const totalCheckedIn = totalPlayers.filter((p) => checkedInIds.has(p.id)).length;

  const handleScan = () => {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      const unchecked = players.find((p) => !checkedInIds.has(p.id));
      if (unchecked) {
        setCheckedInIds((prev) => new Set(prev).add(unchecked.id));
        toast({ title: t("assistant.toast.checkInSuccess"), description: `${unchecked.name} — ${activeCourt}` });
      } else {
        toast({ title: t("assistant.toast.allCheckedIn"), description: t("assistant.toast.allCheckedInDesc", { court: activeCourt }) });
      }
    }, 1500);
  };

  const handleManualCheckIn = (playerId: string, playerName: string) => {
    setCheckedInIds((prev) => new Set(prev).add(playerId));
    toast({ title: t("assistant.toast.checkInSuccess"), description: `${playerName} — ${activeCourt}` });
  };

  return (
    <div className="pb-20 min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center">
            <ArrowLeft className="h-4 w-4 text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-display font-bold text-foreground">{t("assistant.title")}</h1>
            <p className="text-[10px] text-muted-foreground">{group?.name} · {group?.courtName}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-primary">{totalCheckedIn}/{totalPlayers.length}</p>
            <p className="text-[9px] text-muted-foreground">{t("assistant.checkedIn")}</p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Group info */}
        <Card className="p-3 bg-primary/5 border-primary/20">
          <div className="flex items-center gap-2 text-xs text-foreground">
            <span className="text-lg">{group?.emoji}</span>
            <span className="font-medium">{group?.name}</span>
            <Badge variant="outline" className="text-[9px] ml-auto">{t("assistant.fixedAssistant")}</Badge>
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{group?.location}</span>
            <span className="flex items-center gap-1"><Users className="h-3 w-3" />{group?.members} {t("assistant.membersSuffix")}</span>
          </div>
        </Card>

        {/* Today's events */}
        {groupEventsList.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-primary" /> {t("assistant.eventToday")}
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {groupEventsList.slice(0, 3).map((evt) => (
                <div key={evt.id} className="shrink-0 px-3 py-2 rounded-xl bg-secondary/50 border border-border">
                  <p className="text-[10px] font-medium text-card-foreground">{evt.title}</p>
                  <p className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                    <Clock className="h-2.5 w-2.5" /> {evt.time} · {evt.bookedSpots}/{evt.maxSpots}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Court tabs */}
        <div>
          <p className="text-xs font-semibold text-foreground mb-2">{t("assistant.assignedCourts")}</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {courts.map((court) => {
              const cp = courtPlayers[court] || [];
              const checkedCount = cp.filter((p) => checkedInIds.has(p.id)).length;
              return (
                <button
                  key={court}
                  onClick={() => setActiveCourt(court)}
                  className={`shrink-0 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                    activeCourt === court
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-muted-foreground border-border"
                  }`}
                >
                  {court}
                  <span className="ml-1.5 text-[10px] opacity-70">{checkedCount}/{cp.length}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* QR Scanner */}
        <div className="relative aspect-[4/3] max-h-52 mx-auto bg-muted rounded-xl overflow-hidden flex items-center justify-center">
          <div className="absolute inset-4 border-2 border-dashed border-primary/40 rounded-lg" />
          {scanning && (
            <motion.div
              className="absolute left-4 right-4 h-0.5 bg-primary rounded-full"
              animate={{ top: ["15%", "85%", "15%"] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            />
          )}
          <div className="text-center z-10">
            <ScanLine className={`h-10 w-10 mx-auto mb-2 ${scanning ? "text-primary animate-pulse" : "text-muted-foreground"}`} />
            <p className="text-xs text-muted-foreground">
              {scanning ? t("assistant.scanning") : t("assistant.scanHint")}
            </p>
          </div>
        </div>

        <Button className="w-full rounded-xl gap-2" onClick={handleScan} disabled={scanning}>
          <ScanLine className="h-4 w-4" />
          {scanning ? t("assistant.scanning") : t("assistant.scanQR")}
        </Button>

        {/* Player list for active court */}
        <div>
          <p className="text-xs font-semibold text-foreground mb-2">
            {t("assistant.list", { court: activeCourt, checked: players.filter((p) => checkedInIds.has(p.id)).length, total: players.length })}
          </p>
          {players.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">{t("assistant.noPlayers")}</p>
          ) : (
            <div className="space-y-2">
              {players.map((player) => {
                const done = checkedInIds.has(player.id);
                return (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-secondary/50"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-sm">
                        {player.avatar}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-card-foreground">{player.name}</p>
                        <p className="text-[9px] text-muted-foreground font-mono">{player.ticketCode}</p>
                      </div>
                    </div>
                    {done ? (
                      <Badge variant="outline" className="text-[10px] gap-1 bg-primary/10 text-primary border-primary/20">
                        <CheckCircle2 className="h-3 w-3" /> {t("assistant.checkedInBadge")}
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[10px] rounded-lg gap-1"
                        onClick={() => handleManualCheckIn(player.id, player.name)}
                      >
                        <Check className="h-3 w-3" /> Check-in
                      </Button>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssistantCheckInPage;
