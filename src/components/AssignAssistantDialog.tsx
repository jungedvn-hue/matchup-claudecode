import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { UserPlus, Check, Shield, MapPin, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useGroup } from "@/hooks/useGroups";
import {
  ALL_ASSISTANT_PERMISSIONS,
  AssistantPermission,
  useAssistantActions,
  useGroupAssistants,
} from "@/hooks/useAssistants";
import { useLanguage } from "@/i18n/LanguageContext";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  onAssigned?: () => void;
}

const permLabelKey: Record<AssistantPermission, string> = {
  check_in: "assistant.perm.check_in",
  approve_tickets: "assistant.perm.approve_tickets",
  manage_players: "assistant.perm.manage_players",
  view_stats: "assistant.perm.view_stats",
};

const AssignAssistantDialog = ({ open, onOpenChange, groupId, onAssigned }: Props) => {
  const { t } = useLanguage();
  const { group, members } = useGroup(groupId);
  const { assistants } = useGroupAssistants(groupId);
  const { assign } = useAssistantActions();

  const [step, setStep] = useState<"select" | "configure">("select");
  const [pickedUserId, setPickedUserId] = useState<string | null>(null);
  const [courtCount, setCourtCount] = useState(2);
  const [pickedCourts, setPickedCourts] = useState<string[]>([]);
  const [pickedPerms, setPickedPerms] = useState<AssistantPermission[]>(["check_in"]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) { reset(); }
  }, [open]);

  const reset = () => {
    setStep("select"); setPickedUserId(null); setPickedCourts([]); setPickedPerms(["check_in"]);
  };

  const existingIds = new Set(assistants.map(a => a.user_id));
  const eligibleMembers = members.filter(m => m.status === "active" && m.role !== "host" && !existingIds.has(m.user_id));
  const pickedMember = eligibleMembers.find(m => m.user_id === pickedUserId);

  const courtOptions = Array.from({ length: courtCount }, (_, i) => t("assistant.checkin.court", { n: i + 1 }));

  const toggle = <T,>(arr: T[], v: T, set: (a: T[]) => void) => {
    set(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);
  };

  const handleConfirm = async () => {
    if (!pickedUserId || pickedCourts.length === 0 || pickedPerms.length === 0) return;
    setSaving(true);
    const { error } = await assign({
      groupId, userId: pickedUserId, permissions: pickedPerms, assignedCourts: pickedCourts,
    });
    setSaving(false);
    if (error) { toast.error(error); return; }
    toast.success(t("assistant.assign.success", { name: pickedMember?.display_name || "" }));
    onAssigned?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            {step === "select" ? t("assistant.assign.titleSelect") : t("assistant.assign.titleConfigure")}
          </DialogTitle>
        </DialogHeader>

        {step === "select" ? (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              {t("assistant.assign.choosePrompt")} <span className="font-semibold text-foreground">{group?.name}</span>
            </p>
            {eligibleMembers.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">{t("assistant.assign.noMembers")}</p>
            ) : (
              <div className="space-y-2">
                {eligibleMembers.map((m) => (
                  <motion.button
                    key={m.user_id}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => { setPickedUserId(m.user_id); setStep("configure"); }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/30 transition-all text-left"
                  >
                    <Avatar className="h-9 w-9">
                      {m.avatar_url && <AvatarImage src={m.avatar_url} />}
                      <AvatarFallback className="bg-secondary text-xs">
                        {(m.display_name ?? "?").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <p className="flex-1 text-sm font-semibold text-card-foreground truncate">{m.display_name ?? t("common.unknown")}</p>
                    <UserPlus className="h-4 w-4 text-muted-foreground" />
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <Card className="p-3 flex items-center gap-3 bg-primary/5 border-primary/20">
              <Avatar className="h-10 w-10">
                {pickedMember?.avatar_url && <AvatarImage src={pickedMember.avatar_url} />}
                <AvatarFallback className="bg-secondary text-sm">{(pickedMember?.display_name ?? "?").charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <p className="text-sm font-semibold text-card-foreground truncate">{pickedMember?.display_name ?? t("common.unknown")}</p>
            </Card>

            {/* Court count input */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-primary" /> {t("assistant.assign.courtsAvailable")}
              </p>
              <Input
                type="number" min={1} max={20} value={courtCount}
                onChange={e => { const n = Math.max(1, Math.min(20, parseInt(e.target.value) || 1)); setCourtCount(n); }}
                className="h-9 text-sm"
              />
            </div>

            {/* Court assignment */}
            <div>
              <p className="text-xs font-semibold text-foreground mb-2">{t("assistant.assign.assignCourts")}</p>
              <div className="flex flex-wrap gap-2">
                {courtOptions.map((court) => (
                  <button
                    key={court}
                    onClick={() => toggle(pickedCourts, court, setPickedCourts)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      pickedCourts.includes(court)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-muted-foreground border-border hover:border-primary/30"
                    }`}
                  >
                    {court}
                  </button>
                ))}
              </div>
            </div>

            {/* Permissions */}
            <div>
              <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-primary" /> {t("assistant.assign.permissions")}
              </p>
              <div className="space-y-2">
                {ALL_ASSISTANT_PERMISSIONS.map((perm) => (
                  <button
                    key={perm}
                    onClick={() => toggle(pickedPerms, perm, setPickedPerms)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs border transition-all ${
                      pickedPerms.includes(perm)
                        ? "bg-primary/10 border-primary/30 text-foreground"
                        : "bg-card border-border text-muted-foreground"
                    }`}
                  >
                    <span>{t(permLabelKey[perm])}</span>
                    {pickedPerms.includes(perm) && <Check className="h-3.5 w-3.5 text-primary" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setStep("select")} disabled={saving}>
                {t("common.back")}
              </Button>
              <Button
                className="flex-1 rounded-xl gap-1.5"
                disabled={saving || pickedCourts.length === 0 || pickedPerms.length === 0}
                onClick={handleConfirm}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {t("assistant.assign.confirm")}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AssignAssistantDialog;
