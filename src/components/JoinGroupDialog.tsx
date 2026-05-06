import React, { useState } from "react";
import { motion } from "framer-motion";
import { Users, MapPin, Navigation, CheckCircle2, MessageSquare } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import SkillBadge from "@/components/SkillBadge";
import { Group } from "@/data/groups";
import { useLanguage } from "@/i18n/LanguageContext";

interface JoinGroupDialogProps {
  group: Group | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onJoin: (groupId: string, message?: string) => void;
  mode: "join" | "request";
}

const JoinGroupDialog = ({ group, open, onOpenChange, onJoin, mode }: JoinGroupDialogProps) => {
  const { t } = useLanguage();
  const [step, setStep] = useState<"info" | "message" | "success">("info");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = () => {
    setLoading(true);
    setTimeout(() => {
      onJoin(group!.id, mode === "request" ? message : undefined);
      setStep("success");
      setLoading(false);
    }, 800);
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setStep("info");
      setMessage("");
    }, 300);
  };

  if (!group) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm mx-auto rounded-2xl p-0 overflow-hidden">
        {step === "success" ? (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="p-6 text-center space-y-3"
          >
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-display font-bold text-foreground">
              {mode === "join" ? t("join.joined") : t("join.requested")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {(mode === "join" ? t("join.joinedDesc") : t("join.requestedDesc")).replace("{name}", group.name)}
            </p>
            <Button onClick={handleClose} className="w-full rounded-xl mt-2">
              {t("join.awesome")}
            </Button>
          </motion.div>
        ) : (
          <>
            <div className="h-2 bg-gradient-to-r from-primary to-accent" />
            <div className="p-5 space-y-4">
              <DialogHeader className="space-y-0">
                <div className="flex items-center gap-3">
                  <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center text-2xl shrink-0">
                    {group.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <DialogTitle className="text-base font-display font-bold text-foreground text-left">
                      {group.name}
                    </DialogTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <SkillBadge level={group.skill} />
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <Navigation className="h-2.5 w-2.5" /> {group.distance}
                      </span>
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <p className="text-xs text-muted-foreground leading-relaxed">{group.description}</p>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-secondary">
                  <Users className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">{group.members}</p>
                    <p className="text-[10px] text-muted-foreground">{t("common.members")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-secondary">
                  <MapPin className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-xs font-semibold text-foreground truncate">{group.location}</p>
                    <p className="text-[10px] text-muted-foreground">{group.courtName}</p>
                  </div>
                </div>
              </div>

              {mode === "request" && step === "message" ? (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                  <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5" /> {t("join.messageLabel")}
                  </label>
                  <Textarea
                    placeholder={t("join.messagePh")}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="rounded-xl text-sm min-h-[80px] resize-none"
                    autoFocus
                  />
                </motion.div>
              ) : null}

              <div className="flex gap-2 pt-1">
                <Button variant="outline" onClick={handleClose} className="flex-1 rounded-xl">
                  {t("common.cancel")}
                </Button>
                <Button
                  onClick={() => {
                    if (mode === "request" && step === "info") {
                      setStep("message");
                    } else {
                      handleSubmit();
                    }
                  }}
                  disabled={loading}
                  className="flex-1 rounded-xl"
                >
                  {loading
                    ? t("common.processing")
                    : mode === "join"
                    ? t("join.joinNow")
                    : step === "info"
                    ? t("join.continue")
                    : t("join.sendRequest")}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default JoinGroupDialog;
