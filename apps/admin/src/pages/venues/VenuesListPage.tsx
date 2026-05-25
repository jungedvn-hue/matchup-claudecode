import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { listVenues, type VerificationStatus } from "@/lib/admin-venues";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 25;
const STATUSES: (VerificationStatus | "")[] = ["", "pending", "verified", "rejected", "suspended"];

const STATUS_PILL: Record<string, string> = {
  pending:   "bg-amber-100 text-amber-800",
  verified:  "bg-green-100 text-green-700",
  rejected:  "bg-slate-200 text-slate-700",
  suspended: "bg-red-100 text-red-700",
};

export default function VenuesListPage() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<VerificationStatus | "">("pending");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-venues", status, search, page],
    queryFn: () => listVenues({
      status,
      search: search.trim() || undefined,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    }),
    retry: false,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">{t("venues.title")}</h1>
        <div className="text-sm text-slate-500">{data ? `${data.total} total` : ""}</div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {STATUSES.map(s => (
          <button key={s || "all"}
            onClick={() => { setStatus(s); setPage(0); }}
            className={cn(
              "px-3 py-1.5 rounded text-sm border",
              status === s
                ? "border-brand bg-brand/10 text-brand-dark font-medium"
                : "border-slate-300 text-slate-600 hover:bg-slate-50"
            )}>
            {s ? t(`venues.status_${s}`) : t("venues.status_all")}
          </button>
        ))}
        <input type="text" value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          placeholder={t("venues.search_placeholder")}
          className="flex-1 min-w-[200px] border border-slate-300 rounded-md px-3 py-1.5 text-sm" />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm">
          {(error as any).message}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium">{t("venues.name")}</th>
              <th className="text-left px-4 py-2.5 font-medium">{t("venues.owner")}</th>
              <th className="text-left px-4 py-2.5 font-medium">{t("venues.location")}</th>
              <th className="text-left px-4 py-2.5 font-medium">{t("venues.courts")}</th>
              <th className="text-left px-4 py-2.5 font-medium">{t("venues.commission")}</th>
              <th className="text-left px-4 py-2.5 font-medium">Status</th>
              <th className="text-left px-4 py-2.5 font-medium">{t("venues.created")}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-500">{t("venues.loading")}</td></tr>
            )}
            {!isLoading && data?.rows.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-500">{t("venues.empty")}</td></tr>
            )}
            {data?.rows.map(v => (
              <tr key={v.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-2.5">
                  <Link to={`/venues/${v.id}`} className="text-slate-900 hover:text-brand-dark hover:underline">
                    {v.name}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-slate-700">
                  {v.owner_display_name ?? v.owner_email ?? "—"}
                </td>
                <td className="px-4 py-2.5 text-slate-700">{v.location ?? "—"}</td>
                <td className="px-4 py-2.5 text-slate-700">{v.court_count}</td>
                <td className="px-4 py-2.5 text-slate-700">
                  {v.commission_rate != null ? `${(v.commission_rate * 100).toFixed(1)}%` : "—"}
                </td>
                <td className="px-4 py-2.5">
                  <span className={cn("text-xs px-2 py-0.5 rounded", STATUS_PILL[v.verification_status] ?? "bg-slate-100")}>
                    {t(`venues.status_${v.verification_status}`)}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-slate-500">
                  {new Date(v.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
          className="px-3 py-1.5 border border-slate-300 rounded disabled:opacity-50">Previous</button>
        <span className="text-slate-500">Page {page + 1}</span>
        <button disabled={!data || (page + 1) * PAGE_SIZE >= data.total}
          onClick={() => setPage(p => p + 1)}
          className="px-3 py-1.5 border border-slate-300 rounded disabled:opacity-50">Next</button>
      </div>
    </div>
  );
}
