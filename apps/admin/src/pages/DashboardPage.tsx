import { useTranslation } from "react-i18next";

export default function DashboardPage() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">{t("dashboard.title")}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {["DAU", "GMV", "Bookings", "New users"].map(k => (
          <div key={k} className="bg-white border border-slate-200 rounded-lg p-5">
            <div className="text-xs text-slate-500 uppercase tracking-wide">{k}</div>
            <div className="text-2xl font-semibold text-slate-900 mt-1">—</div>
            <div className="text-xs text-slate-400 mt-1">{t("dashboard.coming_soon")}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
