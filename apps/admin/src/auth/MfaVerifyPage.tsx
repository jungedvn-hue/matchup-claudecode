import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { OTPInput } from "input-otp";
import { supabase } from "@/lib/supabase";
import { useAdminAuth } from "./AdminAuthProvider";

export default function MfaVerifyPage() {
  const { t } = useTranslation();
  const { setMfaSatisfied } = useAdminAuth();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) { setError(error.message); return; }
      const totp = data?.totp?.find(f => f.status === "verified") ?? data?.totp?.[0];
      if (totp) setFactorId(totp.id);
      else setError("No TOTP factor enrolled");
    })();
  }, []);

  const onVerify = async () => {
    if (!factorId) return;
    setBusy(true); setError(null);
    const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({ factorId });
    if (cErr || !challenge) { setBusy(false); setError(cErr?.message ?? "challenge failed"); return; }
    const { error: vErr } = await supabase.auth.mfa.verify({
      factorId, challengeId: challenge.id, code,
    });
    setBusy(false);
    if (vErr) { setError(vErr.message); return; }
    setMfaSatisfied(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white shadow rounded-lg p-8 space-y-5">
        <h1 className="text-xl font-semibold text-slate-900">{t("auth.mfa_verify_title")}</h1>
        <p className="text-sm text-slate-500">{t("auth.mfa_required")}</p>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t("auth.mfa_code")}</label>
          <OTPInput maxLength={6} value={code} onChange={setCode}
            containerClassName="flex gap-2"
            render={({ slots }) => (
              <>
                {slots.map((s, i) => (
                  <div key={i} className="w-10 h-12 border border-slate-300 rounded flex items-center justify-center text-lg font-mono">
                    {s.char}
                  </div>
                ))}
              </>
            )} />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button onClick={onVerify} disabled={busy || code.length !== 6}
          className="w-full bg-brand hover:bg-brand-dark text-white font-medium rounded-md py-2.5 disabled:opacity-60">
          {t("auth.mfa_verify")}
        </button>
      </div>
    </div>
  );
}
