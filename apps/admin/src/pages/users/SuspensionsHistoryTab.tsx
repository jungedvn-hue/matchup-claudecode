import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { getSuspensionsHistory } from "@/lib/admin-users";

export default function SuspensionsHistoryTab({ userId }: { userId: string }) {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ["user-suspensions", userId],
    queryFn: () => getSuspensionsHistory(userId),
  });

  if (isLoading) return <div className="text-slate-500 text-sm">{t("users.loading")}</div>;
  if (!data || data.length === 0) {
    return <div className="text-slate-500 text-sm">{t("suspensions.empty")}</div>;
  }

  const statusOf = (s: any) => {
    if (s.lifted_at) return { key: "lifted", color: "bg-slate-100 text-slate-600" };
    if (s.expires_at && new Date(s.expires_at) < new Date())
      return { key: "expired", color: "bg-slate-100 text-slate-600" };
    return { key: "active", color: "bg-red-100 text-red-700" };
  };

  return (
    <div className="space-y-3">
      {data.map(s => {
        const st = statusOf(s);
        return (
          <div key={s.id} className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <span className={`inline-block text-xs px-2 py-0.5 rounded ${st.color}`}>
                  {t(`suspensions.${st.key}`)}
                </span>
                <span className="ml-2 text-sm font-medium text-slate-900">{s.reason_code}</span>
              </div>
              <span className="text-xs text-slate-500">
                {new Date(s.suspended_at).toLocaleString()}
              </span>
            </div>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{s.reason}</p>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-500">
              {s.expires_at && (
                <>
                  <dt>{t("suspensions.expires_at")}</dt>
                  <dd>{new Date(s.expires_at).toLocaleString()}</dd>
                </>
              )}
              {s.lifted_at && (
                <>
                  <dt>{t("suspensions.lifted_at")}</dt>
                  <dd>{new Date(s.lifted_at).toLocaleString()}</dd>
                  <dt>{t("suspensions.lift_reason")}</dt>
                  <dd className="text-slate-700">{s.lift_reason ?? "—"}</dd>
                </>
              )}
            </dl>
          </div>
        );
      })}
    </div>
  );
}
