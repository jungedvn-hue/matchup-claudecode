import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import type { AppRole } from "@/hooks/use-roles";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

type ApplicableRole = Exclude<AppRole, "master" | "player">;

const ROLE_META: Record<ApplicableRole, { titleKey: string; descKey: string; needsBusiness: boolean }> = {
  host: { titleKey: "apply.hostTitle", descKey: "apply.hostDesc", needsBusiness: false },
  court_owner: { titleKey: "apply.courtOwnerTitle", descKey: "apply.courtOwnerDesc", needsBusiness: true },
  store_owner: { titleKey: "apply.storeOwnerTitle", descKey: "apply.storeOwnerDesc", needsBusiness: true },
  referee: { titleKey: "apply.refereeTitle", descKey: "apply.refereeDesc", needsBusiness: false },
};

interface Props {
  role: ApplicableRole | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitted?: () => void;
}

const ApplyRoleDialog: React.FC<Props> = ({ role, open, onOpenChange, onSubmitted }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [reason, setReason] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!role) return null;
  const meta = ROLE_META[role];

  const reset = () => {
    setReason("");
    setBusinessName("");
    setTaxId("");
    setAddress("");
  };

  const submit = async () => {
    if (!user) return;
    if (reason.trim().length < 10) {
      toast({ title: t("apply.reasonTooShort"), description: t("apply.reasonTooShortDesc"), variant: "destructive" });
      return;
    }
    if (meta.needsBusiness && !businessName.trim()) {
      toast({ title: t("apply.missingInfo"), description: t("apply.missingBizName"), variant: "destructive" });
      return;
    }

    setSubmitting(true);
    const business_info = meta.needsBusiness
      ? { business_name: businessName.trim(), tax_id: taxId.trim(), address: address.trim() }
      : null;

    const { error } = await supabase.from("role_applications").insert({
      user_id: user.id,
      requested_role: role,
      reason: reason.trim(),
      business_info,
    });

    setSubmitting(false);
    if (error) {
      const msg = error.message?.includes("uniq_pending_application")
        ? t("apply.pendingError")
        : error.message;
      toast({ title: t("apply.submitError"), description: msg, variant: "destructive" });
      return;
    }

    toast({ title: t("apply.success"), description: t("apply.successDesc") });
    reset();
    onOpenChange(false);
    onSubmitted?.();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t(meta.titleKey)}</DialogTitle>
          <DialogDescription>{t(meta.descKey)}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="reason">{t("apply.reasonLabel")} <span className="text-destructive">*</span></Label>
            <Textarea
              id="reason"
              placeholder="Mô tả ngắn về kinh nghiệm, mục đích sử dụng vai trò này..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>

          {meta.needsBusiness && (
            <>
              <div className="space-y-2">
                <Label htmlFor="biz">{t("apply.bizName")} <span className="text-destructive">*</span></Label>
                <Input id="biz" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tax">{t("apply.taxId")}</Label>
                <Input id="tax" value={taxId} onChange={(e) => setTaxId(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="addr">{t("apply.address")}</Label>
                <Input id="addr" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            {t("common.cancel")}
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {t("apply.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ApplyRoleDialog;
