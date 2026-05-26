import { useState, useEffect } from "react";
import ShareGroupDialog from "@/components/ShareGroupDialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ArrowLeft, ArrowRight, Sparkles, MapPin, Settings2, Check, ChevronsUpDown } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useCreateGroup, useUpdateGroup, VN_CITIES, type SkillLevel, type Group } from "@/hooks/useGroups";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import VenuePicker from "@/components/VenuePicker";

const EMOJIS = ["🥎", "🎾", "🏸", "⚡", "🔥", "🏆", "🌟", "💪", "🎯", "🏅"];
const SKILLS: SkillLevel[] = ["all", "beginner", "intermediate", "advanced", "pro"];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: () => void;
  editGroup?: Group;
  onUpdated?: () => void;
}

type Step = 1 | 2 | 3;

const CreateGroupDialog = ({ open, onOpenChange, onCreated, editGroup, onUpdated }: Props) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { createGroup } = useCreateGroup();
  const { updateGroup } = useUpdateGroup();
  const { refetchRoles } = useAuth();
  const isEditing = !!editGroup;

  // Wizard step
  const [step, setStep] = useState<Step>(1);

  // Fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [city, setCity] = useState<string>("");
  const [mapUrl, setMapUrl] = useState("");
  const [emoji, setEmoji] = useState("🥎");
  const [skill, setSkill] = useState<SkillLevel>("all");
  const [isOpen, setIsOpen] = useState(true);
  const [venueId, setVenueId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [createdGroup, setCreatedGroup] = useState<{ id: string; name: string; cover_emoji: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    if (editGroup) {
      setName(editGroup.name);
      setDescription(editGroup.description ?? "");
      setLocation(editGroup.location ?? "");
      setCity(editGroup.city ?? "");
      setMapUrl(editGroup.map_url ?? "");
      setEmoji(editGroup.cover_emoji);
      setSkill(editGroup.skill_level);
      setIsOpen(editGroup.is_open);
      setVenueId(editGroup.venue_id ?? null);
    }
    setStep(1);
  }, [editGroup, open]);

  const reset = () => {
    setName(""); setDescription(""); setLocation(""); setCity("");
    setMapUrl(""); setEmoji("🥎"); setSkill("all"); setIsOpen(true);
    setVenueId(null); setStep(1);
  };

  const canContinueStep1 = !!name.trim();
  const canSubmit = canContinueStep1;

  const goNext = () => setStep(s => (s < 3 ? ((s + 1) as Step) : s));
  const goBack = () => setStep(s => (s > 1 ? ((s - 1) as Step) : s));

  const handleSave = async () => {
    if (!canSubmit) return;
    setSaving(true);

    const payload = {
      name: name.trim(),
      description: description || undefined,
      location: location || undefined,
      city: city || undefined,
      map_url: mapUrl || undefined,
      cover_emoji: emoji,
      skill_level: skill,
      is_open: isOpen,
      venue_id: venueId,
    };

    if (isEditing && editGroup) {
      const { error } = await updateGroup(editGroup.id, payload);
      setSaving(false);
      if (error) { toast.error(error); return; }
      toast.success(t("groups.updated"));
      onUpdated?.();
      onOpenChange(false);
      return;
    }

    const { data, error } = await createGroup(payload);
    setSaving(false);
    if (error) { toast.error(error); return; }
    toast.success(t("groups.created"));
    await refetchRoles();
    onCreated?.();
    if (data) {
      setCreatedGroup({ id: data.id, name: data.name, cover_emoji: data.cover_emoji });
      onOpenChange(false);
    } else {
      reset();
      onOpenChange(false);
    }
  };

  const handleShareClose = () => {
    const id = createdGroup?.id;
    setCreatedGroup(null);
    reset();
    if (id) navigate(`/group/${id}`);
  };

  const stepMeta = [
    { id: 1 as Step, icon: Sparkles,  labelKey: "groups.wizard.stepLabel1" as const, titleKey: "groups.wizard.step1.title" as const, subKey: "groups.wizard.step1.sub" as const },
    { id: 2 as Step, icon: MapPin,    labelKey: "groups.wizard.stepLabel2" as const, titleKey: "groups.wizard.step2.title" as const, subKey: "groups.wizard.step2.sub" as const },
    { id: 3 as Step, icon: Settings2, labelKey: "groups.wizard.stepLabel3" as const, titleKey: "groups.wizard.step3.title" as const, subKey: "groups.wizard.step3.sub" as const },
  ];
  const current = stepMeta[step - 1];

  return (
    <>
    <ShareGroupDialog
      open={!!createdGroup}
      onOpenChange={v => { if (!v) handleShareClose(); }}
      group={createdGroup ?? { id: "", name: "", cover_emoji: "🥎" }}
    />
    <Dialog open={open} onOpenChange={v => { if (!v && !isEditing) reset(); onOpenChange(v); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? t("groups.editGroup") : t("groups.newGroup")}</DialogTitle>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-1 pt-1">
          {stepMeta.map((s, i) => {
            const active = step === s.id;
            const done = step > s.id;
            return (
              <div key={s.id} className="flex-1 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => { if (done) setStep(s.id); }}
                  disabled={!done}
                  className={cn(
                    "flex-1 h-1.5 rounded-full transition-all",
                    active ? "bg-primary" : done ? "bg-primary/60" : "bg-secondary",
                  )}
                />
                {i < stepMeta.length - 1 && <div className="w-0" />}
              </div>
            );
          })}
        </div>

        {/* Step header */}
        <div className="flex items-center gap-2.5 pb-1">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <current.icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-display font-bold text-foreground">{t(current.titleKey)}</p>
            <p className="text-[11px] text-muted-foreground">{t(current.subKey)}</p>
          </div>
        </div>

        {/* STEP 1 — Identity */}
        {step === 1 && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">{t("groups.emoji")}</Label>
              <div className="grid grid-cols-5 gap-1.5">
                {EMOJIS.map(e => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setEmoji(e)}
                    className={cn(
                      "h-10 rounded-xl text-xl flex items-center justify-center transition-all",
                      emoji === e ? "bg-primary/15 ring-2 ring-primary" : "bg-secondary hover:bg-secondary/70",
                    )}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">{t("groups.nameLabel")} *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder={t("groups.namePh")} autoFocus />
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">{t("groups.descLabel")}</Label>
              <Textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder={t("groups.descPh")} className="resize-none" />
            </div>
          </div>
        )}

        {/* STEP 2 — Location */}
        {step === 2 && (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">{t("groups.city")}</Label>
              <CitySelect value={city} onChange={setCity} placeholder={t("groups.cityPh")} searchPh={t("groups.citySearchPh")} emptyText={t("groups.cityNoResult")} />
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">{t("venuePicker.label")}</Label>
              <VenuePicker
                value={venueId}
                onChange={({ venue_id, venue }) => {
                  setVenueId(venue_id);
                  if (venue && !location) {
                    setLocation([venue.location, venue.address].filter(Boolean).join(" · "));
                  }
                }}
              />
              <p className="text-[10px] text-muted-foreground">{t("venuePicker.hint")}</p>
            </div>

            {/* Show address + map only when no venue selected (avoid duplication) */}
            {!venueId && (
              <>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">{t("store.address")}</Label>
                  <Input value={location} onChange={e => setLocation(e.target.value)} placeholder={t("groups.locationPh")} />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">{t("groups.mapUrl")}</Label>
                  <Input value={mapUrl} onChange={e => setMapUrl(e.target.value)} placeholder="https://maps.google.com/..." type="url" />
                  <p className="text-[10px] text-muted-foreground">{t("groups.mapUrlHint")}</p>
                </div>
              </>
            )}
          </div>
        )}

        {/* STEP 3 — Rules */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">{t("groups.skillLabel")}</Label>
              <div className="grid grid-cols-5 gap-1.5">
                {SKILLS.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSkill(s)}
                    className={cn(
                      "h-9 rounded-lg text-[10.5px] font-medium border transition-all",
                      skill === s
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-muted-foreground border-border hover:border-primary/30",
                    )}
                  >
                    {s === "all" ? t("common.all") : t(`skill.${s}`)}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-secondary/30 p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-foreground">{isOpen ? t("groups.openJoin") : t("groups.approvalJoin")}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{isOpen ? t("groups.openJoinDesc") : t("groups.approvalJoinDesc")}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(v => !v)}
                className={cn("relative h-6 w-11 rounded-full transition-colors shrink-0", isOpen ? "bg-primary" : "bg-secondary")}
              >
                <span className={cn("absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform", isOpen ? "translate-x-5" : "translate-x-0")} />
              </button>
            </div>

            {/* Preview card */}
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">{t("groups.wizard.preview")}</Label>
              <div className="rounded-xl border border-border bg-card p-3 flex items-start gap-3">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl shrink-0">
                  {emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{name || t("groups.namePh")}</p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {[city, location].filter(Boolean).join(" · ") || t("groups.locationPh")}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                      {skill === "all" ? t("common.all") : t(`skill.${skill}`)}
                    </span>
                    <span className={cn(
                      "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded",
                      isOpen ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600",
                    )}>
                      {isOpen ? t("groups.openJoin") : t("groups.approvalJoin")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step > 1 ? (
            <Button variant="outline" onClick={goBack} disabled={saving} className="gap-1.5">
              <ArrowLeft className="h-3.5 w-3.5" /> {t("common.back")}
            </Button>
          ) : (
            <Button variant="outline" onClick={() => { if (!isEditing) reset(); onOpenChange(false); }} disabled={saving}>
              {t("common.cancel")}
            </Button>
          )}

          {step < 3 ? (
            <Button onClick={goNext} disabled={step === 1 && !canContinueStep1} className="gap-1.5">
              {t("common.continue")} <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button onClick={handleSave} disabled={saving || !canSubmit}>
              {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              {isEditing ? t("common.save") : t("groups.create")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
};

const CitySelect = ({ value, onChange, placeholder, searchPh, emptyText }: {
  value: string; onChange: (v: string) => void; placeholder: string; searchPh: string; emptyText: string;
}) => {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <span className={cn(value ? "text-foreground" : "text-muted-foreground")}>{value || placeholder}</span>
          <ChevronsUpDown className="h-4 w-4 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPh} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {VN_CITIES.map(c => (
                <CommandItem key={c} value={c} onSelect={() => { onChange(c); setOpen(false); }}>
                  <Check className={cn("mr-2 h-4 w-4", value === c ? "opacity-100" : "opacity-0")} />
                  {c}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default CreateGroupDialog;
