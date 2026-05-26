import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Activity, AlertTriangle, CheckCircle2, RefreshCw, PlayCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────
type Metric = {
  id: number;
  metric_key: string;
  value_num: number | null;
  limit_num: number | null;
  pct_used: number | null;
  unit: string | null;
  meta: Record<string, unknown> | null;
  collected_at: string;
};

type Alert = {
  id: number;
  metric_key: string;
  severity: "warn" | "critical";
  pct_used: number | null;
  value_num: number | null;
  limit_num: number | null;
  message: string;
  triggered_at: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────
const fmtBytes = (n: number | null) => {
  if (n == null) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0; let v = n;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(1)} ${units[i]}`;
};

const fmtMetric = (m: Metric): string => {
  if (m.unit === "bytes")   return `${fmtBytes(m.value_num)} / ${fmtBytes(m.limit_num)}`;
  if (m.unit === "count")   return `${(m.value_num ?? 0).toLocaleString()} / ${(m.limit_num ?? 0).toLocaleString()}`;
  if (m.unit === "days")    return `${m.value_num ?? "—"} days`;
  if (m.unit === "percent") return `${(m.value_num ?? 0).toFixed(2)}%`;
  return `${m.value_num ?? "—"}`;
};

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const severityColor = (s: string) => s === "critical" ? "text-red-600 bg-red-50 border-red-200" : "text-amber-600 bg-amber-50 border-amber-200";
const barColor      = (pct: number | null, unit?: string | null) => {
  if (unit === "days")    return (pct ?? 0) <= 14 ? "bg-red-500" : (pct ?? 0) <= 60 ? "bg-amber-500" : "bg-emerald-500";
  if (unit === "percent") return (pct ?? 100) <= 95 ? "bg-red-500" : (pct ?? 100) <= 99 ? "bg-amber-500" : "bg-emerald-500";
  if (pct == null) return "bg-slate-300";
  if (pct >= 90) return "bg-red-500";
  if (pct >= 70) return "bg-amber-500";
  return "bg-emerald-500";
};

const labelFor = (key: string, t: (k: string) => string): string => {
  if (key.startsWith("domain.expiry_days.")) {
    return `${t("platform_health.metric_label.domain.expiry_days")}: ${key.replace("domain.expiry_days.", "")}`;
  }
  const tr = t(`platform_health.metric_label.${key}`);
  return tr.startsWith("platform_health.") ? key : tr;
};

// ─── Sparkline (pure SVG, no deps) ────────────────────────────────────
function Sparkline({ data, color = "#0ea5e9" }: { data: number[]; color?: string }) {
  if (data.length === 0) return null;
  const w = 120, h = 28, pad = 2;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const stepX = (w - pad * 2) / Math.max(data.length - 1, 1);
  const points = data.map((v, i) => {
    const x = pad + i * stepX;
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return (
    <svg width={w} height={h} className="opacity-70">
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={points} />
    </svg>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────
const POLL_FN_URL = `${(import.meta.env.VITE_SUPABASE_URL as string) || "https://yinmmgcqduvhtwmqoujj.supabase.co"}/functions/v1/poll-platform-metrics`;

export default function PlatformHealthPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [triggering, setTriggering] = useState(false);

  // ── Latest metric per key (since 30 days back) ──
  const metricsQ = useQuery({
    queryKey: ["platform-metrics"],
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
      const { data, error } = await supabase
        .from("platform_metrics")
        .select("*")
        .gte("collected_at", since)
        .order("collected_at", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as Metric[];
    },
    refetchInterval: 60_000,
  });

  const alertsOpenQ = useQuery({
    queryKey: ["platform-alerts", "open"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_alerts")
        .select("*")
        .is("resolved_at", null)
        .order("triggered_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Alert[];
    },
    refetchInterval: 60_000,
  });

  const alertsHistoryQ = useQuery({
    queryKey: ["platform-alerts", "history"],
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
      const { data, error } = await supabase
        .from("platform_alerts")
        .select("*")
        .gte("triggered_at", since)
        .order("triggered_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as Alert[];
    },
  });

  const ackMut = useMutation({
    mutationFn: async (alertId: number) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.rpc as any)("ack_platform_alert", { p_alert_id: alertId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform-alerts"] });
      toast.success("Acknowledged");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Group metrics by key, latest + sparkline series ──
  const byKey = useMemo(() => {
    const map = new Map<string, Metric[]>();
    for (const m of metricsQ.data ?? []) {
      const arr = map.get(m.metric_key) ?? [];
      arr.push(m);
      map.set(m.metric_key, arr);
    }
    return map;
  }, [metricsQ.data]);

  const latestPoll = useMemo(() => {
    const all = metricsQ.data ?? [];
    if (all.length === 0) return null;
    return all.reduce((max, m) => m.collected_at > max ? m.collected_at : max, all[0].collected_at);
  }, [metricsQ.data]);

  const summary = useMemo(() => {
    const open = alertsOpenQ.data ?? [];
    return {
      critical: open.filter(a => a.severity === "critical").length,
      warn:     open.filter(a => a.severity === "warn").length,
    };
  }, [alertsOpenQ.data]);

  // ── Manual trigger of poll function ──
  const triggerPoll = async () => {
    setTriggering(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(POLL_FN_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session?.access_token ?? ""}`,
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success(t("platform_health.refresh"));
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["platform-metrics"] }),
        qc.invalidateQueries({ queryKey: ["platform-alerts"] }),
      ]);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setTriggering(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
            <Activity className="h-5 w-5 text-sky-600" />
            {t("platform_health.title")}
          </h1>
          <p className="text-sm text-slate-500 mt-1">{t("platform_health.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { qc.invalidateQueries({ queryKey: ["platform-metrics"] }); qc.invalidateQueries({ queryKey: ["platform-alerts"] }); }}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-3.5 w-3.5" /> {t("platform_health.refresh")}
          </button>
          <button
            onClick={triggerPoll}
            disabled={triggering}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-slate-900 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          >
            <PlayCircle className="h-3.5 w-3.5" /> {triggering ? "..." : t("platform_health.trigger_poll")}
          </button>
        </div>
      </div>

      {/* Summary banner */}
      <div className={`rounded-lg border p-4 flex items-center gap-3 ${summary.critical > 0 ? "bg-red-50 border-red-200" : summary.warn > 0 ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200"}`}>
        {summary.critical > 0 || summary.warn > 0
          ? <AlertTriangle className={`h-5 w-5 ${summary.critical > 0 ? "text-red-600" : "text-amber-600"}`} />
          : <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
        <div className="flex-1">
          <p className={`text-sm font-semibold ${summary.critical > 0 ? "text-red-900" : summary.warn > 0 ? "text-amber-900" : "text-emerald-900"}`}>
            {summary.critical > 0 && t("platform_health.summary_critical", { count: summary.critical })}
            {summary.critical > 0 && summary.warn > 0 && " · "}
            {summary.warn > 0 && t("platform_health.summary_warn", { count: summary.warn })}
            {summary.critical === 0 && summary.warn === 0 && t("platform_health.summary_ok")}
          </p>
          {latestPoll && (
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
              <Clock className="h-3 w-3" /> {t("platform_health.last_poll", { ago: timeAgo(latestPoll) })}
            </p>
          )}
        </div>
      </div>

      {/* Active alerts */}
      {(alertsOpenQ.data?.length ?? 0) > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-700 mb-2">{t("platform_health.alerts_open")}</h2>
          <div className="space-y-2">
            {alertsOpenQ.data!.map(a => (
              <div key={a.id} className={`flex items-center gap-3 p-3 rounded-lg border ${severityColor(a.severity)}`}>
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{a.message}</p>
                  <p className="text-[11px] opacity-70 mt-0.5">{timeAgo(a.triggered_at)} · {a.metric_key}</p>
                </div>
                {a.acknowledged_at ? (
                  <span className="text-xs font-medium px-2 py-1 rounded bg-white/70">{t("platform_health.acked")}</span>
                ) : (
                  <button
                    onClick={() => ackMut.mutate(a.id)}
                    disabled={ackMut.isPending}
                    className="text-xs font-medium px-2.5 py-1 rounded bg-white border border-current hover:bg-white/80"
                  >
                    {t("platform_health.ack")}
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Metrics grid */}
      <section>
        <h2 className="text-sm font-semibold text-slate-700 mb-2">{t("platform_health.metrics")}</h2>
        {byKey.size === 0 ? (
          <div className="text-sm text-slate-500 bg-slate-50 border border-dashed border-slate-300 rounded-lg p-6 text-center">
            {t("platform_health.no_data")}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from(byKey.entries()).map(([key, samples]) => {
              const latest = samples[0];
              const series = samples.slice(0, 60).reverse().map(s => Number(s.pct_used ?? s.value_num ?? 0));
              const pct = latest.pct_used != null ? Math.min(100, Math.max(0, latest.pct_used)) : null;
              return (
                <div key={key} className="bg-white border border-slate-200 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-xs font-semibold text-slate-700">{labelFor(key, t)}</p>
                    <Sparkline data={series} />
                  </div>
                  <p className="text-lg font-semibold text-slate-900 tabular-nums">{fmtMetric(latest)}</p>
                  {pct != null && (
                    <>
                      <div className="h-1.5 w-full rounded-full bg-slate-100 mt-2 overflow-hidden">
                        <div className={`h-full ${barColor(pct, latest.unit)}`} style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1 tabular-nums">{pct.toFixed(0)}%</p>
                    </>
                  )}
                  <p className="text-[10px] text-slate-400 mt-1">{timeAgo(latest.collected_at)}</p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* History */}
      {(alertsHistoryQ.data?.length ?? 0) > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-700 mb-2">{t("platform_health.alerts_history")}</h2>
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                <tr>
                  <th className="px-3 py-2 text-left">Metric</th>
                  <th className="px-3 py-2 text-left">Severity</th>
                  <th className="px-3 py-2 text-left">Triggered</th>
                  <th className="px-3 py-2 text-left">Resolved</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {alertsHistoryQ.data!.map(a => (
                  <tr key={a.id} className="text-slate-700">
                    <td className="px-3 py-2"><span className="text-xs text-slate-500">{a.metric_key}</span><div className="text-[13px]">{a.message}</div></td>
                    <td className="px-3 py-2">
                      <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${severityColor(a.severity)}`}>
                        {t(`platform_health.severity.${a.severity}`)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-500 tabular-nums">{timeAgo(a.triggered_at)}</td>
                    <td className="px-3 py-2 text-xs text-slate-500 tabular-nums">{a.resolved_at ? timeAgo(a.resolved_at) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
