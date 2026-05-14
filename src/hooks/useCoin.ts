import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

const sb = supabase as unknown as { from: (t: string) => any; rpc: (fn: string, args?: any) => any; functions: { invoke: (name: string, opts?: any) => any } };

// 1 coin = 100 VND
export const COIN_TO_VND = 100;
export const formatCoin = (n: number | bigint) => Number(n).toLocaleString("vi-VN");
export const formatVnd = (n: number | bigint) => `${Number(n).toLocaleString("vi-VN")}đ`;

export type CoinTxType = "purchase" | "gift_sent" | "gift_received" | "spend" | "refund" | "admin_grant";

export interface CoinBalance {
  user_id: string;
  balance: number;
  lifetime_earned: number;
  lifetime_spent: number;
}

export interface CoinTransaction {
  id: string;
  type: CoinTxType;
  amount: number;
  balance_after: number;
  ref_type: string | null;
  ref_id: string | null;
  description: string | null;
  created_at: string;
}

export interface CoinPackage {
  id: string;
  name: string;
  coin_amount: number;
  price_vnd: number;
  bonus_coins: number;
  badge: string | null;
  sort_order: number;
}

export interface Gift {
  id: string;
  code: string;
  name: string;
  emoji: string;
  coin_cost: number;
  category: "cheer" | "hype" | "celebration";
  sort_order: number;
}

export type PaymentStatus = "pending" | "paid" | "failed" | "expired" | "cancelled";

export interface PaymentOrder {
  id: string;
  user_id: string;
  package_id: string;
  amount_vnd: number;
  coins_to_credit: number;
  gateway: string;
  gateway_order_id: string | null;
  status: PaymentStatus;
  qr_code_url: string | null;
  checkout_url: string | null;
  expires_at: string;
  paid_at: string | null;
  created_at: string;
}

// ── Balance ──────────────────────────────────────────────────────────────────
export const useCoinBalance = () => {
  const { user } = useAuth();
  const [balance, setBalance] = useState<CoinBalance | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) { setBalance(null); setLoading(false); return; }
    setLoading(true);
    const { data } = await sb.from("coin_balances").select("*").eq("user_id", user.id).maybeSingle();
    setBalance((data as CoinBalance) ?? { user_id: user.id, balance: 0, lifetime_earned: 0, lifetime_spent: 0 });
    setLoading(false);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);
  return { balance, loading, refetch: fetch };
};

// ── Transactions ─────────────────────────────────────────────────────────────
export const useCoinTransactions = (limit = 50) => {
  const { user } = useAuth();
  const [items, setItems] = useState<CoinTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) { setItems([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await sb.from("coin_transactions")
      .select("*").eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);
    setItems((data as CoinTransaction[]) ?? []);
    setLoading(false);
  }, [user, limit]);

  useEffect(() => { fetch(); }, [fetch]);
  return { items, loading, refetch: fetch };
};

// ── Packages ─────────────────────────────────────────────────────────────────
export const useCoinPackages = () => {
  const [packages, setPackages] = useState<CoinPackage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await sb.from("coin_packages")
        .select("*").eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (!cancelled) { setPackages((data as CoinPackage[]) ?? []); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  return { packages, loading };
};

// ── Gifts ────────────────────────────────────────────────────────────────────
export const useGiftCatalog = () => {
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await sb.from("gift_catalog")
        .select("*").eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (!cancelled) { setGifts((data as Gift[]) ?? []); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  return { gifts, loading };
};

export const useSendGift = () => {
  return async (
    receiverId: string, giftId: string, message: string | null,
    contextType: string | null, contextId: string | null
  ): Promise<{ giftTxId?: string; error?: string }> => {
    const { data, error } = await sb.rpc("fn_send_gift", {
      p_receiver: receiverId, p_gift_id: giftId, p_message: message,
      p_context_type: contextType, p_context_id: contextId,
    });
    if (error) return { error: error.message };
    return { giftTxId: data as string };
  };
};

// ── Payment (PayOS) ──────────────────────────────────────────────────────────
export const useCreatePayment = () => {
  return async (packageId: string): Promise<{ order?: PaymentOrder; error?: string }> => {
    const { data, error } = await sb.functions.invoke("payment-create", { body: { package_id: packageId } });
    if (error) return { error: error.message ?? "Không thể tạo đơn thanh toán" };
    if (data?.error) return { error: data.error };
    return { order: data.order as PaymentOrder };
  };
};

export const usePaymentOrderStatus = (orderId: string | null, intervalMs = 3000) => {
  const [order, setOrder] = useState<PaymentOrder | null>(null);

  useEffect(() => {
    if (!orderId) { setOrder(null); return; }

    let cancelled = false;
    const poll = async () => {
      const { data } = await sb.from("payment_orders").select("*").eq("id", orderId).maybeSingle();
      if (cancelled) return;
      const o = data as PaymentOrder | null;
      setOrder(o);
      if (o && (o.status === "paid" || o.status === "failed" || o.status === "expired" || o.status === "cancelled")) {
        return; // stop
      }
      setTimeout(poll, intervalMs);
    };
    poll();
    return () => { cancelled = true; };
  }, [orderId, intervalMs]);

  return order;
};
