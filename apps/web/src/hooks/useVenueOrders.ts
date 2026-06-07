import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

const sb = supabase as unknown as { from: (t: string) => any };

export type OrderStatus = "pending" | "confirmed" | "preparing" | "delivered" | "cancelled";
export type PaymentMethod = "cash" | "qr";
export type PaymentStatus = "unpaid" | "paid";

export const ORDER_FLOW: OrderStatus[] = ["pending", "confirmed", "preparing", "delivered"];

export interface VenueOrderItem {
  id: string;
  order_id: string;
  service_id: string;
  name: string;
  qty: number;
  unit_price: number;
  subtotal: number;
}

export interface VenueOrder {
  id: string;
  venue_id: string;
  session_id: string | null;
  group_id: string | null;
  player_id: string;
  recipient_id: string | null;
  court_ref: string | null;
  attributed_host_id: string | null;
  status: OrderStatus;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  subtotal: number;
  total: number;
  note: string | null;
  created_at: string;
  delivered_at: string | null;
  items?: VenueOrderItem[];
}

export interface CartLine {
  service_id: string;
  name: string;
  unit_price: number;
  qty: number;
}

export interface CreateOrderInput {
  venue_id: string;
  session_id?: string | null;
  group_id?: string | null;
  recipient_id?: string | null;
  court_ref?: string | null;
  payment_method: PaymentMethod;
  note?: string | null;
  lines: CartLine[];
}

// Create an order + its items. Items are inserted after the order so RLS can
// verify ownership via the parent order.
export const createVenueOrder = async (playerId: string, input: CreateOrderInput) => {
  const subtotal = input.lines.reduce((s, l) => s + l.unit_price * l.qty, 0);
  const { data: order, error } = await sb.from("venue_orders").insert({
    venue_id: input.venue_id,
    session_id: input.session_id ?? null,
    group_id: input.group_id ?? null,
    player_id: playerId,
    recipient_id: input.recipient_id ?? null,
    court_ref: input.court_ref ?? null,
    payment_method: input.payment_method,
    note: input.note ?? null,
    subtotal,
    total: subtotal,
  }).select().single();
  if (error || !order) return { data: null, error: error ?? new Error("insert_failed") };

  const itemsPayload = input.lines.map(l => ({
    order_id: (order as VenueOrder).id,
    service_id: l.service_id,
    name: l.name,
    qty: l.qty,
    unit_price: l.unit_price,
    subtotal: l.unit_price * l.qty,
  }));
  const { error: itemsErr } = await sb.from("venue_order_items").insert(itemsPayload);
  return { data: order as VenueOrder, error: itemsErr };
};

interface OrdersFilter {
  venueId?: string;   // venue-staff view: all orders at this venue
  mine?: boolean;     // player view: own orders across venues
  sessionId?: string;
  groupId?: string;   // orders placed from a group
}

export const useVenueOrders = (filter: OrdersFilter) => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<VenueOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const { venueId, mine, sessionId, groupId } = filter;

  const refetch = useCallback(async () => {
    setLoading(true);
    let q = sb.from("venue_orders").select("*, items:venue_order_items(*)")
      .order("created_at", { ascending: false });
    if (venueId) q = q.eq("venue_id", venueId);
    if (sessionId) q = q.eq("session_id", sessionId);
    if (groupId) q = q.eq("group_id", groupId);
    if (mine && user) q = q.eq("player_id", user.id);
    const { data } = await q;
    setOrders((data as VenueOrder[]) ?? []);
    setLoading(false);
  }, [venueId, mine, sessionId, groupId, user]);

  useEffect(() => { refetch(); }, [refetch]);

  const setStatus = async (id: string, status: OrderStatus) => {
    const patch: Record<string, unknown> = { status };
    if (status === "delivered") patch.delivered_at = new Date().toISOString();
    const { error } = await sb.from("venue_orders").update(patch).eq("id", id);
    if (!error) await refetch();
    return { error };
  };

  const setPaymentStatus = async (id: string, payment_status: PaymentStatus) => {
    const { error } = await sb.from("venue_orders").update({ payment_status }).eq("id", id);
    if (!error) await refetch();
    return { error };
  };

  return { orders, loading, refetch, setStatus, setPaymentStatus };
};
