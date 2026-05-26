// Edge Function: send-alert-email
// Sends a transactional email via Resend when a platform alert is raised.
// Invoked by poll-platform-metrics with service-role bearer token.
//
// Env required:
//   RESEND_API_KEY        — https://resend.com/api-keys
//   ALERT_EMAIL_FROM      — verified sender (e.g. "alerts@matchup.asia")
//   ALERT_EMAIL_TO        — recipient(s), comma-separated
//   ADMIN_BASE_URL        — e.g. "https://admin.matchup.asia"

// @ts-ignore Deno runtime
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

// @ts-ignore Deno global
const env = (k: string) => Deno.env.get(k);

const RESEND_API_KEY    = env("RESEND_API_KEY") ?? "";
const ALERT_EMAIL_FROM  = env("ALERT_EMAIL_FROM") ?? "alerts@matchup.asia";
const ALERT_EMAIL_TO    = (env("ALERT_EMAIL_TO") ?? "").split(",").map(s => s.trim()).filter(Boolean);
const ADMIN_BASE_URL    = env("ADMIN_BASE_URL") ?? "https://admin.matchup.asia";

type Payload = {
  alert_id: number | null;
  metric_key: string;
  label: string;
  severity: "warn" | "critical";
  formatted: string;
  pct_used?: number | null;
  value_num?: number | null;
  limit_num?: number | null;
  meta?: Record<string, unknown>;
};

const severityColor = (s: string) => s === "critical" ? "#dc2626" : "#d97706";
const severityWord  = (s: string) => s === "critical" ? "CRITICAL" : "Warning";

function actionFor(metric_key: string): string {
  if (metric_key.startsWith("supabase.")) return "Open Supabase dashboard: https://app.supabase.com";
  if (metric_key === "vercel.bandwidth") return "Open Vercel dashboard: https://vercel.com/dashboard/usage";
  if (metric_key.startsWith("domain.expiry_days.")) return "Renew at your domain registrar.";
  if (metric_key === "payment.webhook_success") return "Check payment_webhooks_log + PayOS dashboard.";
  return "";
}

function renderHtml(p: Payload): string {
  const color = severityColor(p.severity);
  const dash  = `${ADMIN_BASE_URL}/platform-health`;
  const ack   = p.alert_id ? `${dash}?ack=${p.alert_id}` : dash;
  return `
<!doctype html>
<html><body style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;background:#f6f7f9;margin:0;padding:24px;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
    <div style="background:${color};color:#fff;padding:14px 18px;font-weight:700;font-size:14px;letter-spacing:.5px">
      ${severityWord(p.severity)} · MatchUp Platform Health
    </div>
    <div style="padding:18px">
      <h2 style="margin:0 0 10px 0;font-size:18px;color:#111827">${p.label}</h2>
      <p style="margin:0 0 6px 0;font-size:15px;color:#111827"><strong>${p.formatted}</strong></p>
      <p style="margin:0 0 14px 0;font-size:12px;color:#6b7280">${p.metric_key}</p>
      <p style="margin:14px 0;font-size:13px;color:#374151">${actionFor(p.metric_key)}</p>
      <div style="margin-top:18px">
        <a href="${dash}" style="display:inline-block;background:#111827;color:#fff;text-decoration:none;padding:10px 14px;border-radius:8px;font-size:13px;font-weight:600">Open dashboard</a>
        ${p.alert_id ? `<a href="${ack}" style="display:inline-block;margin-left:8px;color:#6b7280;text-decoration:none;padding:10px 14px;font-size:13px">Acknowledge</a>` : ""}
      </div>
      <p style="margin:18px 0 0 0;font-size:11px;color:#9ca3af">You are receiving this because you are listed in ALERT_EMAIL_TO. Adjust thresholds in poll-platform-metrics.</p>
    </div>
  </div>
</body></html>`.trim();
}

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  if (!RESEND_API_KEY || ALERT_EMAIL_TO.length === 0) {
    return new Response(JSON.stringify({ ok: false, skipped: "missing RESEND_API_KEY or ALERT_EMAIL_TO" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  let payload: Payload;
  try { payload = await req.json(); }
  catch { return new Response("Bad Request", { status: 400 }); }

  const subject = `[MatchUp · ${severityWord(payload.severity)}] ${payload.label}`;
  const html = renderHtml(payload);

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: ALERT_EMAIL_FROM,
        to: ALERT_EMAIL_TO,
        subject,
        html,
      }),
    });
    const body = await res.json().catch(() => ({}));
    return new Response(JSON.stringify({ ok: res.ok, status: res.status, body }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new Response(JSON.stringify({ ok: false, error: (e as any)?.message ?? String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
