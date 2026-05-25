import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as unknown as { from: (t: string) => any; rpc: (fn: string, args?: any) => any };

export interface MenuItem {
  id: string;
  menu_id: string;
  name: string;
  name_vi: string | null;
  emoji: string;
  image_url: string | null;
  price_vnd: number;
  available: boolean;
  sort_order: number;
}

export interface VenueMenu {
  id: string;
  group_id: string;
  active: boolean;
}

export const useDrinkMenu = (groupId: string | undefined) => {
  const [menu, setMenu] = useState<VenueMenu | null>(null);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!groupId) { setLoading(false); return; }
    setLoading(true);

    const { data: m } = await sb.from("venue_menus")
      .select("*").eq("group_id", groupId).single();

    if (!m) { setMenu(null); setItems([]); setLoading(false); return; }

    setMenu(m as VenueMenu);

    const { data: its } = await sb.from("menu_items")
      .select("*").eq("menu_id", m.id).order("sort_order");

    setItems((its as MenuItem[]) ?? []);
    setLoading(false);
  }, [groupId]);

  useEffect(() => { fetch(); }, [fetch]);

  const upsertItem = async (
    groupId: string,
    item: Partial<MenuItem> & { name: string; price_vnd: number; emoji: string }
  ) => {
    const { data: returnedId, error } = await sb.rpc("fn_upsert_menu_item", {
      p_group_id:   groupId,
      p_item_id:    item.id ?? null,
      p_name:       item.name,
      p_name_vi:    item.name_vi ?? null,
      p_emoji:      item.emoji,
      p_price_vnd:  item.price_vnd,
      p_available:  item.available ?? true,
      p_sort_order: item.sort_order ?? 0,
    });
    // Save image_url — use returned id (covers both create and edit)
    const savedId = returnedId ?? item.id;
    if (!error && savedId && item.image_url !== undefined) {
      await sb.from("menu_items").update({ image_url: item.image_url }).eq("id", savedId);
    }
    if (!error) await fetch();
    return { error: error?.message ?? null };
  };

  const uploadItemImage = async (groupId: string, file: File): Promise<{ url: string | null; error: string | null }> => {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { url: null, error: "Not authenticated" };

    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${groupId}/${Date.now()}.${ext}`;
    const { error } = await (supabase as any).storage.from("menu-items").upload(path, file, { upsert: true, contentType: file.type });
    if (error) return { url: null, error: error.message };

    const { data: { publicUrl } } = (supabase as any).storage.from("menu-items").getPublicUrl(path);
    return { url: `${publicUrl}?v=${Date.now()}`, error: null };
  };

  const deleteItem = async (groupId: string, itemId: string) => {
    const { error } = await sb.rpc("fn_delete_menu_item", {
      p_group_id: groupId,
      p_item_id:  itemId,
    });
    if (!error) await fetch();
    return { error: error?.message ?? null };
  };

  return { menu, items, loading, refetch: fetch, upsertItem, deleteItem, uploadItemImage };
};

export const useGiftDrink = () => {
  const sendDrinkGift = async (
    itemId: string,
    toUserId: string,
    tipPct: number,
    tipCoins: number = 0
  ): Promise<{ data: { coins_item: number; tip_coins: number; coins_total: number } | null; error: string | null }> => {
    const { data, error } = await sb.rpc("fn_send_drink_gift", {
      p_item_id:   itemId,
      p_to_user:   toUserId,
      p_tip_pct:   tipPct,
      p_tip_coins: tipCoins,
    });
    if (error) return { data: null, error: error.message };
    return { data, error: null };
  };

  return { sendDrinkGift };
};
