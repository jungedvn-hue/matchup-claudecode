import { useState, useEffect } from "react";
import ShareGroupDialog from "@/components/ShareGroupDialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useCreateGroup, useUpdateGroup, VN_CITIES, type SkillLevel, type Group } from "@/hooks/useGroups";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
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

const CreateGroupDialog = ({ open, onOpenChange, onCreated, editGroup, onUpdated }: Props) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { createGroup } = useCreateGroup();
  const { updateGroup } = useUpdateGroup();
  const { refetchRoles } = useAuth();
  const isEditing = !!editGroup;

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
    if (editGroup && open) {
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
  }, [editGroup, open]);

  const reset = () => { setName(""); setDescription(""); setLocation(""); setCity(""); setMapUrl(""); setEmoji("🥎"); setSkill("all"); setIsOpen(true); setVenueId(null); };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);

    if (isEditing && editGroup) {
      const { error } = await updateGroup(editGroup.id, { name: name.trim(), description: description || undefined, location: location || undefined, city: city || undefined, map_url: mapUrl || undefined, cover_emoji: emoji, skill_level: skill, is_open: isOpen, venue_id: venueId });
      setSaving(false);
      if (error) { toast.error(error); return; }
      toast.success(t("groups.updated"));
      onUpdated?.();
      onOpenChange(false);
      return;
    }

    const { data, error } = await createGroup({ name: name.trim(), description: description || undefined, location: location || undefined, city: city || undefined, map_url: mapUrl || undefined, cover_emoji: emoji, skill_level: skill, is_open: isOpen, venue_id: venueId });
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

  return (
    <>
    <ShareGroupDialog
      open={!!createdGroup}
      onOpenChange={v => { if (!v) handleShareClose(); }}
      group={createdGroup ?? { id: "", name: "", cover_emoji: "🥎" }}
    />
    <Dialog open={open} onOpenChange={v => { if (!v && !isEditing) reset(); onOpenChange(v); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? t("groups.editGroup") : t("groups.newGroup")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">{t("groups.emoji")}</Label>
            <div className="flex gap-1.5 flex-wrap">
              {EMOJIS.map(e => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={`h-9 w-9 rounded-lg text-xl flex items-center justify-center transition-all ${emoji === e ? "bg-primary/15 ring-2 ring-primary" : "bg-secondary hover:bg-secondary/70"}`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">{t("groups.nameLabel")} *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder={t("groups.namePh")} />
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">{t("groups.descLabel")}</Label>
            <Textarea rows={2} value={description} onChange={e => setDescription(e.target.value)} placeholder={t("groups.descPh")} className="resize-none" />
          </div>

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

          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">{t("store.address")}</Label>
            <Input value={location} onChange={e => setLocation(e.target.value)} placeholder={t("groups.locationPh")} />
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">{t("groups.mapUrl")}</Label>
            <Input value={mapUrl} onChange={e => setMapUrl(e.target.value)} placeholder="https://maps.google.com/..." type="url" />
            <p className="text-[10px] text-muted-foreground">{t("groups.mapUrlHint")}</p>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">{t("groups.skillLabel")}</Label>
            <div className="flex gap-1.5 flex-wrap">
              {SKILLS.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSkill(s)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${
                    skill === s ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:border-primary/30"
                  }`}
                >
                  {s === "all" ? t("common.all") : t(`skill.${s}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-secondary/30 p-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-foreground">{isOpen ? t("groups.openJoin") : t("groups.approvalJoin")}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{isOpen ? t("groups.openJoinDesc") : t("groups.approvalJoinDesc")}</p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(v => !v)}
              className={`relative h-6 w-11 rounded-full transition-colors shrink-0 ${isOpen ? "bg-primary" : "bg-secondary"}`}
            >
              <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${isOpen ? "translate-x-5" : "translate-x-0"}`} />
            </button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { if (!isEditing) reset(); onOpenChange(false); }} disabled={saving}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            {isEditing ? t("common.save") : t("groups.create")}
          </Button>
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
