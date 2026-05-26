import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { AMENITY_OPTIONS, DAY_KEYS, type DayKey, type OperatingHours, type Venue, type VenueInput, type VenuePricing, type VenueStatus } from "@/hooks/useVenues";
import ImageUpload from "@/components/ImageUpload";
import NumberInput from "@/components/NumberInput";
import MoneyInput from "@/components/MoneyInput";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  venue: Venue | null;          // null = create mode
  onSave: (input: VenueInput) => Promise<boolean>;
}

const VenueEditDialog = ({ open, onOpenChange, venue, onSave }: Props) => {
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [courtCount, setCourtCount] = useState<number | null>(1);
  const [amenities, setAmenities] = useState<string[]>([]);
  const [location, setLocation] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [mapUrl, setMapUrl] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAcc, setBankAcc] = useState("");
  const [bankHolder, setBankHolder] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [hours, setHours] = useState<OperatingHours>({});
  const [pricing, setPricing] = useState<VenuePricing>({});
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
    setBankName(venue?.bank_name ?? "");
    setBankAcc(venue?.bank_account_number ?? "");
    setBankHolder(venue?.bank_account_holder ?? "");
    setPhotos(venue?.photos ?? []);
    setHours((venue?.operating_hours as OperatingHours) ?? {});
    setPricing((venue?.pricing as VenuePricing) ?? {});
    setStatus(venue?.status ?? "active");
  }, [open, venue]);

  const toggleAmenity = (id: string) =>
    setAmenities(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const submit = async () => {
    if (!name.trim() || !courtCount || courtCount < 1) return;
    setSaving(true);
    const ok = await onSave({
      name: name.trim(),
      court_count: courtCount,
      amenities,
      location: location.trim() || null,
      address: address.trim() || null,
      contact_phone: phone.trim() || null,
      map_url: mapUrl.trim() || null,
      bank_name: bankName.trim().toUpperCase() || null,
      bank_account_number: bankAcc.trim() || null,
      bank_account_holder: bankHolder.trim().toUpperCase() || null,
      photos,
      operating_hours: Object.keys(hours).length ? hours : null,
      pricing: (pricing.weekday_hour || pricing.weekend_hour || pricing.full_day) ? pricing : null,
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
            <NumberInput integer min={1} value={courtCount} onChange={setCourtCount} placeholder="1" />
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

          <ImageUpload
            mode="multi"
            value={photos}
            onChange={setPhotos}
            max={6}
            bucket="venue-photos"
            label={t("venue.field.photos")}
          />

          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground">{t("venue.field.hours")}</Label>
            <div className="rounded-lg border border-border bg-card divide-y divide-border/60">
              {DAY_KEYS.map(d => {
                const v = hours[d];
                const closed = v === null;
                const open = v ? v.open : "07:00";
                const close = v ? v.close : "22:00";
                const setDay = (next: typeof v) => setHours(prev => ({ ...prev, [d]: next }));
                return (
                  <div key={d} className="flex items-center gap-2 px-2.5 py-1.5">
                    <span className="text-[11px] font-semibold uppercase w-9 text-foreground">{t(`venue.day.${d}`)}</span>
                    <button
                      type="button"
                      onClick={() => setDay(closed ? { open, close } : null)}
                      className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                        closed ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
                      }`}
                    >
                      {closed ? t("venue.hours.closed") : t("venue.hours.open")}
                    </button>
                    {!closed && (
                      <>
                        <Input
                          type="time" value={open}
                          onChange={e => setDay({ open: e.target.value, close })}
                          className="h-7 flex-1 tabular-nums"
                        />
                        <span className="text-muted-foreground">–</span>
                        <Input
                          type="time" value={close}
                          onChange={e => setDay({ open, close: e.target.value })}
                          className="h-7 flex-1 tabular-nums"
                        />
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground">{t("venue.field.pricing")} (VND)</Label>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">{t("venue.pricing.weekday")}</Label>
                <MoneyInput min={0} className="h-9"
                  value={pricing.weekday_hour ?? null}
                  onChange={(v) => setPricing(p => ({ ...p, weekday_hour: v }))}
                  placeholder="100.000" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">{t("venue.pricing.weekend")}</Label>
                <MoneyInput min={0} className="h-9"
                  value={pricing.weekend_hour ?? null}
                  onChange={(v) => setPricing(p => ({ ...p, weekend_hour: v }))}
                  placeholder="150.000" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">{t("venue.pricing.fullDay")}</Label>
                <MoneyInput min={0} className="h-9"
                  value={pricing.full_day ?? null}
                  onChange={(v) => setPricing(p => ({ ...p, full_day: v }))}
                  placeholder="1.500.000" />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">{t("venue.pricing.hint")}</p>
          </div>

          <div className="space-y-1.5 rounded-lg border border-border bg-secondary/30 p-3">
            <Label className="text-[11px] font-semibold text-foreground">{t("venue.bank.section")}</Label>
            <p className="text-[10px] text-muted-foreground -mt-1">{t("venue.bank.hint")}</p>
            <div className="grid grid-cols-3 gap-2 pt-1">
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">{t("venue.bank.name")}</Label>
                <Input value={bankName} onChange={e => setBankName(e.target.value)} placeholder="VCB" className="h-9 uppercase tracking-wide" maxLength={10} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-[10px] text-muted-foreground">{t("venue.bank.account")}</Label>
                <Input value={bankAcc} onChange={e => setBankAcc(e.target.value.replace(/[^0-9]/g, ""))} placeholder="1234567890" className="h-9 tabular-nums" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">{t("venue.bank.holder")}</Label>
              <Input value={bankHolder} onChange={e => setBankHolder(e.target.value)} placeholder="NGUYEN VAN A" className="h-9 uppercase" />
            </div>
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
          <Button onClick={submit} disabled={saving || !name.trim() || !courtCount || courtCount < 1}>
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VenueEditDialog;
