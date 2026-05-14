# Wearable Integration — Setup Guide

MatchUp Health Hub supports **3 ways** to ingest health data:

1. **Web Bluetooth** — works with any HR strap/watch (Polar, Coros, Amazfit, Garmin Instinct, Wahoo, Suunto, Mi Band, etc.). No setup needed by admin.
2. **CSV / XML import** — Garmin Connect export, Apple Health export. No setup needed.
3. **OAuth wearables** (Garmin, Oura, Fitbit, Whoop) — requires admin to register dev account per provider.

This guide covers **#3** (OAuth setup). The other 2 work out of the box.

## 0. Apply migration

```bash
# Supabase Dashboard → SQL Editor, paste contents of:
supabase/migrations/20260514230000_health_hub_v1.sql
```

## 1. Common: Set callback URL on each provider

Callback URL for all 4 providers:

```
https://yinmmgcqduvhtwmqoujj.supabase.co/functions/v1/health-oauth/callback
```

(Append `?provider=oura` etc. — but most providers want the bare URL; the function reads provider from query string.)

## 2. Oura Ring (easiest, free)

1. Go to https://cloud.ouraring.com/oauth/applications
2. Sign in with any Oura account (you don't need a Ring)
3. Click **Create New Application**
4. Set:
   - **Application name**: MatchUp
   - **Redirect URIs**: paste callback URL above
   - **Scopes**: tick all (personal, daily, heartrate, workout, session)
5. Submit → copy **Client ID** + **Client Secret**

In Supabase Dashboard → Edge Functions → Secrets, add:
```
OURA_CLIENT_ID=<paste>
OURA_CLIENT_SECRET=<paste>
```

## 3. Fitbit (free)

1. Go to https://dev.fitbit.com/apps/new
2. Sign up / sign in
3. Register an app:
   - **Application Name**: MatchUp
   - **Description**: Pickleball health tracking
   - **OAuth 2.0 Application Type**: **Server**
   - **Callback URL**: paste callback URL
   - **Default Access Type**: Read-Only
4. Submit → copy OAuth 2.0 Client ID + Client Secret

```
FITBIT_CLIENT_ID=<paste>
FITBIT_CLIENT_SECRET=<paste>
```

## 4. Whoop (apply, ~1-2 days)

1. Go to https://developer.whoop.com
2. Click **Apply for access**
3. Fill form (use case: athlete recovery tracking)
4. Wait approval email
5. After approval → create app → set redirect URI → get credentials

```
WHOOP_CLIENT_ID=<paste>
WHOOP_CLIENT_SECRET=<paste>
```

## 5. Garmin Connect (most complex)

Garmin Health API requires **partner status** — apply at https://developer.garmin.com/health-api/. Approval can take **2-4 weeks** and typically requires a commercial use case. For pilot, Garmin users can:

- Use **Web Bluetooth** with Garmin chest strap / watch (works immediately)
- Use **CSV import** from Garmin Connect export (https://www.garmin.com/account/datamanagement → Export your data)

Once partner status approved:
```
GARMIN_CLIENT_ID=<paste>
GARMIN_CLIENT_SECRET=<paste>
```

## 6. Common environment

Always set in Supabase Edge Function Secrets:
```
APP_URL=https://app.matchup.asia
```

## 7. Deploy Edge Functions

```bash
supabase functions deploy health-oauth
supabase functions deploy health-sync
```

(`config.toml` already sets `verify_jwt=false` for `health-oauth` callback, `true` for sync.)

## 8. Test end-to-end

1. App → Health Hub → Devices tab → click "Connect" on Oura
2. Browser redirects to Oura → authorize
3. Redirects back to /health → toast "Connected"
4. Click sync icon → fetches last 7 days → upserts to `health_daily_logs`
5. Switch to Stats tab → see real HRV, sleep, HR data on charts

## Provider data fields fetched

| Provider | Fields |
|----------|--------|
| **Oura**   | sleep_hours, hrv_ms, avg_hr, resting_hr, steps, calories |
| **Fitbit** | steps, distance_km, calories, sleep_hours, resting_hr |
| **Whoop**  | hrv_ms, resting_hr, sleep_hours, avg_hr, calories |
| **Garmin** | steps, distance_km, calories, avg_hr, resting_hr |

All written to single `health_daily_logs` table (one row per user per day).

## Token refresh

`health-sync` Edge Function automatically refreshes access tokens when expired (1 minute buffer). No cron needed for now — sync is **user-initiated** (click sync button on Devices tab). Future enhancement: scheduled cron via `pg_cron` to auto-sync daily.

## Cost & rate limits

- **Oura**: free, no rate limit issues for 6h polling
- **Fitbit**: 150 requests/hour per user (well within limits)
- **Whoop**: 100 requests/min per access token
- **Garmin**: free for partners; 600 requests/min

## Troubleshooting

- **"Provider OAuth not configured"** → check Edge Function secrets are set
- **Redirect loop** → verify callback URL matches exactly in provider dashboard
- **Token exchange failed** → check Client ID + Secret are correct (no spaces)
- **Sync fails with 401** → token expired and refresh failed → user needs to reconnect
- Check `health_device_connections.last_sync_error` for diagnostic info
