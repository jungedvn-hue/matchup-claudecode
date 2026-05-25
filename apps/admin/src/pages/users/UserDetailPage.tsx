import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Ban, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getActiveSuspension } from "@/lib/admin-users";
import SuspendUserDialog from "./SuspendUserDialog";
import UnsuspendUserDialog from "./UnsuspendUserDialog";
import SuspensionsHistoryTab from "./SuspensionsHistoryTab";

export default function UserDetailPage() {
  const { id = "" } = useParams();
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [unsuspendOpen, setUnsuspendOpen] = useState(false);

  // Use direct RPC for maximum visibility into errors
  const userQ = useQuery({
    queryKey: ["user-detail-raw", id],
    queryFn: async () => {
      const res = await supabase.rpc("admin_get_user", { p_user_id: id });
      return { data: res.data, error: res.error };
    },
    enabled: !!id,
    retry: false,
  });

  const suspensionQ = useQuery({
    queryKey: ["user-active-suspension", id],
    queryFn: () => getActiveSuspension(id),
    enabled: !!id,
    retry: false,
  });

  const row = Array.isArray(userQ.data?.data) ? userQ.data?.data[0] : userQ.data?.data;
  const rpcError = userQ.data?.error;
  const isSuspended = !!suspensionQ.data;

  return (
    <div className="space-y-4">
      <Link to="/users" className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>

      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-2">
        <h1 className="text-xl font-semibold text-slate-900">User detail</h1>
        <div className="text-xs text-slate-500 font-mono">URL id: {id || "(empty)"}</div>

        {userQ.isLoading && <div className="text-sm text-slate-500">Loading user…</div>}

        {userQ.error && (
          <div className="bg-red-50 border border-red-300 text-red-800 p-3 rounded text-sm space-y-1">
            <div className="font-semibold">Query failed</div>
            <pre className="text-xs whitespace-pre-wrap">{(userQ.error as any).message ?? String(userQ.error)}</pre>
          </div>
        )}

        {rpcError && (
          <div className="bg-amber-50 border border-amber-300 text-amber-900 p-3 rounded text-sm space-y-1">
            <div className="font-semibold">RPC returned error</div>
            <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(rpcError, null, 2)}</pre>
          </div>
        )}

        {!userQ.isLoading && !userQ.error && !rpcError && !row && (
          <div className="text-sm text-amber-700">No row returned (user_id may not exist).</div>
        )}

        {row && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-medium text-slate-900">
                  {row.display_name || row.email || row.phone || row.user_id?.slice(0, 8)}
                </div>
                <div className="text-xs text-slate-500">{row.email} · {row.phone}</div>
                {isSuspended ? (
                  <span className="inline-block mt-1 text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded">Suspended</span>
                ) : (
                  <span className="inline-block mt-1 text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">Active</span>
                )}
              </div>
              {isSuspended ? (
                <button onClick={() => setUnsuspendOpen(true)}
                  className="px-3 py-1.5 text-sm bg-brand text-white hover:bg-brand-dark rounded inline-flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" /> Unsuspend
                </button>
              ) : (
                <button onClick={() => setSuspendOpen(true)}
                  className="px-3 py-1.5 text-sm bg-red-600 text-white hover:bg-red-700 rounded inline-flex items-center gap-1.5">
                  <Ban className="w-4 h-4" /> Suspend
                </button>
              )}
            </div>

            <details className="text-xs">
              <summary className="cursor-pointer text-slate-600">Full row JSON</summary>
              <pre className="mt-2 p-3 bg-slate-50 rounded overflow-auto">{JSON.stringify(row, null, 2)}</pre>
            </details>
          </div>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <h2 className="text-base font-semibold text-slate-900 mb-3">Suspension history</h2>
        <SuspensionsHistoryTab userId={id} />
      </div>

      <SuspendUserDialog open={suspendOpen} onClose={() => setSuspendOpen(false)}
        userId={id} userLabel={row?.display_name || row?.email || id} />
      {suspensionQ.data && (
        <UnsuspendUserDialog open={unsuspendOpen} onClose={() => setUnsuspendOpen(false)}
          userId={id} suspensionId={suspensionQ.data.id} />
      )}
    </div>
  );
}
