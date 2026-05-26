import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Shield } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { LEGAL_VERSION } from "@/pages/legal/legalContent";

// Gates Health Hub behind explicit consent to process sensitive health data
// (Decree 13/2023/ND-CP Art. 2.4 / 11). Renders children only after the user
// has an active health_data_consent row.
const HealthConsentGate = ({ children }: { children: ReactNode }) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [consented, setConsented] = useState(false);
  const [dataOk, setDataOk] = useState(true);
  const [aiOk, setAiOk] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) { setChecking(false); return; }
      const { data } = await supabase
        .from("health_consents")
        .select("health_data_consent, withdrawn_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const ok = !!data && data.health_data_consent === true && !data.withdrawn_at;
      setConsented(ok);
      setChecking(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const handleAccept = async () => {
    if (!user || !dataOk) return;
    setSaving(true);
    const { error } = await supabase
      .from("health_consents")
      .upsert(
        {
          user_id: user.id,
          health_data_consent: dataOk,
          ai_analysis_consent: aiOk,
          consent_version: LEGAL_VERSION,
          consented_at: new Date().toISOString(),
          withdrawn_at: null,
        },
        { onConflict: "user_id" },
      );
    setSaving(false);
    if (!error) setConsented(true);
  };

  const handleDecline = () => navigate(-1);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (consented) return <>{children}</>;

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            {t("health.consent.title")}
          </DialogTitle>
          <DialogDescription className="text-[13px] leading-relaxed">
            {t("health.consent.intro")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dataOk}
              onChange={(e) => setDataOk(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border accent-primary shrink-0"
            />
            <span className="text-[13px] leading-snug text-foreground">{t("health.consent.dataLabel")}</span>
          </label>

          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={aiOk}
              onChange={(e) => setAiOk(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border accent-primary shrink-0"
            />
            <span className="text-[13px] leading-snug text-foreground">{t("health.consent.aiLabel")}</span>
          </label>

          <p className="text-[11px] text-muted-foreground leading-relaxed pt-1">
            {t("health.consent.disclaimer")}
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" className="rounded-xl" onClick={handleDecline} disabled={saving}>
            {t("health.consent.decline")}
          </Button>
          <Button
            className="rounded-xl"
            onClick={handleAccept}
            disabled={saving || !dataOk}
          >
            {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            {t("health.consent.accept")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default HealthConsentGate;
