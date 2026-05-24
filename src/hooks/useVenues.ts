import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

const sb = supabase as unknown as { from: (t: string) => any; rpc: (fn: string, args?: any) => any };

export type VenueStatus = "active" | "inactive" | "pending_verification";

export interface Venue {
  id: string;
  owner_user_id: string;
  name: string;
  court_count: number;
  amenities: string[];
  location: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  contact_phone: string | null;
  operating_hours: Record<string, unknown> | null;
  pricing: Record<string, unknown> | null;
  status: VenueStatus;
  created_at: string;
  updated_at: string;
}

export type VenueInput = Partial<Omit<Venue, "id" | "owner_user_id" | "created_at" | "updated_at">> & {
  name: string;
  court_count: number;
};

export const useMyVenues = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) { setItems([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await sb.from("venues")
      .select("*").eq("owner_user_id", user.id)
      .order("created_at", { ascending: false });
    setItems((data as Venue[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async (input: VenueInput) => {
    if (!user) return { error: "Not authenticated" as const, id: null };
    const { data, error } = await sb.from("venues")
      .insert({ owner_user_id: user.id, ...input })
      .select("id").maybeSingle();
    if (!error) await fetch();
    return { id: data?.id as string | null, error };
  };

  const update = async (id: string, patch: Partial<VenueInput>) => {
    const { error } = await sb.from("venues").update(patch).eq("id", id);
    if (!error) await fetch();
    return { error };
  };

  const remove = async (id: string) => {
    const { error } = await sb.from("venues").delete().eq("id", id);
    if (!error) await fetch();
    return { error };
  };

  return { items, loading, refetch: fetch, create, update, remove };
};

export const useVenue = (id?: string) => {
  const [data, setData] = useState<Venue | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!id) { setData(null); setLoading(false); return; }
    setLoading(true);
    const { data } = await sb.from("venues").select("*").eq("id", id).maybeSingle();
    setData((data as Venue | null) ?? null);
    setLoading(false);
  }, [id]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, refetch: fetch };
};

export const useVenueBrowse = (search = "") => {
  const [items, setItems] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    let q = sb.from("venues").select("*").eq("status", "active")
      .order("created_at", { ascending: false }).limit(50);
    const term = search.trim();
    if (term) q = q.or(`name.ilike.%${term}%,location.ilike.%${term}%,address.ilike.%${term}%`);
    const { data } = await q;
    setItems((data as Venue[]) ?? []);
    setLoading(false);
  }, [search]);

  useEffect(() => { fetch(); }, [fetch]);

  return { items, loading, refetch: fetch };
};

export interface VenueActivity {
  groups_count: number;
  events_count: number;
  tournaments_count: number;
  upcoming_events: number;
}

const EMPTY_ACTIVITY: VenueActivity = { groups_count: 0, events_count: 0, tournaments_count: 0, upcoming_events: 0 };

export const useVenueActivity = (venueId?: string) => {
  const [data, setData] = useState<VenueActivity>(EMPTY_ACTIVITY);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!venueId) { setData(EMPTY_ACTIVITY); setLoading(false); return; }
    setLoading(true);
    const { data: rows } = await sb.rpc("fn_venue_activity", { p_venue_id: venueId });
    const row = Array.isArray(rows) ? rows[0] : rows;
    setData(row ? {
      groups_count: row.groups_count ?? 0,
      events_count: row.events_count ?? 0,
      tournaments_count: row.tournaments_count ?? 0,
      upcoming_events: row.upcoming_events ?? 0,
    } : EMPTY_ACTIVITY);
    setLoading(false);
  }, [venueId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, refetch: fetch };
};

export const AMENITY_OPTIONS = [
  { id: "lighting",  emoji: "💡", labelKey: "venue.amenity.lighting" },
  { id: "parking",   emoji: "🅿️", labelKey: "venue.amenity.parking" },
  { id: "restrooms", emoji: "🚿", labelKey: "venue.amenity.restrooms" },
  { id: "proshop",   emoji: "🏪", labelKey: "venue.amenity.proshop" },
  { id: "food",      emoji: "🍽️", labelKey: "venue.amenity.food" },
  { id: "wifi",      emoji: "📶", labelKey: "venue.amenity.wifi" },
] as const;
