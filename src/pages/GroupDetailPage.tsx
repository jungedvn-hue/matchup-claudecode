import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Users, MapPin, Lock, Crown, Check, Clock, Loader2, UserMinus, Calendar, Plus, ScanLine, Share2, Pencil, Shield, UserPlus, X, Megaphone, Pin, Trash2, Coffee, Pencil as PencilIcon, Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import SkillBadge from "@/components/SkillBadge";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { useGroup, useGroupMembership, useDeleteGroup } from "@/hooks/useGroups";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { useGroupEvents, useRSVP, type RSVPStatus } from "@/hooks/useGroupEvents";
import CreateEventDialog from "@/components/CreateEventDialog";
import ShareGroupDialog from "@/components/ShareGroupDialog";
import CreateGroupDialog from "@/components/CreateGroupDialog";
import AssignAssistantDialog from "@/components/AssignAssistantDialog";
import AnnouncementDialog from "@/components/AnnouncementDialog";
import DrinkGiftSheet from "@/components/DrinkGiftSheet";
import { useGroupAssistants, useAssistantActions } from "@/hooks/useAssistants";
import { useAnnouncements, useAnnouncementActions, type Announcement } from "@/hooks/useAnnouncements";
import { useDrinkMenu, type MenuItem } from "@/hooks/useDrinkMenu";
import { useGroupHostRatings, useHostRatingSummary } from "@/hooks/useHostRatings";
import HostRatingSheet from "@/components/HostRatingSheet";
import { toast } from "sonner";

const GroupDetailPage = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { group, members, myMembership, loading, refetch } = useGroup(groupId);
  const { join, leave, approve, removeMember } = useGroupMembership(groupId);
  const { events, refetch: refetchEvents } = useGroupEvents(groupId);
  const { rsvp, cancelRSVP } = useRSVP();
  const [acting, setActing] = useState(false);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [editGroupOpen, setEditGroupOpen] = useState(false);
  const [assignAssistantOpen, setAssignAssistantOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareEvent, setShareEvent] = useState<{ id: string; title: string } | null>(null);
  const { assistants, refetch: refetchAssistants } = useGroupAssistants(groupId);
  const { revoke: revokeAssistant } = useAssistantActions();
  const { items: announcements, refetch: refetchAnnouncements } = useAnnouncements(groupId);
  const { remove: removeAnnouncement, togglePin: toggleAnnPin } = useAnnouncementActions();
  const [annDialogOpen, setAnnDialogOpen] = useState(false);
  const [editingAnn, setEditingAnn] = useState<Announcement | undefined>(undefined);
  const { menu, items: menuItems, loading: menuLoading, upsertItem, deleteItem, uploadItemImage } = useDrinkMenu(groupId);
  const [drinkGiftOpen, setDrinkGiftOpen] = useState(false);
  const [giftTarget, setGiftTarget] = useState<{ id: string; name: string } | null>(null);
  const [menuEditItem, setMenuEditItem] = useState<MenuItem | Partial<MenuItem> | null>(null);
  const [editItemForm, setEditItemForm] = useState({ name: "", name_vi: "", emoji: "🧃", image_url: null as string | null, price_vnd: 0, available: true, sort_order: 0 });
  const [savingItem, setSavingItem] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const menuImageRef = useRef<HTMLInputElement>(null);
  const { deleteGroup } = useDeleteGroup();
  const { ratings: hostRatings, myRating: myHostRating, refetch: refetchHostRatings } = useGroupHostRatings(groupId);
  const { summary: hostSummary, refetch: refetchHostSummary } = useHostRatingSummary(group?.host_user_id);
  const [hostRatingOpen, setHostRatingOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

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

  const handleRSVP = async (eventId: string, current: RSVPStatus | null | undefined, next: RSVPStatus) => {
    const res = current === next ? await cancelRSVP(eventId) : await rsvp(eventId, next);
    if (res.error) toast.error(res.error);
    refetchEvents();
  };

  const formatEventDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
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
          {isHost && (
            <button onClick={() => setEditGroupOpen(true)} aria-label={t("groups.editGroup")} className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground">
              <Pencil className="h-4 w-4" />
            </button>
          )}
          <button onClick={() => { setShareEvent(null); setShareOpen(true); }} aria-label={t("share.title")} className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground">
            <Share2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <ShareGroupDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        group={{ id: group.id, name: group.name, cover_emoji: group.cover_emoji }}
        event={shareEvent ?? undefined}
      />

      <CreateGroupDialog
        open={editGroupOpen}
        onOpenChange={setEditGroupOpen}
        editGroup={group}
        onUpdated={refetch}
      />

      <AssignAssistantDialog
        open={assignAssistantOpen}
        onOpenChange={setAssignAssistantOpen}
        groupId={group.id}
        onAssigned={refetchAssistants}
      />

      <AnnouncementDialog
        open={annDialogOpen}
        onOpenChange={v => { setAnnDialogOpen(v); if (!v) setEditingAnn(undefined); }}
        groupId={group.id}
        editing={editingAnn}
        onSaved={refetchAnnouncements}
      />

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
                  {(group.city || group.location) && (
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <MapPin className="h-3 w-3" /> {[group.city, group.location].filter(Boolean).join(" · ")}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {group.description && (
              <p className="text-sm text-muted-foreground">{group.description}</p>
            )}

            {group.map_url && (
              <a
                href={group.map_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2.5 rounded-xl bg-secondary/60 hover:bg-secondary transition-colors text-sm font-medium text-foreground"
              >
                <MapPin className="h-4 w-4 text-primary" />
                <span className="flex-1">{t("groups.openInMaps")}</span>
                <span className="text-xs text-muted-foreground">↗</span>
              </a>
            )}

            {/* Host rating row */}
            <div className="flex items-center gap-2 pt-1">
              <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <span className="text-xs font-medium text-foreground">{t("groups.host")}</span>
              {hostSummary.rating_count > 0 ? (
                <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                  <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                  <span className="font-semibold text-foreground">{hostSummary.avg_stars.toFixed(1)}</span>
                  <span>({hostSummary.rating_count})</span>
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">{t("hostRating.noneYet")}</span>
              )}
              {isMember && !isHost && (
                <button
                  onClick={() => setHostRatingOpen(true)}
                  className="ml-auto text-[11px] font-semibold text-primary hover:underline"
                >
                  {myHostRating ? t("hostRating.edit") : t("hostRating.rate")}
                </button>
              )}
            </div>

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

        {/* Announcements */}
        {(isHost || announcements.length > 0) && (
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-display font-bold text-foreground flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-primary" />
                {t("announcements.title")} {announcements.length > 0 && `(${announcements.length})`}
              </h2>
              {isHost && (
                <button onClick={() => { setEditingAnn(undefined); setAnnDialogOpen(true); }}
                  className="flex items-center gap-1 h-7 px-2.5 rounded-lg bg-primary/10 text-primary text-[11px] font-semibold hover:bg-primary/20">
                  <Plus className="h-3 w-3" /> {t("announcements.new")}
                </button>
              )}
            </div>
            {announcements.length === 0 ? (
              <Card className="p-4 shadow-card text-center">
                <p className="text-xs text-muted-foreground">{t("announcements.emptyHost")}</p>
              </Card>
            ) : (
              <div className="space-y-2">
                {announcements.map(a => (
                  <Card key={a.id} className={`p-3.5 shadow-card ${a.pinned ? "bg-gradient-to-br from-amber-500/8 via-card to-card border-amber-500/20" : ""}`}>
                    <div className="flex items-start gap-2.5">
                      <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${a.pinned ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" : "bg-primary/10 text-primary"}`}>
                        {a.pinned ? <Pin className="h-3.5 w-3.5" /> : <Megaphone className="h-3.5 w-3.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        {a.title && <p className="text-sm font-bold text-foreground mb-0.5">{a.title}</p>}
                        <p className="text-[13px] text-foreground/90 whitespace-pre-line leading-relaxed">{a.body}</p>
                        <p className="text-[10px] text-muted-foreground mt-1.5 tabular-nums">
                          {a.author_name ?? t("common.unknown")} · {new Date(a.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      {isHost && (
                        <div className="flex flex-col gap-1 shrink-0">
                          <button
                            onClick={async () => {
                              const { error } = await toggleAnnPin(a.id, !a.pinned);
                              if (error) toast.error(error); else refetchAnnouncements();
                            }}
                            className={`h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground ${a.pinned ? "text-amber-600 dark:text-amber-400" : ""}`}
                            aria-label="pin"
                          >
                            <Pin className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => { setEditingAnn(a); setAnnDialogOpen(true); }}
                            className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground"
                            aria-label="edit"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            onClick={async () => {
                              if (!confirm(t("announcements.confirmDelete"))) return;
                              const { error } = await removeAnnouncement(a.id);
                              if (error) toast.error(error);
                              else { toast.success(t("announcements.deleted")); refetchAnnouncements(); }
                            }}
                            className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive"
                            aria-label="delete"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Events */}
        {(isMember || events.length > 0) && (
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-display font-bold text-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                {t("events.upcoming")} {events.length > 0 && `(${events.length})`}
              </h2>
              {isHost && (
                <button onClick={() => setEventDialogOpen(true)}
                  className="flex items-center gap-1 h-7 px-2.5 rounded-lg bg-primary/10 text-primary text-[11px] font-semibold hover:bg-primary/20">
                  <Plus className="h-3 w-3" /> {t("events.newEvent")}
                </button>
              )}
            </div>
            {events.length === 0 ? (
              <Card className="p-6 text-center shadow-card">
                <Calendar className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-xs text-muted-foreground">{t("events.noUpcoming")}</p>
              </Card>
            ) : (
              <div className="space-y-2">
                {events.map(ev => {
                  const myRsvp = ev.my_rsvp;
                  const full = ev.max_attendees != null && ev.attendee_count >= ev.max_attendees && myRsvp !== "going";
                  return (
                    <Card key={ev.id} className="p-3 shadow-card bg-gradient-to-br from-primary/5 via-card to-card">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-foreground truncate">{ev.title}</p>
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Clock className="h-3 w-3" /> {formatEventDate(ev.event_date)}
                          </p>
                          {ev.location && (
                            <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                              <MapPin className="h-3 w-3" /> {ev.location}
                            </p>
                          )}
                          <p className="text-[10px] text-muted-foreground mt-1 tabular-nums">
                            {ev.attendee_count}{ev.max_attendees ? `/${ev.max_attendees}` : ""} {t("events.going")}
                          </p>
                        </div>
                      </div>
                      {ev.description && (
                        <p className="text-[11px] text-muted-foreground mb-2">{ev.description}</p>
                      )}
                      <div className="flex gap-1.5 mb-1.5">
                        <button
                          onClick={() => { setShareEvent({ id: ev.id, title: ev.title }); setShareOpen(true); }}
                          className="flex-1 h-7 rounded-lg text-[11px] font-semibold bg-secondary/60 text-foreground hover:bg-secondary transition-all flex items-center justify-center gap-1"
                        >
                          <Share2 className="h-3 w-3" /> {t("share.shareEvent")}
                        </button>
                        {isHost && (
                          <button
                            onClick={() => navigate(`/checkin/${ev.id}`)}
                            className="flex-1 h-7 rounded-lg text-[11px] font-semibold bg-primary/10 text-primary hover:bg-primary/15 transition-all flex items-center justify-center gap-1"
                          >
                            <ScanLine className="h-3 w-3" /> {t("checkin.openScanner")}
                          </button>
                        )}
                      </div>
                      {isMember && (
                        <div className="flex gap-1.5">
                          {(["going", "maybe", "not_going"] as RSVPStatus[]).map(s => (
                            <button key={s}
                              disabled={s === "going" && full}
                              onClick={() => handleRSVP(ev.id, myRsvp, s)}
                              className={`flex-1 h-7 rounded-lg text-[11px] font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                                myRsvp === s
                                  ? s === "going" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-500/30"
                                  : s === "maybe" ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 ring-1 ring-amber-500/30"
                                  : "bg-muted text-muted-foreground ring-1 ring-border"
                                  : "bg-secondary/60 text-muted-foreground hover:text-foreground"
                              }`}>
                              {t(`events.rsvp.${s}`)}
                            </button>
                          ))}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </section>
        )}

        <CreateEventDialog open={eventDialogOpen} onOpenChange={setEventDialogOpen} groupId={group.id} onCreated={refetchEvents} />

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
            {activeMembers.map((m, i) => {
              const isMe = m.user_id === user?.id;
              return (
                <div key={m.id} className={`flex items-center gap-3 px-3.5 py-2.5 ${i < activeMembers.length - 1 ? "border-b border-border" : ""}`}>
                  <button
                    disabled={isMe}
                    onClick={() => !isMe && navigate(`/user/${m.user_id}`)}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left disabled:cursor-default"
                  >
                    <Avatar className="h-8 w-8 shrink-0">
                      {m.avatar_url && <AvatarImage src={m.avatar_url} />}
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">{(m.display_name || "?")[0].toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <p className="flex-1 text-sm font-medium text-foreground truncate">{m.display_name || t("common.unknown")}</p>
                  </button>
                  {m.role === "host" && (
                    <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  )}
                  {isMember && !isMe && menuItems.filter(i => i.available).length > 0 && (
                    <button
                      onClick={() => { setGiftTarget({ id: m.user_id, name: m.display_name || t("common.unknown") }); setDrinkGiftOpen(true); }}
                      className="h-6 px-2 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 text-[10px] font-semibold hover:bg-orange-500/20 flex items-center gap-1"
                    >
                      <Coffee className="h-3 w-3" />
                    </button>
                  )}
                  {isHost && !isMe && (
                    <button onClick={() => handleRemove(m.user_id)} className="text-[10px] text-muted-foreground hover:text-destructive px-1.5 py-0.5 rounded transition-colors">
                      {t("groups.remove")}
                    </button>
                  )}
                </div>
              );
            })}
          </Card>
        </section>

        {/* Assistants — host-only management + visible to all members */}
        {(isHost || assistants.length > 0) && (
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-display font-bold text-foreground flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                {t("assistant.assistants")} ({assistants.length})
              </h2>
              {isHost && (
                <button onClick={() => setAssignAssistantOpen(true)} className="text-xs text-primary font-medium flex items-center gap-1">
                  <UserPlus className="h-3.5 w-3.5" /> {t("assistant.assign.add")}
                </button>
              )}
            </div>
            {assistants.length === 0 ? (
              <Card className="p-4 shadow-card text-center">
                <p className="text-xs text-muted-foreground">{t("assistant.emptyHost")}</p>
              </Card>
            ) : (
              <Card className="shadow-card overflow-hidden">
                {assistants.map((a, i) => (
                  <div key={a.id} className={`flex items-center gap-3 px-3.5 py-2.5 ${i < assistants.length - 1 ? "border-b border-border" : ""}`}>
                    <Avatar className="h-8 w-8 shrink-0">
                      {a.avatar_url && <AvatarImage src={a.avatar_url} />}
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">{(a.display_name || "?")[0].toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{a.display_name || t("common.unknown")}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {a.assigned_courts.slice(0, 3).map(c => (
                          <span key={c} className="text-[9px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{c}</span>
                        ))}
                        {a.permissions.length > 0 && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">{a.permissions.length} {t("assistant.perms")}</span>
                        )}
                      </div>
                    </div>
                    {(a.user_id === user?.id || a.permissions.includes("check_in")) && (
                      <button onClick={() => navigate(`/assistant-checkin/${group.id}`)}
                        className="h-7 px-2.5 rounded-lg bg-primary/10 text-primary text-[10px] font-semibold flex items-center gap-1 hover:bg-primary/15">
                        <ScanLine className="h-3 w-3" /> {t("assistant.open")}
                      </button>
                    )}
                    {isHost && (
                      <button
                        onClick={async () => {
                          if (!confirm(t("assistant.confirmRevoke"))) return;
                          const { error } = await revokeAssistant(a.id);
                          if (error) toast.error(error);
                          else { toast.success(t("assistant.revoked")); refetchAssistants(); }
                        }}
                        className="text-[10px] text-muted-foreground hover:text-destructive px-1.5 py-0.5 rounded transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </Card>
            )}
          </section>
        )}

        {/* Drinks Menu */}
        {(isHost || (menuItems.filter(i => i.available).length > 0)) && (
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-display font-bold text-foreground flex items-center gap-2">
                <Coffee className="h-4 w-4 text-orange-500" />
                {t("drinks.menuTitle")} {menuItems.length > 0 && `(${menuItems.length})`}
              </h2>
              {isHost && (
                <button
                  onClick={() => { setEditItemForm({ name: "", name_vi: "", emoji: "🧃", price_vnd: 0, available: true, sort_order: menuItems.length }); setMenuEditItem({}); }}
                  className="text-xs text-primary font-medium flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> {t("drinks.addItem")}
                </button>
              )}
            </div>

            {/* Add/Edit form (host only) */}
            {isHost && menuEditItem !== null && (
              <Card className="p-3 shadow-card space-y-2 border-primary/20">
                {/* Image upload */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => menuImageRef.current?.click()}
                    disabled={uploadingImage}
                    className="h-16 w-16 rounded-xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-secondary shrink-0 hover:border-primary/50 transition-colors"
                  >
                    {uploadingImage ? (
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    ) : editItemForm.image_url ? (
                      <img src={editItemForm.image_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-2xl">🧃</span>
                    )}
                  </button>
                  <div className="flex-1 space-y-2">
                    <input className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder={t("drinks.itemName")} value={editItemForm.name} onChange={e => setEditItemForm(f => ({ ...f, name: e.target.value }))} />
                    <input type="number" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder={t("drinks.itemPrice")} value={editItemForm.price_vnd || ""} onChange={e => setEditItemForm(f => ({ ...f, price_vnd: parseInt(e.target.value) || 0 }))} />
                  </div>
                  <input ref={menuImageRef} type="file" accept="image/*" className="hidden" onChange={async e => {
                    const file = e.target.files?.[0];
                    if (!file || !groupId) return;
                    setUploadingImage(true);
                    const { url, error } = await uploadItemImage(groupId, file);
                    setUploadingImage(false);
                    if (error) toast.error(error);
                    else setEditItemForm(f => ({ ...f, image_url: url }));
                    e.target.value = "";
                  }} />
                </div>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input type="checkbox" checked={editItemForm.available} onChange={e => setEditItemForm(f => ({ ...f, available: e.target.checked }))} />
                  {t("drinks.itemAvailable")}
                </label>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 rounded-lg h-8" disabled={savingItem || !editItemForm.name || !editItemForm.price_vnd}
                    onClick={async () => {
                      if (!groupId) return;
                      setSavingItem(true);
                      const { error } = await upsertItem(groupId, { ...editItemForm, id: (menuEditItem as MenuItem).id });
                      setSavingItem(false);
                      if (error) toast.error(error);
                      else { setMenuEditItem(null); }
                    }}
                  >
                    {savingItem ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t("drinks.saveItem")}
                  </Button>
                  <Button size="sm" variant="ghost" className="rounded-lg h-8" onClick={() => setMenuEditItem(null)}>{t("common.cancel")}</Button>
                </div>
              </Card>
            )}

            {menuItems.length === 0 && !menuLoading ? (
              <Card className="p-4 shadow-card text-center">
                <p className="text-xs text-muted-foreground">{isHost ? t("drinks.menuEmpty") : t("drinks.noMenu")}</p>
              </Card>
            ) : (
              <Card className="shadow-card overflow-hidden">
                {menuItems.map((item, i) => (
                  <div key={item.id} className={`flex items-center gap-3 px-3.5 py-2.5 ${i < menuItems.length - 1 ? "border-b border-border" : ""} ${!item.available ? "opacity-50" : ""}`}>
                    <div className="h-10 w-10 rounded-lg overflow-hidden bg-secondary shrink-0 flex items-center justify-center">
                      {item.image_url
                        ? <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                        : <span className="text-xl">🧃</span>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.price_vnd.toLocaleString("vi-VN")}đ · {Math.floor(item.price_vnd / 100)} pts</p>
                    </div>
                    {isHost && (
                      <div className="flex gap-1">
                        <button onClick={() => { setEditItemForm({ name: item.name, name_vi: item.name_vi ?? "", emoji: item.emoji, image_url: item.image_url ?? null, price_vnd: item.price_vnd, available: item.available, sort_order: item.sort_order }); setMenuEditItem(item); }}
                          className="h-7 w-7 flex items-center justify-center rounded-lg bg-secondary text-muted-foreground hover:text-foreground">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={async () => {
                          if (!groupId || !confirm(t("drinks.confirmDelete"))) return;
                          const { error } = await deleteItem(groupId, item.id);
                          if (error) toast.error(error);
                        }} className="h-7 w-7 flex items-center justify-center rounded-lg bg-secondary text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </Card>
            )}
          </section>
        )}
        {/* Danger zone — host only */}
        {isHost && group.host_user_id === user?.id && (
          <section className="pt-2">
            <h2 className="text-xs font-display font-bold text-destructive uppercase tracking-wider mb-2">
              {t("groups.dangerZone")}
            </h2>
            <Card className="p-4 border-destructive/30 bg-destructive/5 shadow-card">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{t("groups.deleteGroup")}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t("groups.deleteGroupDesc")}</p>
                </div>
              </div>
              <Button
                variant="destructive"
                className="w-full rounded-xl h-10 mt-3"
                onClick={() => { setDeleteConfirmText(""); setDeleteOpen(true); }}
              >
                <Trash2 className="h-4 w-4 mr-2" /> {t("groups.deleteGroup")}
              </Button>
            </Card>
          </section>
        )}
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={(v) => !deleting && setDeleteOpen(v)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("groups.deleteGroup")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("groups.deleteConfirmDesc", { name: group.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              {t("groups.deleteTypeName")} <span className="font-semibold text-foreground">{group.name}</span>
            </p>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={group.name}
              className="rounded-xl"
              disabled={deleting}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" disabled={deleting}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              disabled={deleting || deleteConfirmText.trim() !== group.name.trim()}
              onClick={async (e) => {
                e.preventDefault();
                if (!groupId) return;
                setDeleting(true);
                const { error } = await deleteGroup(groupId);
                setDeleting(false);
                if (error) { toast.error(error); return; }
                toast.success(t("groups.deleted"));
                setDeleteOpen(false);
                navigate("/groups");
              }}
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {t("groups.deleteGroup")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Host Rating Sheet */}
      {groupId && (
        <HostRatingSheet
          open={hostRatingOpen}
          onOpenChange={setHostRatingOpen}
          groupId={groupId}
          hostUserId={group.host_user_id}
          hostName={members.find(m => m.user_id === group.host_user_id)?.display_name ?? t("groups.host")}
          existing={myHostRating}
          onSubmitted={() => { refetchHostRatings(); refetchHostSummary(); }}
        />
      )}

      {/* Drink Gift Sheet — pick recipient from members then open */}
      {drinkGiftOpen && giftTarget && groupId && (
        <DrinkGiftSheet
          open={drinkGiftOpen}
          onOpenChange={setDrinkGiftOpen}
          groupId={groupId}
          toUserId={giftTarget.id}
          toUserName={giftTarget.name}
          onSent={() => {}}
        />
      )}
    </div>
  );
};

export default GroupDetailPage;
