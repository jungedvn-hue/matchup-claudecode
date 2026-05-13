import { useEffect, useState } from "react";
import { Megaphone, Pin, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAnnouncementActions, type Announcement } from "@/hooks/useAnnouncements";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  groupId: string;
  editing?: Announcement;
  onSaved?: () => void;
}

const AnnouncementDialog = ({ open, onOpenChange, groupId, editing, onSaved }: Props) => {
  const { t } = useLanguage();
  const { create, update } = useAnnouncementActions();
  const isEditing = !!editing;

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (editing) {
        setTitle(editing.title ?? "");
        setBody(editing.body);
        setPinned(editing.pinned);
      } else {
        setTitle(""); setBody(""); setPinned(false);
      }
    }
  }, [open, editing]);

  const handleSave = async () => {
    if (!body.trim()) return;
    setSaving(true);
    const res = isEditing
      ? await update(editing!.id, { title, body, pinned })
      : await create({ groupId, title, body, pinned });
    setSaving(false);
    if (res.error) { toast.error(res.error); return; }
    toast.success(isEditing ? t("announcements.updated") : t("announcements.posted"));
    onSaved?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-primary" />
            {isEditing ? t("announcements.edit") : t("announcements.new")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">{t("announcements.titleOptional")}</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={t("announcements.titlePh")} maxLength={120} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">{t("announcements.body")} <span className="text-destructive">*</span></Label>
            <Textarea
              rows={5}
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder={t("announcements.bodyPh")}
              maxLength={2000}
              className="resize-none"
            />
            <p className="text-[10px] text-muted-foreground text-right tabular-nums">{body.length}/2000</p>
          </div>

          <button
            onClick={() => setPinned(v => !v)}
            className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${pinned ? "bg-primary/10 border-primary/30" : "bg-card border-border"}`}
          >
            <div className="flex items-center gap-2">
              <Pin className={`h-4 w-4 ${pinned ? "text-primary" : "text-muted-foreground"}`} />
              <div className="text-left">
                <p className="text-xs font-semibold text-foreground">{t("announcements.pin")}</p>
                <p className="text-[10px] text-muted-foreground">{t("announcements.pinDesc")}</p>
              </div>
            </div>
            <span className={`relative h-5 w-9 rounded-full ${pinned ? "bg-primary" : "bg-secondary"}`}>
              <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${pinned ? "translate-x-4" : "translate-x-0"}`} />
            </span>
          </button>

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => onOpenChange(false)} disabled={saving}>
              {t("common.cancel")}
            </Button>
            <Button className="flex-1 rounded-xl font-bold" onClick={handleSave} disabled={saving || !body.trim()}>
              {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              {isEditing ? t("common.save") : t("announcements.post")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AnnouncementDialog;
