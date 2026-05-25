import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

const sb = supabase as unknown as { from: (t: string) => any; rpc: (fn: string, args?: any) => any };

export interface HostCreditBalance {
  user_id: string;
  balance: number;
  lifetime_topped_up: number;
  lifetime_consumed: number;
  updated_at: string;
}

export type HostCreditTxKind = "topup" | "promo" | "fee" | "refund_fee" | "admin_grant";

export interface HostCreditTx {
  id: string;
  kind: HostCreditTxKind;
  amount: number;
  balance_after: number;
  ref_ticket_id: string | null;
  promo_code: string | null;
  note: string | null;
  created_at: string;
}

export const useHostCredit = () => {
  const { user } = useAuth();
  const [balance, setBalance] = useState<HostCreditBalance | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) { setBalance(null); setLoading(false); return; }
    setLoading(true);
    const { data } = await sb.from("host_platform_credits").select("*").eq("user_id", user.id).maybeSingle();
    setBalance((data as HostCreditBalance) ?? { user_id: user.id, balance: 0, lifetime_topped_up: 0, lifetime_consumed: 0, updated_at: new Date().toISOString() });
    setLoading(false);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);
  return { balance, loading, refetch: fetch };
};

export const useHostCreditTransactions = (limit = 50) => {
  const { user } = useAuth();
  const [items, setItems] = useState<HostCreditTx[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) { setItems([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await sb.from("host_credit_transactions")
      .select("*").eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);
    setItems((data as HostCreditTx[]) ?? []);
    setLoading(false);
  }, [user, limit]);

  useEffect(() => { fetch(); }, [fetch]);
  return { items, loading, refetch: fetch };
};

// ── RPCs ─────────────────────────────────────────────────────────────────────
export const topupHostCredit = async (amount: number): Promise<{ newBalance?: number; error?: string }> => {
  const { data, error } = await sb.rpc("fn_topup_host_credit", { p_amount: amount });
  if (error) return { error: error.message };
  return { newBalance: Number(data) };
};

export const redeemHostPromoCode = async (code: string): Promise<{ newBalance?: number; error?: string }> => {
  const { data, error } = await sb.rpc("fn_redeem_host_promo_code", { p_code: code.trim().toUpperCase() });
  if (error) return { error: error.message };
  return { newBalance: Number(data) };
};

export const purchaseEventTicket = async (eventId: string): Promise<{ ticketId?: string; error?: string }> => {
  const { data, error } = await sb.rpc("fn_purchase_event_ticket", { p_event_id: eventId });
  if (error) return { error: error.message };
  return { ticketId: data as string };
};

export const refundEventTicket = async (ticketId: string, reason?: string): Promise<{ error?: string }> => {
  const { error } = await sb.rpc("fn_refund_event_ticket", { p_ticket_id: ticketId, p_reason: reason ?? null });
  return error ? { error: error.message } : {};
};

export const cancelPaidEvent = async (eventId: string, reason?: string): Promise<{ refunded?: number; error?: string }> => {
  const { data, error } = await sb.rpc("fn_cancel_paid_event", { p_event_id: eventId, p_reason: reason ?? null });
  if (error) return { error: error.message };
  return { refunded: Number(data) };
};
