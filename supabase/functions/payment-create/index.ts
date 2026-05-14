// Edge Function: payment-create
// POST { package_id } → creates PayOS order, returns order with QR code URL
// PayOS docs: https://payos.vn/docs/

// @ts-ignore Deno runtime
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
// @ts-ignore Deno runtime
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// HMAC-SHA256 → hex (PayOS signature spec)
async function hmacSha256Hex(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const keyData = await crypto.subtle.importKey(
    "raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", keyData, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// PayOS signature for create-payment-link request:
// signature = HMAC-SHA256(checksumKey, "amount={amount}&cancelUrl={cancelUrl}&description={description}&orderCode={orderCode}&returnUrl={returnUrl}")
// Keys are sorted alphabetically.
async function signCreatePayload(checksumKey: string, payload: {
  amount: number; cancelUrl: string; description: string; orderCode: number; returnUrl: string;
}): Promise<string> {
  const sortedKeys = Object.keys(payload).sort() as Array<keyof typeof payload>;
  const queryStr = sortedKeys.map(k => `${k}=${payload[k]}`).join("&");
  return await hmacSha256Hex(checksumKey, queryStr);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const payosClientId = Deno.env.get("PAYOS_CLIENT_ID");
    const payosApiKey = Deno.env.get("PAYOS_API_KEY");
    const payosChecksumKey = Deno.env.get("PAYOS_CHECKSUM_KEY");
    const appUrl = Deno.env.get("APP_URL") ?? "https://app.matchup.asia";

    if (!payosClientId || !payosApiKey || !payosChecksumKey) {
      return new Response(JSON.stringify({ error: "PayOS not configured. Set PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY in Supabase secrets." }), {
        status: 500, headers: corsHeaders,
      });
    }

    // Auth: verify the user via the supplied JWT
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: corsHeaders });
    }

    const body = await req.json();
    const packageId = body.package_id as string;
    if (!packageId) {
      return new Response(JSON.stringify({ error: "Missing package_id" }), { status: 400, headers: corsHeaders });
    }

    // Service-role client for privileged writes
    const adminClient = createClient(supabaseUrl, serviceKey);

    // Fetch package
    const { data: pkg, error: pkgErr } = await adminClient
      .from("coin_packages")
      .select("*")
      .eq("id", packageId)
      .eq("is_active", true)
      .maybeSingle();

    if (pkgErr || !pkg) {
      return new Response(JSON.stringify({ error: "Package not found" }), { status: 404, headers: corsHeaders });
    }

    // Generate orderCode (PayOS requires positive integer, max 9007199254740991).
    // Use timestamp seconds + 4 random digits for uniqueness.
    const orderCode = Math.floor(Date.now() / 1000) * 10000 + Math.floor(Math.random() * 10000);
    const totalCoins = pkg.coin_amount + pkg.bonus_coins;

    // Create order row first (status=pending)
    const { data: orderRow, error: orderErr } = await adminClient
      .from("payment_orders")
      .insert({
        user_id: user.id,
        package_id: pkg.id,
        amount_vnd: pkg.price_vnd,
        coins_to_credit: totalCoins,
        gateway: "payos",
        gateway_order_id: String(orderCode),
        status: "pending",
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (orderErr || !orderRow) {
      console.error("Order insert failed:", orderErr);
      return new Response(JSON.stringify({ error: "Failed to create order" }), { status: 500, headers: corsHeaders });
    }

    // Build PayOS request
    const description = `MUC ${orderCode}`.slice(0, 25); // max 25 chars
    const returnUrl = `${appUrl}/wallet?topup=${orderRow.id}`;
    const cancelUrl = `${appUrl}/wallet/topup?cancelled=${orderRow.id}`;

    const signature = await signCreatePayload(payosChecksumKey, {
      amount: pkg.price_vnd,
      cancelUrl,
      description,
      orderCode,
      returnUrl,
    });

    const payosBody = {
      orderCode,
      amount: pkg.price_vnd,
      description,
      cancelUrl,
      returnUrl,
      signature,
      items: [{ name: pkg.name, quantity: 1, price: pkg.price_vnd }],
    };

    const payosRes = await fetch("https://api-merchant.payos.vn/v2/payment-requests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-client-id": payosClientId,
        "x-api-key": payosApiKey,
      },
      body: JSON.stringify(payosBody),
    });

    const payosJson = await payosRes.json();
    if (!payosRes.ok || payosJson.code !== "00") {
      console.error("PayOS error:", payosJson);
      await adminClient.from("payment_orders").update({ status: "failed" }).eq("id", orderRow.id);
      return new Response(JSON.stringify({ error: payosJson.desc ?? "PayOS create failed" }), { status: 502, headers: corsHeaders });
    }

    const data = payosJson.data;
    const qrCodeUrl = data.qrCode
      ? `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(data.qrCode)}`
      : null;

    // Update order with checkout URL + QR
    const { data: updatedOrder } = await adminClient
      .from("payment_orders")
      .update({
        qr_code_url: qrCodeUrl,
        checkout_url: data.checkoutUrl ?? null,
      })
      .eq("id", orderRow.id)
      .select()
      .single();

    return new Response(JSON.stringify({ order: updatedOrder ?? orderRow }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("payment-create error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: corsHeaders });
  }
});
