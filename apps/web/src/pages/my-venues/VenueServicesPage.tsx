import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, Pencil, Trash2, Loader2, Coffee, Truck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import ImageUpload from "@/components/ImageUpload";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useLanguage } from "@/i18n/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { useVenue } from "@/hooks/useVenues";
import {
  useVenueServices, VENUE_SERVICE_CATEGORIES,
  type VenueService, type VenueServiceCategory,
} from "@/hooks/useVenueServices";

const fmtMoney = (n: number) => `${Math.round(n).toLocaleString("vi-VN")}đ`;

const VenueServicesPage = () => {
  const navigate = useNavigate();
  const { venueId } = useParams<{ venueId: string }>();
  const { t } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: venue, loading: venueLoading } = useVenue(venueId);
  const { items, loading, create, update, remove } = useVenueServices(venueId);
  const [editing, setEditing] = useState<VenueService | null>(null);
  const [adding, setAdding] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<VenueService | null>(null);

  // Owner-only page; bounce non-owners back to the list.
  useEffect(() => {
    if (!venueLoading && venue && user && venue.owner_user_id !== user.id) {
      navigate("/my-venues", { replace: true });
    }
  }, [venueLoading, venue, user, navigate]);

  if (venueLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }
  if (!venue) {
    navigate("/my-venues", { replace: true });
    return null;
  }

  const handleSave = async (input: ServiceFormState, id?: string) => {
    const payload = {
      name: input.name.trim(),
      description: input.description.trim() || null,
      category: input.category,
      price: input.price ? Number(input.price) : 0,
      image_url: input.imageUrl || null,
      deliverable: input.deliverable,
      is_published: input.isPublished,
    };
    const { error } = id
      ? await update(id, payload)
      : await create({ ...payload, name: payload.name, category: payload.category });
    if (error) {
      toast({ title: t("auth.toast.error"), description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: id ? t("venueService.updated") : t("venueService.created") });
    setEditing(null);
    setAdding(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await remove(deleteTarget.id);
    if (error) {
      toast({ title: t("auth.toast.error"), description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: t("venueService.deleted") });
    setDeleteTarget(null);
  };

  return (
    <div className="pb-24 min-h-screen">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center justify-between gap-3 max-w-2xl mx-auto">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate(-1)} className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center hover:bg-secondary/70 transition-colors shrink-0">
              <ArrowLeft className="h-4 w-4 text-foreground" />
            </button>
            <div className="min-w-0">
              <h1 className="text-base font-display font-bold text-foreground truncate">{t("venueService.title")}</h1>
              <p className="text-[11px] text-muted-foreground truncate">{venue.name}</p>
            </div>
          </div>
          <Button size="sm" onClick={() => setAdding(true)} className="rounded-lg gap-1.5 shrink-0">
            <Plus className="h-3.5 w-3.5" /> {t("venueService.add")}
          </Button>
        </div>
      </div>

      <div className="px-4 pt-4 max-w-2xl mx-auto">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : items.length === 0 ? (
          <Card className="p-8 text-center space-y-3 mt-4 shadow-card">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <Coffee className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">{t("venueService.empty")}</p>
            <Button onClick={() => setAdding(true)} className="rounded-lg">
              <Plus className="h-4 w-4 mr-1.5" /> {t("venueService.add")}
            </Button>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {items.map((s, i) => (
              <motion.div key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Card className="p-3.5 shadow-card hover:shadow-elevated transition-shadow">
                  <div className="flex items-start gap-3">
                    {s.image_url ? (
                      <div className="h-12 w-12 rounded-xl overflow-hidden bg-secondary shrink-0">
                        <img src={s.image_url} alt={s.name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <Coffee className="h-5 w-5" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="text-sm font-display font-semibold text-foreground truncate">{s.name}</h3>
                        {!s.is_published && <Badge variant="secondary" className="text-[9px]">{t("venueService.draft")}</Badge>}
                        {!s.deliverable && <Badge variant="outline" className="text-[9px] gap-0.5"><Truck className="h-2.5 w-2.5" />{t("venueService.pickupOnly")}</Badge>}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        <span className="text-primary font-medium">{t(`venueService.cat.${s.category}`)}</span>
                        {" · "}<span className="tabular-nums">{fmtMoney(s.price)}</span>
                      </p>
                      {s.description && <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1 leading-relaxed">{s.description}</p>}
                      <div className="flex items-center gap-1 mt-2 -mb-1">
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setEditing(s)}>
                          <Pencil className="h-3 w-3 mr-1" /> {t("common.edit")}
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10" onClick={() => setDeleteTarget(s)}>
                          <Trash2 className="h-3 w-3 mr-1" /> {t("common.delete")}
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <ServiceDialog
        open={adding || !!editing}
        service={editing}
        onClose={() => { setAdding(false); setEditing(null); }}
        onSave={(input) => handleSave(input, editing?.id)}
      />

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("venueService.deleteConfirm")}</DialogTitle>
            <DialogDescription>{deleteTarget?.name}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>{t("common.cancel")}</Button>
            <Button variant="destructive" onClick={handleDelete}>{t("common.delete")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

interface ServiceFormState {
  name: string;
  description: string;
  category: VenueServiceCategory;
  price: string;
  imageUrl: string;
  deliverable: boolean;
  isPublished: boolean;
}

const blankForm = (): ServiceFormState => ({
  name: "",
  description: "",
  category: "drink",
  price: "",
  imageUrl: "",
  deliverable: true,
  isPublished: true,
});

const fromService = (s: VenueService): ServiceFormState => ({
  name: s.name,
  description: s.description ?? "",
  category: s.category,
  price: s.price ? s.price.toString() : "",
  imageUrl: s.image_url ?? "",
  deliverable: s.deliverable,
  isPublished: s.is_published,
});

const ServiceDialog = ({
  open, service, onClose, onSave,
}: {
  open: boolean;
  service: VenueService | null;
  onClose: () => void;
  onSave: (input: ServiceFormState) => void | Promise<void>;
}) => {
  const { t } = useLanguage();
  const [form, setForm] = useState<ServiceFormState>(blankForm());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(service ? fromService(service) : blankForm());
  }, [open, service]);

  const submit = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{service ? t("common.edit") : t("venueService.add")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Field label={t("venueService.name")} required>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t("venueService.namePh")} />
          </Field>
          <Field label={t("venueService.category")} required>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as VenueServiceCategory })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {VENUE_SERVICE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{t(`venueService.cat.${c}`)}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t("venueService.description")}>
            <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder={t("venueService.descPh")} className="resize-none" />
          </Field>
          <Field label={t("venueService.price")} required>
            <Input type="number" min={0} step={1000} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0" />
          </Field>
          <ImageUpload
            mode="single"
            value={form.imageUrl || null}
            onChange={(url) => setForm({ ...form, imageUrl: url ?? "" })}
            bucket="venue-photos"
            aspect="square"
            label={t("venueService.image")}
          />
          <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/40 border border-border/50">
            <div>
              <Label className="text-sm font-medium">{t("venueService.deliverable")}</Label>
              <p className="text-[11px] text-muted-foreground">{t("venueService.deliverableHint")}</p>
            </div>
            <Switch checked={form.deliverable} onCheckedChange={(v) => setForm({ ...form, deliverable: v })} />
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/40 border border-border/50">
            <Label className="text-sm font-medium">{t("venueService.published")}</Label>
            <Switch checked={form.isPublished} onCheckedChange={(v) => setForm({ ...form, isPublished: v })} />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>{t("common.cancel")}</Button>
          <Button onClick={submit} disabled={saving || !form.name.trim()}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {t("common.save")}
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

export default VenueServicesPage;
