// Edge Function: health-sync
// POST { connection_id }
// Reads token from health_device_connections, fetches latest data from provider,
// upserts to health_daily_logs.

// @ts-ignore
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Provider = "garmin" | "oura" | "fitbit" | "whoop";

interface DailyMetrics {
  date: string;
  steps?: number;
  distance_km?: number;
  calories_burned?: number;
  avg_hr?: number;
  resting_hr?: number;
  hrv_ms?: number;
  sleep_hours?: number;
}

// ── Provider fetchers ────────────────────────────────────────────────────────
async function fetchOura(token: string, days = 7): Promise<DailyMetrics[]> {
  const end = new Date().toISOString().slice(0, 10);
  const start = new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10);
  const headers = { "Authorization": `Bearer ${token}` };

  const [activity, sleep, readiness] = await Promise.all([
    fetch(`https://api.ouraring.com/v2/usercollection/daily_activity?start_date=${start}&end_date=${end}`, { headers }).then(r => r.json()),
    fetch(`https://api.ouraring.com/v2/usercollection/sleep?start_date=${start}&end_date=${end}`, { headers }).then(r => r.json()),
    fetch(`https://api.ouraring.com/v2/usercollection/daily_readiness?start_date=${start}&end_date=${end}`, { headers }).then(r => r.json()),
  ]);

  const map = new Map<string, DailyMetrics>();
  (activity.data ?? []).forEach((a: any) => {
    const d = a.day;
    map.set(d, { ...map.get(d), date: d, steps: a.steps, calories_burned: a.active_calories });
  });
  (sleep.data ?? []).forEach((s: any) => {
    const d = s.day;
    const sleepHours = s.total_sleep_duration ? s.total_sleep_duration / 3600 : undefined;
    map.set(d, { ...map.get(d), date: d, sleep_hours: sleepHours, avg_hr: s.average_heart_rate, hrv_ms: s.average_hrv });
  });
  (readiness.data ?? []).forEach((r: any) => {
    const d = r.day;
    map.set(d, { ...map.get(d), date: d, resting_hr: r.contributors?.resting_heart_rate });
  });

  return Array.from(map.values());
}

async function fetchFitbit(token: string, days = 7): Promise<DailyMetrics[]> {
  const headers = { "Authorization": `Bearer ${token}` };
  const out: DailyMetrics[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10);
    const [activityRes, sleepRes, hrRes] = await Promise.all([
      fetch(`https://api.fitbit.com/1/user/-/activities/date/${d}.json`, { headers }).then(r => r.ok ? r.json() : null),
      fetch(`https://api.fitbit.com/1.2/user/-/sleep/date/${d}.json`, { headers }).then(r => r.ok ? r.json() : null),
      fetch(`https://api.fitbit.com/1/user/-/activities/heart/date/${d}/1d.json`, { headers }).then(r => r.ok ? r.json() : null),
    ]);

    const summary = activityRes?.summary;
    const sleep = sleepRes?.summary;
    const hr = hrRes?.["activities-heart"]?.[0]?.value;

    if (summary || sleep || hr) {
      out.push({
        date: d,
        steps: summary?.steps,
        distance_km: summary?.distances?.find((x: any) => x.activity === "total")?.distance,
        calories_burned: summary?.caloriesOut,
        sleep_hours: sleep?.totalMinutesAsleep ? sleep.totalMinutesAsleep / 60 : undefined,
        avg_hr: hr?.heartRateZones ? Math.round((hr.restingHeartRate ?? 0) * 1.5) : undefined,
        resting_hr: hr?.restingHeartRate,
      });
    }
  }
  return out;
}

async function fetchWhoop(token: string, days = 7): Promise<DailyMetrics[]> {
  const headers = { "Authorization": `Bearer ${token}` };
  const since = new Date(Date.now() - days * 86400_000).toISOString();

  const [recovery, sleep, cycle] = await Promise.all([
    fetch(`https://api.prod.whoop.com/developer/v1/recovery?start=${since}`, { headers }).then(r => r.json()),
    fetch(`https://api.prod.whoop.com/developer/v1/activity/sleep?start=${since}`, { headers }).then(r => r.json()),
    fetch(`https://api.prod.whoop.com/developer/v1/cycle?start=${since}`, { headers }).then(r => r.json()),
  ]);

  const map = new Map<string, DailyMetrics>();
  (recovery.records ?? []).forEach((r: any) => {
    const d = r.created_at?.slice(0, 10);
    if (!d) return;
    map.set(d, {
      ...map.get(d),
      date: d,
      hrv_ms: r.score?.hrv_rmssd_milli,
      resting_hr: r.score?.resting_heart_rate,
    });
  });
  (sleep.records ?? []).forEach((s: any) => {
    const d = s.start?.slice(0, 10);
    if (!d) return;
    const sleepHours = s.score?.stage_summary?.total_in_bed_time_milli
      ? s.score.stage_summary.total_in_bed_time_milli / 3_600_000 : undefined;
    map.set(d, { ...map.get(d), date: d, sleep_hours: sleepHours });
  });
  (cycle.records ?? []).forEach((c: any) => {
    const d = c.start?.slice(0, 10);
    if (!d) return;
    map.set(d, {
      ...map.get(d),
      date: d,
      avg_hr: c.score?.average_heart_rate,
      calories_burned: c.score?.kilojoule ? Math.round(c.score.kilojoule / 4.184) : undefined,
    });
  });
  return Array.from(map.values());
}

async function fetchGarmin(token: string, _days = 7): Promise<DailyMetrics[]> {
  // Garmin Connect API: requires partner/health endpoints (depends on access tier)
  // Endpoint shape: https://apis.garmin.com/wellness-api/rest/dailies?uploadStartTimeInSeconds=...
  const since = Math.floor((Date.now() - 7 * 86400_000) / 1000);
  const until = Math.floor(Date.now() / 1000);
  const res = await fetch(
    `https://apis.garmin.com/wellness-api/rest/dailies?uploadStartTimeInSeconds=${since}&uploadEndTimeInSeconds=${until}`,
    { headers: { "Authorization": `Bearer ${token}` } }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data ?? []).map((d: any) => ({
    date: d.calendarDate,
    steps: d.steps,
    distance_km: d.distanceInMeters ? d.distanceInMeters / 1000 : undefined,
    calories_burned: d.activeKilocalories,
    avg_hr: d.averageHeartRateInBeatsPerMinute,
    resting_hr: d.restingHeartRateInBeatsPerMinute,
  }));
}

// ── Token refresh (only for providers that issue refresh tokens) ────────────
async function refreshToken(provider: Provider, refreshToken: string, clientId: string, clientSecret: string) {
  const tokenUrls: Record<Provider, string> = {
    garmin: "https://diauth.garmin.com/di-oauth2-service/oauth/token",
    oura: "https://api.ouraring.com/oauth/token",
    fitbit: "https://api.fitbit.com/oauth2/token",
    whoop: "https://api.prod.whoop.com/oauth/oauth2/token",
  };
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });
  const basic = btoa(`${clientId}:${clientSecret}`);
  const res = await fetch(tokenUrls[provider], {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Basic ${basic}`,
    },
    body: body.toString(),
  });
  if (!res.ok) return null;
  return await res.json();
}

// ── Main ────────────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: cors });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "Auth required" }), { status: 401, headers: cors });

    const { connection_id } = await req.json();
    if (!connection_id) return new Response(JSON.stringify({ error: "Missing connection_id" }), { status: 400, headers: cors });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: cors });

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: conn } = await admin.from("health_device_connections").select("*")
      .eq("id", connection_id).eq("user_id", user.id).maybeSingle();
    if (!conn) return new Response(JSON.stringify({ error: "Connection not found" }), { status: 404, headers: cors });

    const provider = conn.provider as Provider;
    if (!["garmin", "oura", "fitbit", "whoop"].includes(provider)) {
      return new Response(JSON.stringify({ error: "Provider does not support sync" }), { status: 400, headers: cors });
    }

    let accessToken = conn.access_token;
    // Refresh if expired
    if (conn.token_expires_at && new Date(conn.token_expires_at) < new Date(Date.now() + 60_000)) {
      const clientId = Deno.env.get(`${provider.toUpperCase()}_CLIENT_ID`);
      const clientSecret = Deno.env.get(`${provider.toUpperCase()}_CLIENT_SECRET`);
      if (clientId && clientSecret && conn.refresh_token) {
        const fresh = await refreshToken(provider, conn.refresh_token, clientId, clientSecret);
        if (fresh) {
          accessToken = fresh.access_token;
          await admin.from("health_device_connections").update({
            access_token: fresh.access_token,
            refresh_token: fresh.refresh_token ?? conn.refresh_token,
            token_expires_at: fresh.expires_in ? new Date(Date.now() + fresh.expires_in * 1000).toISOString() : null,
          }).eq("id", conn.id);
        }
      }
    }

    let rows: DailyMetrics[] = [];
    try {
      if (provider === "oura") rows = await fetchOura(accessToken);
      else if (provider === "fitbit") rows = await fetchFitbit(accessToken);
      else if (provider === "whoop") rows = await fetchWhoop(accessToken);
      else if (provider === "garmin") rows = await fetchGarmin(accessToken);
    } catch (e) {
      const msg = (e as Error).message;
      await admin.from("health_device_connections").update({
        last_sync_error: msg, last_sync_at: new Date().toISOString(),
      }).eq("id", conn.id);
      return new Response(JSON.stringify({ error: msg }), { status: 502, headers: cors });
    }

    // Upsert into health_daily_logs
    let upserted = 0;
    for (const row of rows) {
      if (!row.date) continue;
      const { error } = await admin.from("health_daily_logs").upsert({
        user_id: user.id,
        date: row.date,
        steps: row.steps ?? null,
        distance_km: row.distance_km ?? null,
        calories_burned: row.calories_burned ?? null,
        avg_hr: row.avg_hr ?? null,
        resting_hr: row.resting_hr ?? null,
        hrv_ms: row.hrv_ms ?? null,
        sleep_hours: row.sleep_hours ?? null,
      }, { onConflict: "user_id,date" });
      if (!error) upserted++;
    }

    await admin.from("health_device_connections").update({
      last_sync_at: new Date().toISOString(), last_sync_error: null,
    }).eq("id", conn.id);

    return new Response(JSON.stringify({ success: true, upserted, fetched: rows.length }), {
      status: 200, headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: cors });
  }
});
