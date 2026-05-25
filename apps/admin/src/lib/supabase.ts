import { createClient } from "@supabase/supabase-js";

// Public anon key — safe to hardcode (same key visible in app.matchup.asia bundle).
// Override via env vars locally if needed.
const url = (import.meta.env.VITE_SUPABASE_URL as string) || "https://yinmmgcqduvhtwmqoujj.supabase.co";
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string) || "sb_publishable_zqnbouoxgfZChIEIsRz8Kg_Cc-I-Xfq";

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: "matchup-admin-auth",
  },
});
