import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Building2, Plus, MapPin, Phone, Edit, Trash2, Loader2, Calendar, Trophy, Users, ExternalLink, CalendarCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useLanguage } from "@/i18n/LanguageContext";
import { useMyVenues, useVenueActivity, AMENITY_OPTIONS, type Venue } from "@/hooks/useVenues";
import VenueEditDialog from "./components/VenueEditDialog";
import { toast } from "sonner";

const ActivityStrip = ({ venueId }: { venueId: string }) => {
  const { t } = useLanguage();
  const { data } = useVenueActivity(venueId);
  if (data.groups_count + data.events_count + data.tournaments_count === 0) return null;
  return (
    <div className="flex items-center gap-3 text-[11px] text-muted-foreground tabular-nums">
      <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{data.groups_count} {t("venue.activity.groups")}</span>
      <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{data.events_count} {t("venue.activity.events")}</span>
      <span className="inline-flex items-center gap-1"><Trophy className="h-3 w-3" />{data.tournaments_count} {t("venue.activity.tournaments")}</span>
    </div>
  );
};

const StatusBadge = ({ status }: { status: Venue["status"] }) => {
  const { t } = useLanguage();
  const map = {
    active:               { cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20", key: "venue.status.active" },
    inactive:             { cls: "bg-muted text-muted-foreground border-border",                                   key: "venue.status.inactive" },
    pending_verification: { cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",          key: "venue.status.pending" },
  }[status];
  return (
    <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${map.cls}`}>
      {t(map.key)}
    </span>
  );
};

const MyVenuesPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { items, loading, create, update, remove } = useMyVenues();
  const [editing, setEditing] = useState<Venue | null>(null);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const handleDelete = async (v: Venue) => {
    setBusyId(v.id);
    const { error } = await remove(v.id);
    setBusyId(null);
    if (error) toast.error(t("venue.deleteError"));
    else toast.success(t("venue.deleted"));
  };

  const amenityLabel = (id: string) => {
    const opt = AMENITY_OPTIONS.find(o => o.id === id);
    return opt ? `${opt.emoji} ${t(opt.labelKey)}` : id;
  };

  return (
    <div className="pb-24 min-h-screen">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button onClick={() => navigate(-1)} className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-display font-bold text-foreground flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" /> {t("venue.myVenues")}
            </h1>
            <p className="text-xs text-muted-foreground truncate">{t("venue.subtitle")}</p>
          </div>
          <Button size="sm" className="h-8 gap-1.5 shrink-0" onClick={() => setCreating(true)}>
            <Plus className="h-3.5 w-3.5" />
            <span className="text-[11px]">{t("venue.add")}</span>
          </Button>
        </div>
      </div>

      <div className="px-4 pt-4 max-w-2xl mx-auto space-y-3">
        {loading ? (
          <div className="py-12 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground/50" /></div>
        ) : items.length === 0 ? (
          <Card className="p-8 text-center space-y-3">
            <Building2 className="h-10 w-10 mx-auto text-muted-foreground/30" />
            <div>
              <p className="font-display font-semibold text-foreground">{t("venue.emptyTitle")}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{t("venue.emptyDesc")}</p>
            </div>
            <Button size="sm" className="gap-1.5" onClick={() => setCreating(true)}>
              <Plus className="h-3.5 w-3.5" /> {t("venue.addFirst")}
            </Button>
          </Card>
        ) : (
          items.map((v, i) => (
            <motion.div key={v.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card className="p-4 shadow-card space-y-3">
                <div className="flex items-start gap-3">
                  {v.photos && v.photos.length > 0 && (
                    <div className="h-14 w-14 rounded-xl overflow-hidden bg-secondary shrink-0">
                      <img src={v.photos[0]} alt={v.name} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-display font-bold text-foreground truncate">{v.name}</h3>
                      <StatusBadge status={v.status} />
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 tabular-nums">
                      {v.court_count} {t("venue.courts")}
                    </p>
                  </div>
                </div>

                {(v.location || v.address || v.contact_phone) && (
                  <div className="space-y-1 text-[11px] text-muted-foreground">
                    {(v.location || v.address) && (
                      <p className="flex items-center gap-1.5">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{[v.location, v.address].filter(Boolean).join(" · ")}</span>
                      </p>
                    )}
                    {v.contact_phone && (
                      <p className="flex items-center gap-1.5">
                        <Phone className="h-3 w-3 shrink-0" />
                        <span className="tabular-nums">{v.contact_phone}</span>
                      </p>
                    )}
                  </div>
                )}

                {v.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {v.amenities.map(a => (
                      <span key={a} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-foreground">
                        {amenityLabel(a)}
                      </span>
                    ))}
                  </div>
                )}

                <ActivityStrip venueId={v.id} />


                <div className="flex items-center gap-2 pt-1 border-t border-border/60">
                  <button
                    onClick={() => navigate(`/my-venues/${v.id}/bookings`)}
                    className="flex-1 h-8 rounded-lg bg-primary text-primary-foreground text-[11px] font-semibold flex items-center justify-center gap-1.5 hover:bg-primary/90 transition-colors"
                  >
                    <CalendarCheck className="h-3.5 w-3.5" /> {t("venue.bookings")}
                  </button>
                  <button
                    onClick={() => navigate(`/venue/${v.id}`)}
                    className="h-8 w-8 rounded-lg bg-secondary text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center"
                    title={t("venue.viewPublic")}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setEditing(v)}
                    className="h-8 w-8 rounded-lg bg-secondary text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center"
                    title={t("venue.edit")}
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        disabled={busyId === v.id}
                        className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex items-center justify-center"
                      >
                        {busyId === v.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t("common.confirm")}</AlertDialogTitle>
                        <AlertDialogDescription>{t("venue.deleteConfirm", { name: v.name } as any) ?? `Delete "${v.name}"?`}</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(v)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {t("common.delete")}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      <VenueEditDialog
        open={creating || !!editing}
        onOpenChange={(v) => { if (!v) { setCreating(false); setEditing(null); } }}
        venue={editing}
        onSave={async (input) => {
          if (editing) {
            const { error } = await update(editing.id, input);
            if (error) toast.error(t("venue.saveError"));
            else { toast.success(t("venue.saved")); setEditing(null); }
            return !error;
          } else {
            const { error } = await create(input);
            if (error) toast.error(t("venue.saveError"));
            else { toast.success(t("venue.created")); setCreating(false); }
            return !error;
          }
        }}
      />
    </div>
  );
};

export default MyVenuesPage;
