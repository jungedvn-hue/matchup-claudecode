// Edge Function: payment-webhook
// PayOS IPN: POST { code, desc, success, data: {...}, signature }
// Verifies HMAC signature, then settles the order via fn_settle_payment.
// Docs: https://payos.vn/docs/api/#thong-bao-thanh-toan-webhook

// @ts-ignore Deno runtime
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
// @ts-ignore Deno runtime
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function hmacSha256Hex(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const keyData = await crypto.subtle.importKey(
    "raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", keyData, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// PayOS webhook signature: HMAC-SHA256 of the data object as sorted query string
function buildSignaturePayload(data: Record<string, unknown>): string {
  const sortedKeys = Object.keys(data).sort();
  return sortedKeys.map(k => {
    const v = data[k];
    if (v === null || v === undefined) return `${k}=`;
    if (typeof v === "object") return `${k}=${JSON.stringify(v)}`;
    return `${k}=${v}`;
  }).join("&");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const checksumKey = Deno.env.get("PAYOS_CHECKSUM_KEY");

  const admin = createClient(supabaseUrl, serviceKey);

  let body: any;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: corsHeaders });
  }

  // Log raw payload (audit)
  const { data: logRow } = await admin.from("payment_webhooks_log").insert({
    gateway: "payos",
    payload: body,
    signature_valid: null,
    processed: false,
  }).select().single();

  try {
    if (!checksumKey) {
      throw new Error("PAYOS_CHECKSUM_KEY not configured");
    }

    // PayOS sends a confirmation ping with code "00" and minimal data on webhook registration —
    // accept it.
    if (!body.data || !body.signature) {
      await admin.from("payment_webhooks_log").update({ processed: true, error_message: "Confirmation ping" }).eq("id", logRow?.id);
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
    }

    // Verify signature
    const computed = await hmacSha256Hex(checksumKey, buildSignaturePayload(body.data));
    const valid = computed === body.signature;

    await admin.from("payment_webhooks_log").update({ signature_valid: valid }).eq("id", logRow?.id);

    if (!valid) {
      await admin.from("payment_webhooks_log").update({ error_message: "Invalid signature" }).eq("id", logRow?.id);
      return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 401, headers: corsHeaders });
    }

    const orderCode = String(body.data.orderCode);
    const isPaid = body.code === "00" && body.success === true;

    // Find order
    const { data: order } = await admin
      .from("payment_orders")
      .select("*")
      .eq("gateway", "payos")
      .eq("gateway_order_id", orderCode)
      .maybeSingle();

    if (!order) {
      await admin.from("payment_webhooks_log").update({ processed: true, error_message: `Order ${orderCode} not found` }).eq("id", logRow?.id);
      return new Response(JSON.stringify({ error: "Order not found" }), { status: 404, headers: corsHeaders });
    }

    await admin.from("payment_webhooks_log").update({ order_id: order.id }).eq("id", logRow?.id);

    if (isPaid) {
      // Verify amount matches
      if (Number(body.data.amount) !== Number(order.amount_vnd)) {
        await admin.from("payment_webhooks_log").update({
          processed: true,
          error_message: `Amount mismatch: expected ${order.amount_vnd}, got ${body.data.amount}`
        }).eq("id", logRow?.id);
        return new Response(JSON.stringify({ error: "Amount mismatch" }), { status: 400, headers: corsHeaders });
      }

      // Settle (idempotent)
      const { error: settleErr } = await admin.rpc("fn_settle_payment", { p_order_id: order.id });
      if (settleErr) {
        await admin.from("payment_webhooks_log").update({
          processed: false, error_message: settleErr.message
        }).eq("id", logRow?.id);
        return new Response(JSON.stringify({ error: settleErr.message }), { status: 500, headers: corsHeaders });
      }
    } else {
      // Mark failed
      if (order.status === "pending") {
        await admin.from("payment_orders").update({ status: "failed" }).eq("id", order.id);
      }
    }

    await admin.from("payment_webhooks_log").update({ processed: true }).eq("id", logRow?.id);
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
  } catch (e) {
    const msg = (e as Error).message;
    await admin.from("payment_webhooks_log").update({ processed: false, error_message: msg }).eq("id", logRow?.id);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: corsHeaders });
  }
});
