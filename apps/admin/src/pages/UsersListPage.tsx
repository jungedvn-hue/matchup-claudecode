import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { searchUsers } from "@/lib/admin-users";
import { maskEmail, maskPhone } from "@/lib/utils";

const PAGE_SIZE = 25;

export default function UsersListPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-users", search, page],
    queryFn: () =>
      searchUsers({
        search: search.trim() || undefined,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      }),
  });

  const toggleReveal = (id: string) =>
    setRevealed(r => ({ ...r, [id]: !r[id] }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">{t("users.title")}</h1>
        <div className="text-sm text-slate-500">
          {data ? `${data.total} total` : ""}
        </div>
      </div>

      <input type="text" value={search}
        onChange={e => { setSearch(e.target.value); setPage(0); }}
        placeholder={t("users.search_placeholder")}
        className="w-full max-w-md border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm">
          {(error as any).message ?? "Failed to load users"}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium">Name</th>
              <th className="text-left px-4 py-2.5 font-medium">{t("users.phone")}</th>
              <th className="text-left px-4 py-2.5 font-medium">{t("users.email")}</th>
              <th className="text-left px-4 py-2.5 font-medium">{t("users.joined")}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-500">{t("users.loading")}</td></tr>
            )}
            {!isLoading && data?.rows.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-500">{t("users.empty")}</td></tr>
            )}
            {data?.rows.map(u => (
              <tr key={u.user_id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-2.5">
                  <Link to={`/users/${u.user_id}`}
                    className="text-slate-900 hover:text-brand-dark hover:underline">
                    {u.display_name ?? u.email ?? u.phone ?? u.user_id.slice(0, 8)}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-slate-700">
                  {revealed[u.user_id] ? (u.phone ?? "—") : maskPhone(u.phone)}{" "}
                  {u.phone && (
                    <button onClick={() => toggleReveal(u.user_id)}
                      className="ml-1 text-xs text-brand hover:underline">
                      {t("users.reveal")}
                    </button>
                  )}
                </td>
                <td className="px-4 py-2.5 text-slate-700">
                  {revealed[u.user_id] ? (u.email ?? "—") : maskEmail(u.email)}
                </td>
                <td className="px-4 py-2.5 text-slate-500">
                  {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
          className="px-3 py-1.5 border border-slate-300 rounded disabled:opacity-50">
          {t("users.prev")}
        </button>
        <span className="text-slate-500">{t("users.page", { n: page + 1 })}</span>
        <button disabled={!data || (page + 1) * PAGE_SIZE >= data.total}
          onClick={() => setPage(p => p + 1)}
          className="px-3 py-1.5 border border-slate-300 rounded disabled:opacity-50">
          {t("users.next")}
        </button>
      </div>
    </div>
  );
}
