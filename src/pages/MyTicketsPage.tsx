import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Ticket, Clock, CheckCircle2, XCircle, MapPin, Calendar, QrCode } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { groupEvents } from "@/data/events";
import QRCodeDisplay from "@/components/QRCodeDisplay";
import { useLanguage } from "@/i18n/LanguageContext";

const myTickets = [
  { ticketId: "my-1", event: groupEvents[0], status: "approved" as const, requestedAt: "2h ago", checkedIn: false },
  { ticketId: "my-2", event: groupEvents[1], status: "pending" as const, requestedAt: "30m ago", checkedIn: false },
  { ticketId: "my-3", event: groupEvents[3], status: "rejected" as const, requestedAt: "Yesterday", checkedIn: false },
];

const MyTicketsPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [qrTicket, setQrTicket] = useState<typeof myTickets[0] | null>(null);

  const statusConfig = {
    pending: { label: t("tickets.pending"), icon: Clock, color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
    approved: { label: t("tickets.approved"), icon: CheckCircle2, color: "bg-primary/10 text-primary border-primary/20" },
    rejected: { label: t("tickets.rejected"), icon: XCircle, color: "bg-destructive/10 text-destructive border-destructive/20" },
  };

  return (
    <div className="pb-20 min-h-screen">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center">
            <ArrowLeft className="h-4 w-4 text-foreground" />
          </button>
          <div>
            <h1 className="text-lg font-display font-bold text-foreground">{t("tickets.title")}</h1>
            <p className="text-xs text-muted-foreground">{myTickets.length} {t("tickets.tickets")}</p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-3">
        {myTickets.map((ticket, i) => {
          const cfg = statusConfig[ticket.status];
          const StatusIcon = cfg.icon;
          return (
            <motion.div
              key={ticket.ticketId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
            >
              <Card className="p-4 shadow-card space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-card-foreground">{ticket.event.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Host: {ticket.event.hostName}</p>
                  </div>
                  <Badge variant="outline" className={`text-[10px] gap-1 ${cfg.color}`}>
                    <StatusIcon className="h-3 w-3" />
                    {cfg.label}
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {ticket.event.date} · {ticket.event.time}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {ticket.event.location}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-border">
                  <span className="text-xs text-muted-foreground">{t("tickets.requestedAt")}: {ticket.requestedAt}</span>
                  <span className="text-sm font-bold text-card-foreground">
                    {ticket.event.price > 0
                      ? `${ticket.event.price.toLocaleString()}đ`
                      : t("common.free")}
                  </span>
                </div>

                {ticket.status === "approved" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full rounded-xl gap-2 text-xs border-primary/30 text-primary hover:bg-primary/5"
                    onClick={() => setQrTicket(ticket)}
                  >
                    <QrCode className="h-4 w-4" />
                    {t("tickets.showQR")}
                  </Button>
                )}
              </Card>
            </motion.div>
          );
        })}

        {myTickets.length === 0 && (
          <div className="text-center py-16 space-y-2">
            <Ticket className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t("tickets.noTickets")}</p>
          </div>
        )}
      </div>

      <Dialog open={!!qrTicket} onOpenChange={() => setQrTicket(null)}>
        <DialogContent className="max-w-xs rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-center text-base">{t("tickets.checkInTicket")}</DialogTitle>
          </DialogHeader>
          {qrTicket && (
            <div className="flex flex-col items-center gap-4 py-2">
              <QRCodeDisplay data={`TICKET-${qrTicket.ticketId}-${qrTicket.event.id}`} size={160} />
              <div className="text-center space-y-1">
                <p className="text-sm font-semibold text-card-foreground">{qrTicket.event.title}</p>
                <p className="text-xs text-muted-foreground">{qrTicket.event.date} · {qrTicket.event.time}</p>
                <p className="text-xs text-muted-foreground">{qrTicket.event.location}</p>
              </div>
              <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                <CheckCircle2 className="h-3 w-3 mr-1" /> {t("tickets.approvedReady")}
              </Badge>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyTicketsPage;
