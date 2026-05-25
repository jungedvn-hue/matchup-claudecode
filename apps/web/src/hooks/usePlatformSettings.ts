import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as unknown as { from: (t: string) => any };

export interface PlatformSetting {
  key: string;
  value: unknown;
  description: string | null;
  updated_at: string;
  updated_by: string | null;
}

export const usePlatformSettings = () => {
  const [items, setItems] = useState<PlatformSetting[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await sb.from("platform_settings").select("*").order("key", { ascending: true });
    setItems((data as PlatformSetting[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const update = async (key: string, value: unknown) => {
    const { error } = await sb.from("platform_settings").update({ value }).eq("key", key);
    if (!error) await fetch();
    return { error };
  };

  return { items, loading, refetch: fetch, update };
};

export const usePlatformSetting = (key: string) => {
  const [data, setData] = useState<PlatformSetting | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await sb.from("platform_settings").select("*").eq("key", key).maybeSingle();
    setData((data as PlatformSetting | null) ?? null);
    setLoading(false);
  }, [key]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, refetch: fetch };
};
