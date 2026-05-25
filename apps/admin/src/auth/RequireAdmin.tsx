import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useAdminAuth } from "./AdminAuthProvider";
import LoginPage from "./LoginPage";
import MfaEnrollPage from "./MfaEnrollPage";
import MfaVerifyPage from "./MfaVerifyPage";

// Default OFF in production until MFA debug; flip to true to re-enable.
const MFA_REQUIRED = import.meta.env.VITE_ADMIN_REQUIRE_MFA === "true";

export default function RequireAdmin({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { loading, session, adminRow, mfaSatisfied } = useAdminAuth();

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center text-slate-500 p-4">
        <div className="text-center space-y-2">
          <div>Loading admin session…</div>
          <button onClick={() => location.reload()}
            className="text-xs text-brand hover:underline">Reload</button>
        </div>
      </div>
    );
  }
  if (!session) return <LoginPage />;
  if (!adminRow || adminRow.status !== "active") {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <div className="max-w-md text-center space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">403</h2>
          <p className="text-slate-600">{t("auth.not_admin")}</p>
        </div>
      </div>
    );
  }
  if (MFA_REQUIRED) {
    if (!adminRow.mfa_enrolled) return <MfaEnrollPage />;
    if (!mfaSatisfied) return <MfaVerifyPage />;
  }

  return <>{children}</>;
}
