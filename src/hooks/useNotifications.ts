import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

const sb = supabase as unknown as { from: (t: string) => any; rpc: (fn: string, args?: any) => any; channel: (name: string) => any; removeChannel: (ch: any) => void };

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  ref_type: string | null;
  ref_id: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) { setNotifications([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await sb.from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setNotifications((data as Notification[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = (supabase as any)
      .channel(`notifications:${user.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${user.id}`,
      }, (payload: any) => {
        setNotifications(prev => [payload.new as Notification, ...prev]);
      })
      .subscribe();

    return () => { (supabase as any).removeChannel(channel); };
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read_at).length;

  const markRead = async (ids?: string[]) => {
    await sb.rpc("fn_mark_notifications_read", { p_ids: ids ?? null });
    setNotifications(prev =>
      prev.map(n => (!ids || ids.includes(n.id)) ? { ...n, read_at: new Date().toISOString() } : n)
    );
  };

  const markAllRead = () => markRead();

  return { notifications, loading, unreadCount, markRead, markAllRead, refetch: fetch };
};
