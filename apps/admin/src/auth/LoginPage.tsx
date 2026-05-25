import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) { setError(t("auth.wrong_credentials")); return; }
    // After sign in, root router will redirect based on MFA / admin status
    nav("/", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <form onSubmit={onSubmit} className="w-full max-w-md bg-white shadow rounded-lg p-8 space-y-5">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{t("app.name")}</h1>
          <p className="text-sm text-slate-500 mt-1">{t("auth.login_title")}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t("auth.email")}</label>
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
            className="w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t("auth.password")}</label>
          <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
            className="w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand" />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={loading}
          className="w-full bg-brand hover:bg-brand-dark text-white font-medium rounded-md py-2.5 disabled:opacity-60">
          {loading ? t("auth.signing_in") : t("auth.sign_in")}
        </button>
      </form>
    </div>
  );
}
