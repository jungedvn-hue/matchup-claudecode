import { useTranslation } from "react-i18next";
import { LogOut, Globe } from "lucide-react";
import { useAdminAuth } from "@/auth/AdminAuthProvider";

export default function Topbar() {
  const { t, i18n } = useTranslation();
  const { user, adminRow, signOut } = useAdminAuth();

  const toggleLang = () => i18n.changeLanguage(i18n.language === "vi" ? "en" : "vi");

  return (
    <header className="h-14 border-b border-slate-200 bg-white flex items-center px-6 gap-4">
      <div className="flex-1" />
      <button onClick={toggleLang}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded">
        <Globe className="w-4 h-4" />
        <span className="uppercase">{i18n.language}</span>
      </button>
      <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
        <div className="text-right">
          <div className="text-sm font-medium text-slate-900">{user?.email}</div>
          <div className="text-xs text-slate-500">{adminRow?.role}</div>
        </div>
        <button onClick={signOut}
          className="p-2 text-slate-600 hover:bg-slate-100 rounded" title={t("common.logout")}>
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
