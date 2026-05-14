// Edge Function: health-oauth
// Handles OAuth init + callback for Garmin, Oura, Fitbit, Whoop
//
// Endpoints:
//   GET  /health-oauth/init?provider=oura      → returns { authorize_url }
//   GET  /health-oauth/callback?provider=oura&code=...&state=... → redirects to APP_URL/health
//
// Setup secrets in Supabase:
//   GARMIN_CLIENT_ID, GARMIN_CLIENT_SECRET
//   OURA_CLIENT_ID, OURA_CLIENT_SECRET
//   FITBIT_CLIENT_ID, FITBIT_CLIENT_SECRET
//   WHOOP_CLIENT_ID, WHOOP_CLIENT_SECRET
//   APP_URL (e.g. https://app.matchup.asia)

// @ts-ignore
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

type Provider = "garmin" | "oura" | "fitbit" | "whoop";

interface ProviderConfig {
  authUrl: string;
  tokenUrl: string;
  scopes: string;
  authParams?: Record<string, string>;
}

const PROVIDERS: Record<Provider, ProviderConfig> = {
  garmin: {
    // Garmin Connect IQ uses OAuth 1.0a for Health API; we use the newer Connect API OAuth 2.0
    authUrl: "https://connect.garmin.com/oauthConfirm",
    tokenUrl: "https://diauth.garmin.com/di-oauth2-service/oauth/token",
    scopes: "",
  },
  oura: {
    authUrl: "https://cloud.ouraring.com/oauth/authorize",
    tokenUrl: "https://api.ouraring.com/oauth/token",
    scopes: "personal daily heartrate workout session",
  },
  fitbit: {
    authUrl: "https://www.fitbit.com/oauth2/authorize",
    tokenUrl: "https://api.fitbit.com/oauth2/token",
    scopes: "activity heartrate sleep profile",
  },
  whoop: {
    authUrl: "https://api.prod.whoop.com/oauth/oauth2/auth",
    tokenUrl: "https://api.prod.whoop.com/oauth/oauth2/token",
    scopes: "read:recovery read:cycles read:workout read:sleep read:profile",
  },
};

const getCreds = (provider: Provider) => {
  const id = Deno.env.get(`${provider.toUpperCase()}_CLIENT_ID`);
  const secret = Deno.env.get(`${provider.toUpperCase()}_CLIENT_SECRET`);
  return { id, secret };
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const url = new URL(req.url);
  const path = url.pathname.split("/").pop();
  const provider = url.searchParams.get("provider") as Provider | null;
  const appUrl = Deno.env.get("APP_URL") ?? "https://app.matchup.asia";

  if (!provider || !PROVIDERS[provider]) {
    return new Response(JSON.stringify({ error: "Invalid provider" }), { status: 400, headers: cors });
  }

  const cfg = PROVIDERS[provider];
  const { id: clientId, secret: clientSecret } = getCreds(provider);
  if (!clientId || !clientSecret) {
    return new Response(JSON.stringify({ error: `${provider} OAuth not configured` }), {
      status: 500, headers: cors,
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const fnUrl = `${supabaseUrl}/functions/v1/health-oauth`;
  const redirectUri = `${fnUrl}/callback?provider=${provider}`;

  // ── INIT: return authorize URL ─────────────────────────────────────────────
  if (path === "init") {
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "Auth required" }), { status: 401, headers: cors });

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: cors });

    // State = base64(user_id:nonce) — verified in callback
    const nonce = crypto.randomUUID();
    const state = btoa(`${user.id}:${nonce}`);

    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: cfg.scopes,
      state,
    });
    const authorizeUrl = `${cfg.authUrl}?${params.toString()}`;
    return new Response(JSON.stringify({ authorize_url: authorizeUrl, state }), {
      status: 200, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  // ── CALLBACK: exchange code for token, save to DB ─────────────────────────
  if (path === "callback") {
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    if (!code || !state) {
      return Response.redirect(`${appUrl}/health?oauth=error&reason=missing_code`, 302);
    }

    let userId: string;
    try { userId = atob(state).split(":")[0]; }
    catch { return Response.redirect(`${appUrl}/health?oauth=error&reason=bad_state`, 302); }

    // Exchange code for token (OAuth 2.0 standard)
    const tokenBody = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    });

    const basic = btoa(`${clientId}:${clientSecret}`);
    const tokenRes = await fetch(cfg.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${basic}`,
      },
      body: tokenBody.toString(),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error(`${provider} token exchange failed:`, errText);
      return Response.redirect(`${appUrl}/health?oauth=error&reason=token_exchange`, 302);
    }

    const token = await tokenRes.json();
    const expiresAt = token.expires_in
      ? new Date(Date.now() + token.expires_in * 1000).toISOString()
      : null;

    const admin = createClient(supabaseUrl, serviceKey);
    await admin.from("health_device_connections").upsert({
      user_id: userId,
      provider,
      provider_user_id: token.user_id ?? token.athlete_id ?? userId,
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      token_expires_at: expiresAt,
      device_name: PROVIDER_DISPLAY[provider],
      sync_enabled: true,
      metadata: { scope: token.scope, token_type: token.token_type },
    }, { onConflict: "user_id,provider,provider_user_id" });

    return Response.redirect(`${appUrl}/health?oauth=success&provider=${provider}`, 302);
  }

  return new Response(JSON.stringify({ error: "Unknown action" }), { status: 404, headers: cors });
});

const PROVIDER_DISPLAY: Record<Provider, string> = {
  garmin: "Garmin Connect",
  oura: "Oura Ring",
  fitbit: "Fitbit",
  whoop: "Whoop",
};
