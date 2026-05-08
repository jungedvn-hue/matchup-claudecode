import { useState } from "react";
import ShareGroupDialog from "@/components/ShareGroupDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useCreateGroup, type SkillLevel } from "@/hooks/useGroups";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const EMOJIS = ["🏓", "🎾", "🏸", "⚡", "🔥", "🏆", "🌟", "💪", "🎯", "🏅"];
const SKILLS: SkillLevel[] = ["all", "beginner", "intermediate", "advanced", "pro"];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: () => void;
}

const CreateGroupDialog = ({ open, onOpenChange, onCreated }: Props) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { createGroup } = useCreateGroup();
  const { refetchRoles } = useAuth();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [emoji, setEmoji] = useState("🏓");
  const [skill, setSkill] = useState<SkillLevel>("all");
  const [isOpen, setIsOpen] = useState(true);
  const [saving, setSaving] = useState(false);
  const [createdGroup, setCreatedGroup] = useState<{ id: string; name: string; cover_emoji: string } | null>(null);

  const reset = () => { setName(""); setDescription(""); setLocation(""); setEmoji("🏓"); setSkill("all"); setIsOpen(true); };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const { data, error } = await createGroup({ name: name.trim(), description: description || undefined, location: location || undefined, cover_emoji: emoji, skill_level: skill, is_open: isOpen });
    setSaving(false);
    if (error) { toast.error(error); return; }
    toast.success(t("groups.created"));
    await refetchRoles(); // Pick up auto-granted 'host' role for Tour Manager access
    onCreated?.();
    if (data) {
      setCreatedGroup({ id: data.id, name: data.name, cover_emoji: data.cover_emoji });
      onOpenChange(false); // close create dialog; share dialog opens via state below
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
      group={createdGroup ?? { id: "", name: "", cover_emoji: "🏓" }}
    />
    <Dialog open={open} onOpenChange={v => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display">{t("groups.newGroup")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Emoji picker */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">{t("groups.emoji")}</Label>
            <div className="flex gap-2 flex-wrap">
              {EMOJIS.map(e => (
                <button key={e} onClick={() => setEmoji(e)}
                  className={`h-9 w-9 rounded-lg text-xl flex items-center justify-center transition-all ${emoji === e ? "bg-primary/15 ring-2 ring-primary" : "bg-secondary hover:bg-secondary/70"}`}>
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">{t("groups.nameLabel")} <span className="text-destructive">*</span></Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder={t("groups.namePh")} />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">{t("groups.descLabel")}</Label>
            <Textarea rows={2} value={description} onChange={e => setDescription(e.target.value)} placeholder={t("groups.descPh")} className="resize-none" />
          </div>

          {/* Location */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">{t("store.address")}</Label>
            <Input value={location} onChange={e => setLocation(e.target.value)} placeholder={t("groups.locationPh")} />
          </div>

          {/* Skill */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">{t("groups.skillLabel")}</Label>
            <div className="flex gap-1.5 flex-wrap">
              {SKILLS.map(s => (
                <button key={s} onClick={() => setSkill(s)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${skill === s ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:border-primary/30"}`}>
                  {s === "all" ? t("common.all") : t(`skill.${s}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Open/Closed */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/50">
            <div>
              <p className="text-xs font-semibold text-foreground">{isOpen ? t("groups.openJoin") : t("groups.approvalJoin")}</p>
              <p className="text-[10px] text-muted-foreground">{isOpen ? t("groups.openJoinDesc") : t("groups.approvalJoinDesc")}</p>
            </div>
            <button onClick={() => setIsOpen(v => !v)}
              className={`relative h-6 w-11 rounded-full transition-colors ${isOpen ? "bg-primary" : "bg-secondary"}`}>
              <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${isOpen ? "translate-x-5" : "translate-x-0"}`} />
            </button>
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => { reset(); onOpenChange(false); }} disabled={saving}>
              {t("common.cancel")}
            </Button>
            <Button className="flex-1 rounded-xl font-bold" onClick={handleCreate} disabled={saving || !name.trim()}>
              {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              {t("groups.create")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default CreateGroupDialog;
