import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, Pencil, Trash2, Loader2, CalendarClock, Share2, Clock, MapPin, UserPlus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useLanguage } from "@/i18n/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { useVenue } from "@/hooks/useVenues";
import { useVenueSessions, type VenueSession, type VenueSessionStatus } from "@/hooks/useVenueSessions";
import CohostDialog from "./components/CohostDialog";

const fmtTime = (iso: string) => new Date(iso).toLocaleString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
// datetime-local <-> ISO helpers (local timezone)
const toLocalInput = (iso?: string | null) => {
  const d = iso ? new Date(iso) : new Date();
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
};
const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null);

const VenueSessionsPage = () => {
  const navigate = useNavigate();
  const { venueId } = useParams<{ venueId: string }>();
  const { t } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: venue, loading: venueLoading } = useVenue(venueId);
  const { items, loading, create, update, remove, refetch } = useVenueSessions(venueId);
  const [editing, setEditing] = useState<VenueSession | null>(null);
  const [adding, setAdding] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<VenueSession | null>(null);
  const [cohostSession, setCohostSession] = useState<string | null>(null);

  useEffect(() => {
    if (!venueLoading && venue && user && venue.owner_user_id !== user.id) {
      navigate("/my-venues", { replace: true });
    }
  }, [venueLoading, venue, user, navigate]);

  if (venueLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!venue) { navigate("/my-venues", { replace: true }); return null; }

  const handleSave = async (form: SessionFormState, id?: string) => {
    const payload = {
      title: form.title.trim(),
      court_ref: form.courtRef.trim() || null,
      starts_at: fromLocalInput(form.startsAt)!,
      ends_at: form.endsAt ? fromLocalInput(form.endsAt) : null,
      status: form.status,
    };
    const { error } = id ? await update(id, payload) : await create(payload);
    if (error) { toast({ title: t("auth.toast.error"), description: error.message, variant: "destructive" }); return; }
    toast({ title: id ? t("venueSessionMgr.updated") : t("venueSessionMgr.created") });
    setEditing(null); setAdding(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await remove(deleteTarget.id);
    if (error) { toast({ title: t("auth.toast.error"), description: error.message, variant: "destructive" }); return; }
    toast({ title: t("venueSessionMgr.deleted") }); setDeleteTarget(null);
  };

  const share = (s: VenueSession) => {
    const url = `${window.location.origin}/v/${venue.id}/s/${s.id}`;
    navigator.clipboard.writeText(url);
    toast({ title: t("venueSessionMgr.linkCopied"), description: url });
  };

  return (
    <div className="pb-24 min-h-screen">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center justify-between gap-3 max-w-2xl mx-auto">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate(-1)} className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center hover:bg-secondary/70 shrink-0"><ArrowLeft className="h-4 w-4" /></button>
            <div className="min-w-0">
              <h1 className="text-base font-display font-bold text-foreground truncate">{t("venueSessionMgr.title")}</h1>
              <p className="text-[11px] text-muted-foreground truncate">{venue.name}</p>
            </div>
          </div>
          <Button size="sm" onClick={() => setAdding(true)} className="rounded-lg gap-1.5 shrink-0"><Plus className="h-3.5 w-3.5" /> {t("venueSessionMgr.add")}</Button>
        </div>
      </div>

      <div className="px-4 pt-4 max-w-2xl mx-auto">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : items.length === 0 ? (
          <Card className="p-8 text-center space-y-3 mt-4 shadow-card">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto"><CalendarClock className="h-6 w-6 text-primary" /></div>
            <p className="text-sm text-muted-foreground">{t("venueSessionMgr.empty")}</p>
            <Button onClick={() => setAdding(true)} className="rounded-lg"><Plus className="h-4 w-4 mr-1.5" /> {t("venueSessionMgr.add")}</Button>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {items.map((s, i) => (
              <motion.div key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Card className="p-3.5 shadow-card space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="text-sm font-display font-semibold text-foreground truncate">{s.title}</h3>
                        {s.status !== "open" && <Badge variant="secondary" className="text-[9px]">{t(`venueSession.status.${s.status}`)}</Badge>}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1"><Clock className="h-3 w-3" />{fmtTime(s.starts_at)}</p>
                      {s.court_ref && <p className="text-[11px] text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{s.court_ref}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 pt-1 border-t border-border/60">
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => share(s)}><Share2 className="h-3 w-3 mr-1" /> {t("venueSessionMgr.share")}</Button>
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setCohostSession(s.id)}><UserPlus className="h-3 w-3 mr-1" /> {t("cohost.title")}</Button>
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => navigate(`/my-venues/${venue.id}/orders?session=${s.id}`)}>{t("venueSessionMgr.viewOrders")}</Button>
                    <div className="flex-1" />
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setEditing(s)}><Pencil className="h-3 w-3 mr-1" /> {t("common.edit")}</Button>
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10" onClick={() => setDeleteTarget(s)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <SessionDialog open={adding || !!editing} session={editing} onClose={() => { setAdding(false); setEditing(null); }} onSave={(f) => handleSave(f, editing?.id)} />
      <CohostDialog open={!!cohostSession} sessionId={cohostSession} onClose={() => { setCohostSession(null); refetch(); }} />

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{t("venueSessionMgr.deleteConfirm")}</DialogTitle><DialogDescription>{deleteTarget?.title}</DialogDescription></DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>{t("common.cancel")}</Button>
            <Button variant="destructive" onClick={handleDelete}>{t("common.delete")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

interface SessionFormState { title: string; courtRef: string; startsAt: string; endsAt: string; status: VenueSessionStatus; }
const blankForm = (): SessionFormState => ({ title: "", courtRef: "", startsAt: toLocalInput(), endsAt: "", status: "open" });
const fromSession = (s: VenueSession): SessionFormState => ({
  title: s.title, courtRef: s.court_ref ?? "", startsAt: toLocalInput(s.starts_at),
  endsAt: s.ends_at ? toLocalInput(s.ends_at) : "", status: s.status,
});

const SessionDialog = ({ open, session, onClose, onSave }: {
  open: boolean; session: VenueSession | null; onClose: () => void; onSave: (f: SessionFormState) => void | Promise<void>;
}) => {
  const { t } = useLanguage();
  const [form, setForm] = useState<SessionFormState>(blankForm());
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) setForm(session ? fromSession(session) : blankForm()); }, [open, session]);

  const submit = async () => {
    if (!form.title.trim() || !form.startsAt) return;
    setSaving(true); await onSave(form); setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{session ? t("common.edit") : t("venueSessionMgr.add")}</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <Field label={t("venueSessionMgr.titleLabel")} required>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={t("venueSessionMgr.titlePh")} />
          </Field>
          <Field label={t("venueSession.court")}>
            <Input value={form.courtRef} onChange={(e) => setForm({ ...form, courtRef: e.target.value })} placeholder={t("venueSession.courtPh")} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label={t("venueSessionMgr.startsAt")} required>
              <Input type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
            </Field>
            <Field label={t("venueSessionMgr.endsAt")}>
              <Input type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} />
            </Field>
          </div>
          <Field label={t("venueSessionMgr.statusLabel")}>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as VenueSessionStatus })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(["open", "closed", "cancelled"] as VenueSessionStatus[]).map(s => <SelectItem key={s} value={s}>{t(`venueSession.status.${s}`)}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>{t("common.cancel")}</Button>
          <Button onClick={submit} disabled={saving || !form.title.trim() || !form.startsAt}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const Field = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label className="text-xs font-medium">{label} {required && <span className="text-destructive">*</span>}</Label>
    {children}
  </div>
);

export default VenueSessionsPage;
