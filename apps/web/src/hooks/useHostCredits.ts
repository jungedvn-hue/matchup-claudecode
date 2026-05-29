import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

const sb = supabase as unknown as { from: (t: string) => any; rpc: (fn: string, args?: any) => any };

export type LedgerType = "earn" | "redeem" | "adjust";

export interface CreditBalance {
  host_id: string;
  venue_id: string;
  balance: number;
  venue_name?: string | null;
}

export interface LedgerEntry {
  id: string;
  host_id: string;
  venue_id: string;
  order_id: string | null;
  type: LedgerType;
  amount: number;
  balance_after: number;
  note: string | null;
  created_at: string;
}

// Host side: balances per venue + ledger + redeem.
export const useHostCredits = () => {
  const { user } = useAuth();
  const [balances, setBalances] = useState<CreditBalance[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!user) { setBalances([]); setLedger([]); setLoading(false); return; }
    setLoading(true);
    const { data: bals } = await sb.from("host_credits_balance")
      .select("host_id, venue_id, balance").eq("host_id", user.id);
    const rows = (bals as CreditBalance[]) ?? [];
    const ids = [...new Set(rows.map(r => r.venue_id))];
    if (ids.length) {
      const { data: venues } = await sb.from("venues").select("id, name").in("id", ids);
      const map = new Map<string, string>((venues ?? []).map((v: any) => [v.id, v.name]));
      rows.forEach(r => { r.venue_name = map.get(r.venue_id) ?? null; });
    }
    setBalances(rows.filter(r => r.balance !== 0));
    const { data: led } = await sb.from("host_credits_ledger")
      .select("*").eq("host_id", user.id)
      .order("created_at", { ascending: false }).limit(100);
    setLedger((led as LedgerEntry[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { refetch(); }, [refetch]);

  const redeem = async (venueId: string, amount: number, note?: string) => {
    const { error } = await sb.rpc("redeem_host_credits", {
      p_venue_id: venueId, p_amount: amount, p_note: note ?? null,
    });
    if (!error) await refetch();
    return { error };
  };

  return { balances, ledger, loading, refetch, redeem };
};

// Venue side: outstanding credits payable to hosts at this venue.
export const useVenueCreditsPayable = (venueId: string | undefined) => {
  const [rows, setRows] = useState<CreditBalance[]>([]);
  const [hosts, setHosts] = useState<Record<string, { display_name: string | null; avatar_url: string | null }>>({});
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!venueId) { setRows([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await sb.from("host_credits_balance")
      .select("host_id, venue_id, balance").eq("venue_id", venueId);
    const list = ((data as CreditBalance[]) ?? []).filter(r => r.balance > 0);
    const ids = [...new Set(list.map(r => r.host_id))];
    if (ids.length) {
      const { data: profs } = await sb.from("profiles")
        .select("user_id, display_name, avatar_url").in("user_id", ids);
      const map: Record<string, any> = {};
      (profs ?? []).forEach((p: any) => { map[p.user_id] = p; });
      setHosts(map);
    }
    setRows(list);
    setLoading(false);
  }, [venueId]);

  useEffect(() => { refetch(); }, [refetch]);

  return { rows, hosts, loading, refetch };
};
