import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/i18n/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { useMyStore, STORE_CATEGORIES } from "@/hooks/useStores";
import LogoUpload from "@/components/LogoUpload";

const StoreEditPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { toast } = useToast();
  const { store, loading, upsertStore } = useMyStore();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [mapUrl, setMapUrl] = useState("");
  const [website, setWebsite] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!store) return;
    setName(store.name);
    setDescription(store.description ?? "");
    setPhone(store.phone ?? "");
    setEmail(store.email ?? "");
    setAddress(store.address ?? "");
    setMapUrl(store.map_url ?? "");
    setWebsite(store.website ?? "");
    setLogoUrl(store.logo_url);
    setCategories(store.categories);
  }, [store]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }
  if (!store) {
    navigate("/my-store");
    return null;
  }

  const toggleCat = (c: string) =>
    setCategories(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const { error } = await upsertStore({
      name,
      description: description || null,
      phone: phone || null,
      email: email || null,
      address: address || null,
      map_url: mapUrl || null,
      website: website || null,
      logo_url: logoUrl,
      categories,
    });
    setSaving(false);
    if (error) {
      toast({ title: t("auth.toast.error"), description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: t("store.profile.savedToast") });
    navigate("/my-store");
  };

  return (
    <div className="pb-24 min-h-screen">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button onClick={() => navigate("/my-store")} className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center hover:bg-secondary/70 transition-colors">
            <ArrowLeft className="h-4 w-4 text-foreground" />
          </button>
          <h1 className="text-base font-display font-bold text-foreground">{t("store.action.editProfile")}</h1>
        </div>
      </div>

      <div className="px-4 pt-4 max-w-md mx-auto space-y-4">
        <Card className="p-4 shadow-card space-y-3.5">
          <LogoUpload value={logoUrl} onChange={setLogoUrl} size={80} />

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Store name <span className="text-destructive">*</span></Label>
            <Input value={name} onChange={e => setName(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">{t("store.product.description")}</Label>
            <Textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder={t("store.product.descPh")} className="resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">{t("store.booking.form.phone")}</Label>
              <Input type="tel" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Email</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">{t("store.address")}</Label>
            <Input value={address} onChange={e => setAddress(e.target.value)} placeholder={t("store.addressPh")} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">{t("store.mapUrl")}</Label>
            <Input type="url" value={mapUrl} onChange={e => setMapUrl(e.target.value)} placeholder="https://maps.google.com/..." />
            {mapUrl && <p className="text-[10px] text-primary dark:text-primary">✓ {t("store.mapUrlSet")}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Website</Label>
            <Input type="url" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://..." />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">{t("store.product.category")}</Label>
            <div className="flex flex-wrap gap-1.5">
              {STORE_CATEGORIES.map(c => {
                const active = categories.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleCat(c)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${
                      active ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:border-primary/30"
                    }`}
                  >
                    {t(`store.cat.${c}`)}
                  </button>
                );
              })}
            </div>
          </div>
        </Card>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 h-11 rounded-xl" onClick={() => navigate("/my-store")} disabled={saving}>
            {t("common.cancel")}
          </Button>
          <Button className="flex-1 h-11 rounded-xl" onClick={handleSave} disabled={saving || !name.trim()}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {t("common.save")}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StoreEditPage;
