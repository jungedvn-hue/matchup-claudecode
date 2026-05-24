import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { AMENITY_OPTIONS, type Venue, type VenueInput, type VenueStatus } from "@/hooks/useVenues";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  venue: Venue | null;          // null = create mode
  onSave: (input: VenueInput) => Promise<boolean>;
}

const VenueEditDialog = ({ open, onOpenChange, venue, onSave }: Props) => {
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [courtCount, setCourtCount] = useState(1);
  const [amenities, setAmenities] = useState<string[]>([]);
  const [location, setLocation] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [mapUrl, setMapUrl] = useState("");
  const [status, setStatus] = useState<VenueStatus>("active");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(venue?.name ?? "");
    setCourtCount(venue?.court_count ?? 1);
    setAmenities(venue?.amenities ?? []);
    setLocation(venue?.location ?? "");
    setAddress(venue?.address ?? "");
    setPhone(venue?.contact_phone ?? "");
    setMapUrl(venue?.map_url ?? "");
    setStatus(venue?.status ?? "active");
  }, [open, venue]);

  const toggleAmenity = (id: string) =>
    setAmenities(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const submit = async () => {
    if (!name.trim() || courtCount < 1) return;
    setSaving(true);
    const ok = await onSave({
      name: name.trim(),
      court_count: courtCount,
      amenities,
      location: location.trim() || null,
      address: address.trim() || null,
      contact_phone: phone.trim() || null,
      map_url: mapUrl.trim() || null,
      status,
    });
    setSaving(false);
    if (ok) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{venue ? t("venue.edit") : t("venue.add")}</DialogTitle>
          <DialogDescription>{t("venue.editDesc")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">{t("venue.field.name")} *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder={t("venue.field.namePh")} />
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">{t("venue.field.courtCount")} *</Label>
            <Input
              type="number" min={1} value={courtCount}
              onChange={e => setCourtCount(Math.max(1, +e.target.value || 1))}
              className="tabular-nums"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">{t("venue.field.location")}</Label>
            <Input value={location} onChange={e => setLocation(e.target.value)} placeholder={t("venue.field.locationPh")} />
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">{t("venue.field.address")}</Label>
            <Input value={address} onChange={e => setAddress(e.target.value)} placeholder={t("venue.field.addressPh")} />
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">{t("venue.field.phone")}</Label>
            <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="0901234567" className="tabular-nums" />
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">{t("venue.field.mapUrl")}</Label>
            <Input value={mapUrl} onChange={e => setMapUrl(e.target.value)} placeholder="https://maps.google.com/..." type="url" />
            <p className="text-[10px] text-muted-foreground">{t("venue.field.mapUrlHint")}</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground">{t("venue.field.amenities")}</Label>
            <div className="grid grid-cols-2 gap-1.5">
              {AMENITY_OPTIONS.map(opt => {
                const active = amenities.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    onClick={() => toggleAmenity(opt.id)}
                    className={`px-3 py-2 rounded-lg text-[11px] font-medium text-left transition-colors border ${
                      active ? "bg-primary/10 text-primary border-primary/30" : "bg-card text-foreground border-border hover:border-primary/30"
                    }`}
                  >
                    {opt.emoji} {t(opt.labelKey)}
                  </button>
                );
              })}
            </div>
          </div>

          {venue && (
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">{t("venue.field.status")}</Label>
              <div className="flex gap-1.5">
                {(["active", "inactive"] as VenueStatus[]).map(s => (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    className={`flex-1 h-9 rounded-lg text-[11px] font-medium transition-colors ${
                      status === s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t(`venue.status.${s}`)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button onClick={submit} disabled={saving || !name.trim() || courtCount < 1}>
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VenueEditDialog;
