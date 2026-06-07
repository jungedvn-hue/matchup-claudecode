import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as unknown as { from: (t: string) => any };

export type VenueServiceCategory = "drink" | "food" | "rental" | "utility" | "other";

export const VENUE_SERVICE_CATEGORIES: VenueServiceCategory[] = [
  "drink", "food", "rental", "utility", "other",
];

export interface VenueService {
  id: string;
  venue_id: string;
  name: string;
  description: string | null;
  category: VenueServiceCategory;
  price: number;
  image_url: string | null;
  deliverable: boolean;
  is_published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type VenueServiceInput = Partial<Omit<VenueService, "id" | "venue_id" | "created_at" | "updated_at">> & {
  name: string;
  category: VenueServiceCategory;
};

export const useVenueServices = (venueId: string | undefined) => {
  const [items, setItems] = useState<VenueService[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!venueId) { setItems([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await sb.from("venue_services")
      .select("*").eq("venue_id", venueId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    setItems((data as VenueService[]) ?? []);
    setLoading(false);
  }, [venueId]);

  useEffect(() => { refetch(); }, [refetch]);

  const create = async (input: VenueServiceInput) => {
    if (!venueId) return { data: null, error: new Error("no_venue") };
    const { data, error } = await sb.from("venue_services")
      .insert({ ...input, venue_id: venueId }).select().single();
    if (!error) await refetch();
    return { data: data as VenueService | null, error };
  };

  const update = async (id: string, input: Partial<VenueServiceInput>) => {
    const { data, error } = await sb.from("venue_services")
      .update(input).eq("id", id).select().single();
    if (!error) await refetch();
    return { data: data as VenueService | null, error };
  };

  const remove = async (id: string) => {
    const { error } = await sb.from("venue_services").delete().eq("id", id);
    if (!error) await refetch();
    return { error };
  };

  return { items, loading, refetch, create, update, remove };
};

// ── Group menu curation ────────────────────────────────────────────────────────
// A group can feature a subset of its linked venue's services. Empty set = sync
// the venue's full published menu (default). Host-only writes.
export const useGroupMenu = (groupId: string | undefined) => {
  const [featuredIds, setFeaturedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!groupId) { setFeaturedIds([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await sb.from("group_menu_services")
      .select("service_id").eq("group_id", groupId);
    setFeaturedIds(((data as { service_id: string }[]) ?? []).map(r => r.service_id));
    setLoading(false);
  }, [groupId]);

  useEffect(() => { refetch(); }, [refetch]);

  // Toggle a service in/out of the featured set (host only via RLS).
  const toggle = async (serviceId: string) => {
    if (!groupId) return { error: new Error("no_group") };
    const isOn = featuredIds.includes(serviceId);
    if (isOn) {
      const { error } = await sb.from("group_menu_services")
        .delete().eq("group_id", groupId).eq("service_id", serviceId);
      if (!error) setFeaturedIds(ids => ids.filter(id => id !== serviceId));
      return { error };
    }
    const { error } = await sb.from("group_menu_services")
      .insert({ group_id: groupId, service_id: serviceId });
    if (!error) setFeaturedIds(ids => [...ids, serviceId]);
    return { error };
  };

  return { featuredIds, loading, refetch, toggle };
};
