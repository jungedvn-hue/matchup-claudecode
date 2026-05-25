import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { OTPInput } from "input-otp";
import { supabase } from "@/lib/supabase";
import { useAdminAuth } from "./AdminAuthProvider";

export default function MfaEnrollPage() {
  const { t } = useTranslation();
  const { setMfaSatisfied, refreshAdmin } = useAdminAuth();
  const [qr, setQr] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      // Clean up any old unverified factors first to avoid stale QR codes
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const stale = factors?.all?.filter(f => f.status === "unverified") ?? [];
      for (const f of stale) {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
      if (error) { setError(error.message); return; }
      setQr(data.totp.qr_code);
      setFactorId(data.id);
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
    // Mark admin_users.mfa_enrolled = true
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("admin_users")
        .update({ mfa_enrolled: true })
        .eq("user_id", user.id);
    }
    await refreshAdmin();
    setMfaSatisfied(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white shadow rounded-lg p-8 space-y-5">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{t("auth.mfa_enroll_title")}</h1>
          <p className="text-sm text-slate-500 mt-1">{t("auth.mfa_enroll_help")}</p>
        </div>
        {qr ? (
          <div className="flex justify-center">
            <img src={qr} alt="TOTP QR" className="w-48 h-48 border border-slate-200 rounded" />
          </div>
        ) : <div className="text-sm text-slate-500">…</div>}
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
          {t("auth.mfa_enroll")}
        </button>
      </div>
    </div>
  );
}
