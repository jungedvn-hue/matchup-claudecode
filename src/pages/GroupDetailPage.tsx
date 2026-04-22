import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Users, MapPin, Calendar, Crown, MessageCircle, Settings, UserPlus, Clock, Ticket } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import SkillBadge from "@/components/SkillBadge";
import GroupRating, { StarDisplay } from "@/components/GroupRating";
import BuyTicketDialog from "@/components/BuyTicketDialog";
import { groups } from "@/data/groups";
import { groupEvents, GroupEvent } from "@/data/events";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";

const recentMembers = [
  { name: "Alex T.", avatar: "🧑‍🦱", rating: 4.2 },
  { name: "Maria L.", avatar: "👩", rating: 3.8 },
  { name: "John K.", avatar: "👨‍🦰", rating: 4.5 },
  { name: "Sarah W.", avatar: "👩‍🦳", rating: 3.5 },
  { name: "David P.", avatar: "🧔", rating: 4.0 },
];

const GroupDetailPage = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const group = groups.find((g) => g.id === groupId);
  const events = groupEvents.filter((e) => e.groupId === groupId);
  const [selectedEvent, setSelectedEvent] = useState<GroupEvent | null>(null);
  const [ticketedEventIds, setTicketedEventIds] = useState<Set<string>>(new Set());

  const formatPrice = (price: number) => {
    if (price === 0) return t("common.free");
    return price.toLocaleString("vi-VN") + "đ";
  };

  const handleTicketSubmit = (eventId: string) => {
    setTicketedEventIds((prev) => new Set(prev).add(eventId));
    toast({
      title: t("group.ticketSent"),
      description: t("group.ticketSentDesc"),
    });
  };

  if (!group) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">{t("group.notFound")}</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/")}>
            {t("group.goHome")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24 min-h-screen">
      <BuyTicketDialog
        event={selectedEvent}
        open={!!selectedEvent}
        onOpenChange={(open) => !open && setSelectedEvent(null)}
        onSubmit={handleTicketSubmit}
      />

      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-display font-bold text-foreground truncate">{group.name}</h1>
            <p className="text-[10px] text-muted-foreground">{group.location}</p>
          </div>
          <button className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="px-4 space-y-4 pt-4">
        {/* Hero Card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="overflow-hidden shadow-card">
            <div className="h-2 bg-gradient-to-r from-primary to-accent" />
            <div className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-3xl">{group.emoji}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-display font-bold text-card-foreground">{group.name}</h2>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-primary/10 text-primary">{group.role}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <SkillBadge level={group.skill} />
                    <div className="flex items-center gap-1">
                      <StarDisplay rating={group.avgRating} />
                      <span className="text-[10px] text-muted-foreground">({group.totalReviews})</span>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{group.description}</p>
              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {group.members} {t("common.members")}</span>
                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {group.courtName}</span>
              </div>
              {group.activePlayers > 0 && (
                <div className="flex items-center gap-1.5 mt-2">
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-xs text-primary font-medium">{group.activePlayers} {t("common.playingNow")}</span>
                </div>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: Calendar, label: t("group.createEvent"), color: "text-primary" },
              { icon: UserPlus, label: t("group.inviteFriend"), color: "text-primary" },
              { icon: MessageCircle, label: t("group.groupChat"), color: "text-primary" },
            ].map((action, i) => (
              <Card key={i} className="p-3 text-center shadow-card cursor-pointer hover:shadow-elevated transition-all">
                <action.icon className={`h-5 w-5 mx-auto mb-1 ${action.color}`} />
                <p className="text-[10px] font-medium text-foreground">{action.label}</p>
              </Card>
            ))}
          </div>
        </motion.div>

        {/* Upcoming Events */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-display font-semibold text-foreground">{t("group.upcomingEvents")}</h3>
            <span className="text-[10px] text-primary font-medium cursor-pointer">{t("common.seeAll")}</span>
          </div>
          <div className="space-y-2">
            {events.map((event) => {
              const spotsLeft = event.maxSpots - event.bookedSpots;
              const hasTicket = ticketedEventIds.has(event.id);
              return (
                <Card key={event.id} className="p-3 shadow-card hover:shadow-elevated transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Calendar className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-card-foreground">{event.title}</p>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" /> {event.date}, {event.time}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-[10px] font-semibold ${event.price === 0 ? "text-primary" : "text-foreground"}`}>
                        {formatPrice(event.price)}
                      </span>
                      <p className={`text-[9px] ${spotsLeft <= 3 ? "text-destructive" : "text-muted-foreground"}`}>
                        {spotsLeft} {t("group.spotsLeft")}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(event.bookedSpots / event.maxSpots) * 100}%` }} />
                  </div>
                  {group.role === "Player" && (
                    <div className="mt-2 flex justify-end">
                      {hasTicket ? (
                        <span className="text-[10px] px-2.5 py-1 rounded-full bg-accent/10 text-accent font-semibold flex items-center gap-1">
                          {t("group.waitingApproval")}
                        </span>
                      ) : (
                        <Button size="sm" className="h-7 px-3 text-[10px] rounded-full font-semibold gap-1" onClick={() => setSelectedEvent(event)} disabled={spotsLeft === 0}>
                          <Ticket className="h-3 w-3" /> {t("group.buyTicket")}
                        </Button>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </motion.div>

        {/* Ratings */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
          <GroupRating groupName={group.name} avgRating={group.avgRating} totalReviews={group.totalReviews} reviews={group.reviews} canRate={group.role === "Player" || group.role === "Host"} />
        </motion.div>

        {/* Members */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-display font-semibold text-foreground">{t("group.members")} ({group.members})</h3>
            <span className="text-[10px] text-primary font-medium cursor-pointer">{t("common.seeAll")}</span>
          </div>
          <Card className="p-3 shadow-card">
            <div className="space-y-3">
              {recentMembers.map((member, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center text-lg">{member.avatar}</div>
                    <div>
                      <p className="text-xs font-semibold text-card-foreground">{member.name}</p>
                      <p className="text-[10px] text-muted-foreground">⭐ {member.rating}</p>
                    </div>
                  </div>
                  {i === 0 && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold flex items-center gap-0.5">
                      <Crown className="h-2.5 w-2.5" /> Host
                    </span>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Join / Leave */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          {group.role === "Player" ? (
            <Button variant="outline" className="w-full rounded-xl text-destructive border-destructive/30 hover:bg-destructive/10">
              {t("group.leaveGroup")}
            </Button>
          ) : (
            <Button className="w-full rounded-xl gap-2">
              <Crown className="h-4 w-4" /> {t("group.manageGroup")}
            </Button>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default GroupDetailPage;
