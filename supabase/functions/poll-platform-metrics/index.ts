// Edge Function: poll-platform-metrics
// Cron target. Polls Supabase / Vercel / domain WHOIS / app DB and inserts
// snapshots into platform_metrics; raises platform_alerts when thresholds
// are crossed; calls send-alert-email for new critical/warn alerts.
//
// See docs/admin/06-platform-health.md for full spec.

// @ts-ignore Deno runtime
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
// @ts-ignore Deno runtime
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Environment ────────────────────────────────────────────────────────
// @ts-ignore Deno global
const env = (k: string) => Deno.env.get(k);

const SUPABASE_URL              = env("SUPABASE_URL")!;
const SERVICE_ROLE              = env("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_MGMT_TOKEN       = env("SUPABASE_MGMT_TOKEN") ?? "";
const SUPABASE_PROJECT_REF      = env("SUPABASE_PROJECT_REF") ?? "";
const SUPABASE_ORG_ID           = env("SUPABASE_ORG_ID") ?? "";
const VERCEL_TOKEN              = env("VERCEL_TOKEN") ?? "";
const VERCEL_TEAM_ID            = env("VERCEL_TEAM_ID") ?? "";
const DOMAINS                   = (env("MONITOR_DOMAINS") ?? "matchup.asia,app.matchup.asia,admin.matchup.asia")
                                    .split(",").map(s => s.trim()).filter(Boolean);
const PLAN_SUPABASE             = (env("PLAN_SUPABASE") ?? "free").toLowerCase();   // 'free' | 'pro'
const PLAN_VERCEL               = (env("PLAN_VERCEL") ?? "hobby").toLowerCase();    // 'hobby' | 'pro'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

// ── Plan limits (best-effort defaults; override via meta if API returns real plan) ──
const SUPABASE_LIMITS = {
  free: { db_bytes: 500 * 1024 * 1024,            mau: 50_000,  egress_bytes: 5 * 1024 ** 3 },
  pro:  { db_bytes: 8 * 1024 ** 3,                mau: 100_000, egress_bytes: 250 * 1024 ** 3 },
} as const;
const VERCEL_LIMITS = {
  hobby: { bandwidth_bytes: 100 * 1024 ** 3 },
  pro:   { bandwidth_bytes: 1024 * 1024 ** 3 },     // 1 TB
} as const;

// ── Thresholds (% used, except reversed-direction metrics) ─────────────
type Direction = "above" | "below";
const THRESHOLDS: Record<string, { warn: number; critical: number; direction: Direction; unit?: string }> = {
  "supabase.db_size":         { warn: 70, critical: 90, direction: "above", unit: "bytes" },
  "supabase.auth_mau":        { warn: 70, critical: 85, direction: "above", unit: "count" },
  "supabase.egress":          { warn: 60, critical: 90, direction: "above", unit: "bytes" },
  "vercel.bandwidth":         { warn: 60, critical: 90, direction: "above", unit: "bytes" },
  "domain.expiry_days":       { warn: 60, critical: 14, direction: "below", unit: "days" },
  "payment.webhook_success":  { warn: 99, critical: 95, direction: "below", unit: "percent" },
};

// ── Types ──────────────────────────────────────────────────────────────
type Metric = {
  metric_key: string;
  value_num: number | null;
  limit_num: number | null;
  pct_used: number | null;        // 0-100
  unit: string;
  meta?: Record<string, unknown>;
};

// ── Helpers ────────────────────────────────────────────────────────────
const pct = (v: number, lim: number) => (lim > 0 ? (v / lim) * 100 : 0);

const fmtBytes = (n: number) => {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0; let v = n;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(1)} ${units[i]}`;
};

const fmtMetric = (m: Metric): string => {
  if (m.unit === "bytes" && m.value_num != null && m.limit_num != null)
    return `${fmtBytes(m.value_num)} / ${fmtBytes(m.limit_num)} (${m.pct_used?.toFixed(0)}%)`;
  if (m.unit === "count" && m.value_num != null && m.limit_num != null)
    return `${m.value_num.toLocaleString()} / ${m.limit_num.toLocaleString()} (${m.pct_used?.toFixed(0)}%)`;
  if (m.unit === "days") return `${m.value_num} days left`;
  if (m.unit === "percent") return `${m.value_num?.toFixed(2)}%`;
  return `${m.value_num} / ${m.limit_num ?? "—"}`;
};

const labelOf = (key: string): string => {
  const map: Record<string, string> = {
    "supabase.db_size": "Supabase database size",
    "supabase.auth_mau": "Supabase Auth MAU",
    "supabase.egress": "Supabase egress bandwidth",
    "vercel.bandwidth": "Vercel bandwidth",
    "payment.webhook_success": "Payment webhook success rate",
  };
  if (key.startsWith("domain.expiry_days.")) return `Domain expiry: ${key.replace("domain.expiry_days.", "")}`;
  return map[key] ?? key;
};

// ── Collectors ─────────────────────────────────────────────────────────

// 1) Supabase DB size — via SQL (works without Mgmt API)
async function collectSupabaseDbSize(): Promise<Metric | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)("pg_database_size_current");
  if (error) {
    // Fallback: direct SQL via service role
    const { data: rows } = await supabase
      .from("pg_database_size_view" as never)
      .select("*")
      .maybeSingle();
    if (!rows) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bytes = (rows as any).bytes as number;
    const lim = SUPABASE_LIMITS[PLAN_SUPABASE as keyof typeof SUPABASE_LIMITS]?.db_bytes ?? null;
    return { metric_key: "supabase.db_size", value_num: bytes, limit_num: lim, pct_used: lim ? pct(bytes, lim) : null, unit: "bytes", meta: { plan: PLAN_SUPABASE } };
  }
  const bytes = Number(data ?? 0);
  const lim = SUPABASE_LIMITS[PLAN_SUPABASE as keyof typeof SUPABASE_LIMITS]?.db_bytes ?? null;
  return { metric_key: "supabase.db_size", value_num: bytes, limit_num: lim, pct_used: lim ? pct(bytes, lim) : null, unit: "bytes", meta: { plan: PLAN_SUPABASE } };
}

// 2) Supabase Auth MAU — count distinct auth.users active in last 30 days
async function collectSupabaseAuthMAU(): Promise<Metric | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)("platform_auth_mau");
  if (error || data == null) return null;
  const count = Number(data);
  const lim = SUPABASE_LIMITS[PLAN_SUPABASE as keyof typeof SUPABASE_LIMITS]?.mau ?? null;
  return { metric_key: "supabase.auth_mau", value_num: count, limit_num: lim, pct_used: lim ? pct(count, lim) : null, unit: "count", meta: { plan: PLAN_SUPABASE, window_days: 30 } };
}

// 3) Supabase egress (via Mgmt API, optional)
async function collectSupabaseEgress(): Promise<Metric | null> {
  if (!SUPABASE_MGMT_TOKEN || !SUPABASE_PROJECT_REF) return null;
  try {
    const url = `https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/usage`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${SUPABASE_MGMT_TOKEN}` } });
    if (!res.ok) return null;
    const body = await res.json();
    // Schema varies. Try common fields:
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const j = body as any;
    const bytes = Number(j?.egress?.usage ?? j?.db_egress_bytes ?? j?.egress_bytes ?? 0);
    const lim = SUPABASE_LIMITS[PLAN_SUPABASE as keyof typeof SUPABASE_LIMITS]?.egress_bytes ?? null;
    return { metric_key: "supabase.egress", value_num: bytes, limit_num: lim, pct_used: lim ? pct(bytes, lim) : null, unit: "bytes", meta: { plan: PLAN_SUPABASE, source: "mgmt_api" } };
  } catch { return null; }
}

// 4) Vercel bandwidth (via REST API, optional)
async function collectVercelBandwidth(): Promise<Metric | null> {
  if (!VERCEL_TOKEN) return null;
  try {
    const qs = VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : "";
    const res = await fetch(`https://api.vercel.com/v1/usage${qs}`, {
      headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
    });
    if (!res.ok) return null;
    const body = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const j = body as any;
    const bytes = Number(j?.bandwidth?.total ?? j?.usage?.bandwidth ?? j?.bandwidth ?? 0);
    const lim = VERCEL_LIMITS[PLAN_VERCEL as keyof typeof VERCEL_LIMITS]?.bandwidth_bytes ?? null;
    return { metric_key: "vercel.bandwidth", value_num: bytes, limit_num: lim, pct_used: lim ? pct(bytes, lim) : null, unit: "bytes", meta: { plan: PLAN_VERCEL, source: "vercel_api" } };
  } catch { return null; }
}

// 5) Domain expiry — RDAP (no auth required)
async function collectDomainExpiry(domain: string): Promise<Metric | null> {
  try {
    const res = await fetch(`https://rdap.org/domain/${domain}`, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const body = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const events: Array<{ eventAction: string; eventDate: string }> = (body as any)?.events ?? [];
    const expiry = events.find(e => /expiration/i.test(e.eventAction))?.eventDate;
    if (!expiry) return null;
    const days = Math.floor((new Date(expiry).getTime() - Date.now()) / 86_400_000);
    return {
      metric_key: `domain.expiry_days.${domain}`,
      value_num: days,
      limit_num: null,
      pct_used: null,
      unit: "days",
      meta: { domain, expiry_date: expiry },
    };
  } catch { return null; }
}

// 6) Payment webhook success rate (24h rolling)
async function collectWebhookSuccess(): Promise<Metric | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)("platform_webhook_success_24h");
  if (error || data == null) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const j = data as any;
  const total = Number(j?.total ?? 0);
  const ok = Number(j?.ok ?? 0);
  if (total === 0) return null;
  const rate = (ok / total) * 100;
  return {
    metric_key: "payment.webhook_success",
    value_num: rate,
    limit_num: 100,
    pct_used: rate,
    unit: "percent",
    meta: { ok, total, window_hours: 24 },
  };
}

// ── Threshold evaluator ────────────────────────────────────────────────
function evalSeverity(m: Metric): "critical" | "warn" | null {
  const t = THRESHOLDS[m.metric_key] ?? THRESHOLDS[m.metric_key.replace(/\..+$/, "")];
  // Domain keys use the prefix
  const baseKey = m.metric_key.startsWith("domain.expiry_days") ? "domain.expiry_days" : m.metric_key;
  const cfg = THRESHOLDS[baseKey];
  if (!cfg) return null;
  if (m.value_num == null) return null;

  const cmpVal = cfg.unit === "bytes" || cfg.unit === "count" ? (m.pct_used ?? 0) : (m.value_num as number);

  if (cfg.direction === "above") {
    if (cmpVal >= cfg.critical) return "critical";
    if (cmpVal >= cfg.warn) return "warn";
  } else {
    if (cmpVal <= cfg.critical) return "critical";
    if (cmpVal <= cfg.warn) return "warn";
  }
  return null;
}

// ── Alert lifecycle ────────────────────────────────────────────────────
async function findOpenAlert(metric_key: string, severity: string) {
  const { data } = await supabase
    .from("platform_alerts")
    .select("id")
    .eq("metric_key", metric_key)
    .eq("severity", severity)
    .is("resolved_at", null)
    .limit(1)
    .maybeSingle();
  return data;
}

async function raiseAlert(m: Metric, severity: "warn" | "critical") {
  const message = `${labelOf(m.metric_key)} — ${fmtMetric(m)}`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("platform_alerts") as any)
    .insert({
      metric_key: m.metric_key,
      severity,
      pct_used: m.pct_used,
      value_num: m.value_num,
      limit_num: m.limit_num,
      message,
    })
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("raiseAlert insert error:", error);
    return null;
  }
  return data?.id ?? null;
}

async function maybeResolveAlerts(metric_key: string) {
  // Resolve any open alert for this metric — current poll is below threshold.
  await supabase
    .from("platform_alerts")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update({ resolved_at: new Date().toISOString() } as any)
    .eq("metric_key", metric_key)
    .is("resolved_at", null);
}

async function sendAlertEmail(m: Metric, severity: string, alertId: number | null) {
  try {
    const fnUrl = `${SUPABASE_URL}/functions/v1/send-alert-email`;
    await fetch(fnUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SERVICE_ROLE}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        alert_id: alertId,
        metric_key: m.metric_key,
        label: labelOf(m.metric_key),
        severity,
        formatted: fmtMetric(m),
        pct_used: m.pct_used,
        value_num: m.value_num,
        limit_num: m.limit_num,
        meta: m.meta,
      }),
    });
  } catch (e) {
    console.error("sendAlertEmail failed:", e);
  }
}

// ── Persist a single metric and check alert lifecycle ──────────────────
async function persistAndCheck(m: Metric) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("platform_metrics") as any).insert({
    metric_key: m.metric_key,
    value_num: m.value_num,
    limit_num: m.limit_num,
    pct_used: m.pct_used,
    unit: m.unit,
    meta: m.meta ?? null,
  });
  if (error) {
    console.error("persistAndCheck insert error:", error);
    return;
  }
  const severity = evalSeverity(m);
  if (!severity) {
    await maybeResolveAlerts(m.metric_key);
    return;
  }
  const existing = await findOpenAlert(m.metric_key, severity);
  if (existing) return; // dedup
  const id = await raiseAlert(m, severity);
  await sendAlertEmail(m, severity, id);
}

// ── Entry ──────────────────────────────────────────────────────────────
serve(async (req) => {
  // Allow only POST or scheduled invocation
  if (req.method !== "POST" && req.method !== "GET") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const startedAt = Date.now();
  const ran: string[] = [];
  const skipped: string[] = [];
  const errors: Array<{ name: string; error: string }> = [];

  type Step = { name: string; fn: () => Promise<Metric | null> };
  const steps: Step[] = [
    { name: "supabase.db_size",  fn: collectSupabaseDbSize },
    { name: "supabase.auth_mau", fn: collectSupabaseAuthMAU },
    { name: "supabase.egress",   fn: collectSupabaseEgress },
    { name: "vercel.bandwidth",  fn: collectVercelBandwidth },
    { name: "payment.webhook",   fn: collectWebhookSuccess },
    ...DOMAINS.map(d => ({ name: `domain.${d}`, fn: () => collectDomainExpiry(d) })),
  ];

  for (const step of steps) {
    try {
      const m = await step.fn();
      if (!m) { skipped.push(step.name); continue; }
      await persistAndCheck(m);
      ran.push(step.name);
    } catch (e) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      errors.push({ name: step.name, error: (e as any)?.message ?? String(e) });
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      duration_ms: Date.now() - startedAt,
      ran,
      skipped,
      errors,
    }, null, 2),
    { headers: { "Content-Type": "application/json" } },
  );
});
