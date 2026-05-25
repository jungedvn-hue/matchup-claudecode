import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

// We cast supabase.from(...) to any here because the auto-generated
// Database types in src/integrations/supabase/types.ts haven't been
// regenerated since the store_owner_core migration. Acceptable for v1;
// regenerate types after the migration is applied to lock these down.

export interface Store {
  id: string;
  owner_user_id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  cover_url: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  map_url: string | null;
  latitude: number | null;
  longitude: number | null;
  website: string | null;
  operating_hours: Record<string, string> | null;
  categories: string[];
  status: "pending" | "active" | "inactive" | "suspended";
  is_featured: boolean;
  avg_rating: number;
  review_count: number;
  total_bookings: number;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  store_id: string;
  name: string;
  description: string | null;
  category: string;
  price: number | null;
  price_display: string | null;
  images: string[];
  availability: "in_stock" | "low_stock" | "out_of_stock" | "available" | "booked";
  is_published: boolean;
  is_featured: boolean;
  metadata: Record<string, unknown> | null;
  affiliate_url: string | null;
  affiliate_source: AffiliateSource | null;
  affiliate_image_url: string | null;
  created_at: string;
  updated_at: string;
}

export type AffiliateSource = "shopee" | "tiktok" | "lazada" | "tiki" | "other";

export const AFFILIATE_SOURCES: { id: AffiliateSource; label: string }[] = [
  { id: "shopee", label: "Shopee" },
  { id: "tiktok", label: "TikTok Shop" },
  { id: "lazada", label: "Lazada" },
  { id: "tiki",   label: "Tiki" },
  { id: "other",  label: "Other" },
];

export const logAffiliateClick = async (input: {
  productId: string; storeId: string; userId: string | null; source: string; url: string;
}) => {
  const sb = (await import("@/integrations/supabase/client")).supabase as any;
  await sb.from("affiliate_clicks").insert({
    product_id: input.productId,
    store_id:   input.storeId,
    user_id:    input.userId,
    source:     input.source,
    url:        input.url,
  });
};

export interface Booking {
  id: string;
  store_id: string;
  product_id: string | null;
  player_user_id: string;
  player_name: string;
  player_phone: string | null;
  message: string | null;
  status: "pending" | "confirmed" | "completed" | "cancelled" | "rejected";
  scheduled_date: string | null;
  scheduled_time: string | null;
  quantity: number;
  total_coins: number | null;
  paid_at: string | null;
  coin_tx_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  store_id: string;
  player_user_id: string;
  player_name: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

const sb = supabase as unknown as { from: (t: string) => any };

// ───────── Stores ─────────

export const useStores = (filter?: { category?: string; search?: string }) => {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStores = useCallback(async () => {
    setLoading(true);
    let q = sb.from("stores").select("*").eq("status", "active").order("is_featured", { ascending: false }).order("avg_rating", { ascending: false });
    if (filter?.category && filter.category !== "all") q = q.contains("categories", [filter.category]);
    if (filter?.search) q = q.ilike("name", `%${filter.search}%`);
    const { data, error } = await q;
    if (!error) setStores((data ?? []) as Store[]);
    setLoading(false);
  }, [filter?.category, filter?.search]);

  useEffect(() => { fetchStores(); }, [fetchStores]);

  return { stores, loading, refetch: fetchStores };
};

export const useStore = (storeId: string | undefined) => {
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    const [{ data: s }, { data: p }, { data: r }] = await Promise.all([
      sb.from("stores").select("*").eq("id", storeId).maybeSingle(),
      sb.from("products").select("*").eq("store_id", storeId).eq("is_published", true).order("is_featured", { ascending: false }),
      sb.from("reviews").select("*").eq("store_id", storeId).order("created_at", { ascending: false }),
    ]);
    setStore((s ?? null) as Store | null);
    setProducts((p ?? []) as Product[]);
    setReviews((r ?? []) as Review[]);
    setLoading(false);
  }, [storeId]);

  useEffect(() => { refetch(); }, [refetch]);

  return { store, products, reviews, loading, refetch };
};

export const useMyStore = () => {
  const { user } = useAuth();
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!user) { setStore(null); setLoading(false); return; }
    setLoading(true);
    const { data } = await sb.from("stores").select("*").eq("owner_user_id", user.id).maybeSingle();
    setStore((data ?? null) as Store | null);
    setLoading(false);
  }, [user]);

  useEffect(() => { refetch(); }, [refetch]);

  const upsertStore = async (input: Partial<Store> & { name: string; categories?: string[] }) => {
    if (!user) return { error: new Error("not_signed_in") };
    const payload = {
      owner_user_id: user.id,
      ...input,
      categories: input.categories ?? store?.categories ?? [],
    };
    const { data, error } = await sb.from("stores").upsert(payload, { onConflict: "owner_user_id" }).select().single();
    if (!error && data) setStore(data as Store);
    return { data: data as Store | null, error };
  };

  return { store, loading, refetch, upsertStore };
};

// ───────── Products ─────────

export const useStoreProducts = (storeId: string | undefined) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    const { data } = await sb.from("products").select("*").eq("store_id", storeId).order("created_at", { ascending: false });
    setProducts((data ?? []) as Product[]);
    setLoading(false);
  }, [storeId]);

  useEffect(() => { refetch(); }, [refetch]);

  const create = async (input: Partial<Product> & { name: string; category: string }) => {
    if (!storeId) return { error: new Error("no_store") };
    const { data, error } = await sb.from("products").insert({ ...input, store_id: storeId }).select().single();
    if (!error) await refetch();
    return { data: data as Product | null, error };
  };

  const update = async (id: string, input: Partial<Product>) => {
    const { data, error } = await sb.from("products").update(input).eq("id", id).select().single();
    if (!error) await refetch();
    return { data: data as Product | null, error };
  };

  const remove = async (id: string) => {
    const { error } = await sb.from("products").delete().eq("id", id);
    if (!error) await refetch();
    return { error };
  };

  return { products, loading, refetch, create, update, remove };
};

// ───────── Bookings ─────────

export const useStoreBookings = (storeId: string | undefined) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    const { data } = await sb.from("bookings").select("*").eq("store_id", storeId).order("created_at", { ascending: false });
    setBookings((data ?? []) as Booking[]);
    setLoading(false);
  }, [storeId]);

  useEffect(() => { refetch(); }, [refetch]);

  const updateStatus = async (id: string, status: Booking["status"]) => {
    const { error } = await sb.from("bookings").update({ status }).eq("id", id);
    if (!error) await refetch();
    return { error };
  };

  return { bookings, loading, refetch, updateStatus };
};

export const useCreateBooking = () => {
  const { user } = useAuth();
  const submit = async (input: {
    storeId: string;
    productId?: string;
    playerName: string;
    playerPhone?: string;
    message?: string;
    scheduledDate?: string;
    scheduledTime?: string;
  }) => {
    if (!user) return { error: new Error("not_signed_in") };
    const { data, error } = await sb.from("bookings").insert({
      store_id: input.storeId,
      product_id: input.productId,
      player_user_id: user.id,
      player_name: input.playerName,
      player_phone: input.playerPhone,
      message: input.message,
      scheduled_date: input.scheduledDate,
      scheduled_time: input.scheduledTime,
    }).select().single();
    return { data: data as Booking | null, error };
  };
  return { submit };
};

// ───────── Reviews ─────────

export const useCreateReview = () => {
  const { user } = useAuth();
  const submit = async (input: { storeId: string; playerName: string; rating: number; comment?: string }) => {
    if (!user) return { error: new Error("not_signed_in") };
    const { data, error } = await sb.from("reviews").upsert({
      store_id: input.storeId,
      player_user_id: user.id,
      player_name: input.playerName,
      rating: input.rating,
      comment: input.comment,
    }, { onConflict: "store_id,player_user_id" }).select().single();
    return { data: data as Review | null, error };
  };
  return { submit };
};

// ───────── Constants ─────────

export const STORE_CATEGORIES = [
  "paddles",
  "balls",
  "shoes",
  "apparel",
  "bags",
  "accessories",
  "coaching",
  "repair",
  "physio",
  "fitness",
  "food",
] as const;

export type StoreCategory = (typeof STORE_CATEGORIES)[number];
