import { useState } from "react";
import { motion } from "framer-motion";
import { UserPlus, Check, Shield, MapPin } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  AssistantPermission,
  assistantPermissionLabels,
  availableMembers,
} from "@/data/events";
import { Group, GroupAssistant } from "@/data/groups";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";

interface AssignAssistantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: Group;
  onAssign: (assistant: GroupAssistant) => void;
}

const allPermissions: AssistantPermission[] = ["check_in", "approve_tickets", "manage_players", "view_stats"];

const AssignAssistantDialog = ({ open, onOpenChange, group, onAssign }: AssignAssistantDialogProps) => {
  const { t } = useLanguage();
  const [step, setStep] = useState<"select" | "configure">("select");
  const [selectedMember, setSelectedMember] = useState<typeof availableMembers[0] | null>(null);
  const [selectedCourts, setSelectedCourts] = useState<string[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<AssistantPermission[]>(["check_in"]);

  // Parse court count from courtName like "Sunset Park Courts (4 sân)"
  const courtMatch = group.courtName.match(/\((\d+)\s*sân\)/);
  const courtCount = courtMatch ? parseInt(courtMatch[1]) : 2;
  const courtOptions = Array.from({ length: courtCount }, (_, i) => t("assistant.checkin.court", { n: i + 1 }));

  const existingAssistantIds = group.assistants.map((a) => a.id);
  const filteredMembers = availableMembers.filter((m) => !existingAssistantIds.includes(m.id));

  const toggleCourt = (court: string) => {
    setSelectedCourts((prev) =>
      prev.includes(court) ? prev.filter((c) => c !== court) : [...prev, court]
    );
  };

  const togglePermission = (perm: AssistantPermission) => {
    setSelectedPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const handleAssign = () => {
    if (!selectedMember || selectedCourts.length === 0 || selectedPermissions.length === 0) return;
    const assistant: GroupAssistant = {
      id: selectedMember.id,
      groupId: group.id,
      name: selectedMember.name,
      avatar: selectedMember.avatar,
      phone: selectedMember.phone,
      assignedCourts: selectedCourts,
      permissions: selectedPermissions,
      assignedAt: t("assistant.assign.justNow"),
    };
    onAssign(assistant);
    toast({
      title: t("assistant.assign.toast.assigned", { name: selectedMember.name }),
      description: t("assistant.assign.toast.assignedDesc", { courts: selectedCourts.join(", "), group: group.name }),
    });
    resetAndClose();
  };

  const resetAndClose = () => {
    setStep("select");
    setSelectedMember(null);
    setSelectedCourts([]);
    setSelectedPermissions(["check_in"]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="max-w-sm rounded-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            {step === "select" ? t("assistant.assign.title.select") : t("assistant.assign.title.assign")}
          </DialogTitle>
        </DialogHeader>

        {step === "select" ? (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              {t("assistant.assign.choosePrompt")} <span className="font-semibold text-foreground">{group.name}</span>
            </p>
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary/5 border border-primary/10">
              <MapPin className="h-3 w-3 text-primary" />
              <p className="text-[10px] text-muted-foreground">{group.courtName}</p>
            </div>
            {filteredMembers.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">{t("assistant.assign.noMembers")}</p>
            ) : (
              <div className="space-y-2">
                {filteredMembers.map((member) => (
                  <motion.button
                    key={member.id}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      setSelectedMember(member);
                      setStep("configure");
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/30 transition-all text-left"
                  >
                    <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-lg">
                      {member.avatar}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-card-foreground">{member.name}</p>
                      <p className="text-[10px] text-muted-foreground">{member.phone}</p>
                    </div>
                    <UserPlus className="h-4 w-4 text-muted-foreground" />
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Selected member */}
            <Card className="p-3 flex items-center gap-3 bg-primary/5 border-primary/20">
              <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-lg">
                {selectedMember?.avatar}
              </div>
              <div>
                <p className="text-sm font-semibold text-card-foreground">{selectedMember?.name}</p>
                <p className="text-[10px] text-muted-foreground">{selectedMember?.phone}</p>
              </div>
            </Card>

            {/* Group info */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-secondary/50">
              <span className="text-sm">{group.emoji}</span>
              <p className="text-[10px] font-medium text-foreground">{group.name}</p>
              <span className="text-[9px] text-muted-foreground">· {t("assistant.assign.fixedAssistant")}</span>
            </div>

            {/* Court assignment */}
            <div>
              <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-primary" /> {t("assistant.assign.assignCourts")}
              </p>
              <div className="flex flex-wrap gap-2">
                {courtOptions.map((court) => (
                  <button
                    key={court}
                    onClick={() => toggleCourt(court)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      selectedCourts.includes(court)
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
                {allPermissions.map((perm) => (
                  <button
                    key={perm}
                    onClick={() => togglePermission(perm)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs border transition-all ${
                      selectedPermissions.includes(perm)
                        ? "bg-primary/10 border-primary/30 text-foreground"
                        : "bg-card border-border text-muted-foreground"
                    }`}
                  >
                    <span>{assistantPermissionLabels[perm]}</span>
                    {selectedPermissions.includes(perm) && <Check className="h-3.5 w-3.5 text-primary" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setStep("select")}>
                {t("assistant.assign.back")}
              </Button>
              <Button
                className="flex-1 rounded-xl gap-1.5"
                disabled={selectedCourts.length === 0 || selectedPermissions.length === 0}
                onClick={handleAssign}
              >
                <Check className="h-4 w-4" /> {t("assistant.assign.confirm")}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AssignAssistantDialog;
