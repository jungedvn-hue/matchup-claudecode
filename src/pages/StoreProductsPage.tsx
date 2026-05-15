import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Plus, Pencil, Trash2, Star, Loader2, X, Package } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import ImageUpload from "@/components/ImageUpload";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useLanguage } from "@/i18n/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { useMyStore, useStoreProducts, STORE_CATEGORIES, AFFILIATE_SOURCES, type Product, type AffiliateSource } from "@/hooks/useStores";

const StoreProductsPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { toast } = useToast();
  const { store, loading: storeLoading } = useMyStore();
  const { products, loading, create, update, remove } = useStoreProducts(store?.id);
  const [searchParams, setSearchParams] = useSearchParams();
  const [editing, setEditing] = useState<Product | null>(null);
  const [adding, setAdding] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  useEffect(() => {
    if (searchParams.get("add") === "1") {
      setAdding(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  if (storeLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }
  if (!store) {
    navigate("/my-store");
    return null;
  }

  const handleSave = async (input: ProductFormState, id?: string) => {
    const payload = {
      name: input.name,
      description: input.description || null,
      category: input.category,
      price: input.price ? Number(input.price) : null,
      price_display: input.priceDisplay || null,
      availability: input.availability as Product["availability"],
      is_published: input.isPublished,
      is_featured: input.isFeatured,
      images: input.images,
      affiliate_url:    input.affiliateUrl?.trim() || null,
      affiliate_source: input.affiliateUrl?.trim() ? input.affiliateSource : null,
      affiliate_image_url: input.affiliateImageUrl?.trim() || null,
    };
    const { error } = id
      ? await update(id, payload)
      : await create({ ...payload, name: input.name, category: input.category });
    if (error) {
      toast({ title: t("auth.toast.error"), description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: id ? t("store.product.updated") : t("store.product.created") });
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
    toast({ title: t("store.product.deleted") });
    setDeleteTarget(null);
  };

  return (
    <div className="pb-24 min-h-screen">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center justify-between gap-3 max-w-2xl mx-auto">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate("/my-store")} className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center hover:bg-secondary/70 transition-colors shrink-0">
              <ArrowLeft className="h-4 w-4 text-foreground" />
            </button>
            <h1 className="text-base font-display font-bold text-foreground truncate">{t("store.action.manageProducts")}</h1>
          </div>
          <Button size="sm" onClick={() => setAdding(true)} className="rounded-lg gap-1.5 shrink-0">
            <Plus className="h-3.5 w-3.5" /> {t("store.action.addProduct")}
          </Button>
        </div>
      </div>

      <div className="px-4 pt-4 max-w-2xl mx-auto">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : products.length === 0 ? (
          <Card className="p-8 text-center space-y-3 mt-4 shadow-card">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <Package className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">{t("store.empty.products")}</p>
            <Button onClick={() => setAdding(true)} className="rounded-lg">
              <Plus className="h-4 w-4 mr-1.5" /> {t("store.action.addProduct")}
            </Button>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {products.map((p, i) => (
              <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Card className="p-3.5 shadow-card hover:shadow-elevated transition-shadow">
                  <div className="flex items-start gap-3">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <Package className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="text-sm font-display font-semibold text-foreground truncate">{p.name}</h3>
                            {p.is_featured && <Star className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />}
                            {!p.is_published && <Badge variant="secondary" className="text-[9px]">{t("store.product.draft")}</Badge>}
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            <span className="text-primary font-medium">{t(`store.cat.${p.category}`)}</span>
                            {p.price_display && <> · {p.price_display}</>}
                          </p>
                          {p.description && <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1 leading-relaxed">{p.description}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 mt-2 -mb-1">
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setEditing(p)}>
                          <Pencil className="h-3 w-3 mr-1" /> {t("common.edit")}
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10" onClick={() => setDeleteTarget(p)}>
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

      <ProductDialog
        open={adding || !!editing}
        product={editing}
        onClose={() => { setAdding(false); setEditing(null); }}
        onSave={(input) => handleSave(input, editing?.id)}
      />

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("store.product.deleteConfirm")}</DialogTitle>
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

interface ProductFormState {
  name: string;
  description: string;
  category: string;
  price: string;
  priceDisplay: string;
  availability: string;
  isPublished: boolean;
  isFeatured: boolean;
  images: string[];
  affiliateUrl: string;
  affiliateSource: AffiliateSource;
  affiliateImageUrl: string;
}

const blankForm = (): ProductFormState => ({
  name: "",
  description: "",
  category: "paddles",
  price: "",
  priceDisplay: "",
  availability: "in_stock",
  isPublished: true,
  isFeatured: false,
  images: [],
  affiliateUrl: "",
  affiliateSource: "shopee",
  affiliateImageUrl: "",
});

const fromProduct = (p: Product): ProductFormState => ({
  name: p.name,
  description: p.description ?? "",
  category: p.category,
  price: p.price?.toString() ?? "",
  priceDisplay: p.price_display ?? "",
  availability: p.availability,
  isPublished: p.is_published,
  isFeatured: p.is_featured,
  images: p.images ?? [],
  affiliateUrl: p.affiliate_url ?? "",
  affiliateSource: p.affiliate_source ?? "shopee",
  affiliateImageUrl: p.affiliate_image_url ?? "",
});

const ProductDialog = ({
  open, product, onClose, onSave,
}: {
  open: boolean;
  product: Product | null;
  onClose: () => void;
  onSave: (input: ProductFormState) => void | Promise<void>;
}) => {
  const { t } = useLanguage();
  const [form, setForm] = useState<ProductFormState>(blankForm());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(product ? fromProduct(product) : blankForm());
  }, [open, product]);

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
          <DialogTitle>{product ? t("common.edit") : t("store.action.addProduct")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Field label={t("store.product.name")} required>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t("store.product.namePh")} />
          </Field>
          <Field label={t("store.product.category")} required>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STORE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{t(`store.cat.${c}`)}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t("store.product.description")}>
            <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder={t("store.product.descPh")} className="resize-none" />
          </Field>
          <ImageUpload
            mode="multi"
            value={form.images}
            onChange={(urls) => setForm({ ...form, images: urls })}
            max={6}
            label={t("store.product.images")}
          />
          <div className="grid grid-cols-2 gap-2">
            <Field label={t("store.product.price")}>
              <Input type="number" min={0} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            </Field>
            <Field label={t("store.product.priceDisplay")}>
              <Input value={form.priceDisplay} onChange={(e) => setForm({ ...form, priceDisplay: e.target.value })} placeholder={t("store.product.priceDisplayPh")} />
            </Field>
          </div>
          <Field label={t("store.product.availability")}>
            <Select value={form.availability} onValueChange={(v) => setForm({ ...form, availability: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="in_stock">In stock</SelectItem>
                <SelectItem value="low_stock">Low stock</SelectItem>
                <SelectItem value="out_of_stock">Out of stock</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="booked">Booked</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/40 border border-border/50">
            <Label className="text-sm font-medium">{t("store.product.published")}</Label>
            <Switch checked={form.isPublished} onCheckedChange={(v) => setForm({ ...form, isPublished: v })} />
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/40 border border-border/50">
            <Label className="text-sm font-medium">{t("store.product.featured")}</Label>
            <Switch checked={form.isFeatured} onCheckedChange={(v) => setForm({ ...form, isFeatured: v })} />
          </div>

          {/* Affiliate */}
          <div className="space-y-2 p-3 rounded-xl bg-primary/5 border border-primary/15">
            <Label className="text-xs font-semibold uppercase tracking-wider text-primary">{t("store.product.affiliate")}</Label>
            <Field label={t("store.product.affiliateUrl")}>
              <Input
                value={form.affiliateUrl}
                onChange={(e) => setForm({ ...form, affiliateUrl: e.target.value })}
                placeholder="https://shopee.vn/..."
                type="url"
              />
            </Field>
            {form.affiliateUrl.trim() && (
              <>
                <Field label={t("store.product.affiliateSource")}>
                  <Select value={form.affiliateSource} onValueChange={(v) => setForm({ ...form, affiliateSource: v as AffiliateSource })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {AFFILIATE_SOURCES.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label={t("store.product.affiliateImage")}>
                  <Input
                    value={form.affiliateImageUrl}
                    onChange={(e) => setForm({ ...form, affiliateImageUrl: e.target.value })}
                    placeholder="https://..."
                    type="url"
                  />
                </Field>
              </>
            )}
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

export default StoreProductsPage;
