import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Check, X, Clock, CalendarClock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const sb = supabase as unknown as { from: (t: string) => any; rpc: (n: string, p?: any) => any };

interface InviteRow {
  id: string;
  tournament_id: string;
  host_user_id: string;
  invitee_email: string;
  invitee_user_id: string | null;
  access_code: string;
  status: "pending" | "accepted" | "declined" | "expired";
  message: string | null;
  expires_at: string;
  responded_at: string | null;
  created_at: string;
  host_name?: string | null;
  tournament_name?: string | null;
}

const STATUS_META: Record<string, { color: string }> = {
  pending:  { color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30" },
  accepted: { color: "bg-primary/10 text-primary border-primary/30" },
  declined: { color: "bg-muted text-muted-foreground border-border" },
  expired:  { color: "bg-muted text-muted-foreground border-border" },
};

const InvitesTab = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [items, setItems] = useState<InviteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await sb.from("referee_invites").select("*").order("created_at", { ascending: false });
    const rows = (data ?? []) as InviteRow[];
    const hostIds = Array.from(new Set(rows.map(r => r.host_user_id)));
    const tourIds = Array.from(new Set(rows.map(r => r.tournament_id)));
    const [{ data: profs }, { data: tours }] = await Promise.all([
      hostIds.length ? sb.from("profiles").select("user_id, display_name").in("user_id", hostIds) : Promise.resolve({ data: [] }),
      tourIds.length ? sb.from("tournaments").select("id, name").in("id", tourIds) : Promise.resolve({ data: [] }),
    ]);
    const pMap = new Map<string, string | null>((profs ?? []).map((p: any) => [p.user_id, p.display_name]));
    const tMap = new Map<string, string | null>((tours ?? []).map((t: any) => [t.id, t.name]));
    setItems(rows.map(r => ({ ...r, host_name: pMap.get(r.host_user_id) ?? null, tournament_name: tMap.get(r.tournament_id) ?? null })));
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const accept = async (row: InviteRow) => {
    setActing(row.id);
    const { error } = await sb.rpc("fn_accept_referee_invite", { p_code: row.access_code });
    setActing(null);
    if (error) { toast.error(error.message ?? String(error)); return; }
    toast.success(t("refInvites.accepted"));
    load();
  };

  const decline = async (row: InviteRow) => {
    setActing(row.id);
    const { error } = await sb.rpc("fn_decline_referee_invite", { p_invite_id: row.id });
    setActing(null);
    if (error) { toast.error(error.message ?? String(error)); return; }
    toast.success(t("refInvites.declined"));
    load();
  };

  const pending = items.filter(i => i.status === "pending");
  const past    = items.filter(i => i.status !== "pending");

  if (loading) return <div className="py-12 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground/50" /></div>;
  if (items.length === 0) return <Card className="p-8 text-center text-sm text-muted-foreground">{t("refInvites.empty")}</Card>;

  return (
    <div className="space-y-4">
      {pending.length > 0 && (
        <div>
          <h2 className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
            <Clock className="h-3 w-3" /> {t("refInvites.pending")} <span className="font-stat tabular-nums text-foreground">({pending.length})</span>
          </h2>
          <div className="space-y-2">
            {pending.map(inv => (
              <motion.div key={inv.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="p-3 shadow-card border-amber-500/20">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-foreground truncate">{inv.tournament_name ?? "—"}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {t("refInvites.from")} <span className="font-semibold text-foreground">{inv.host_name ?? "—"}</span>
                      </p>
                      {inv.message && <p className="text-[11px] text-foreground/80 mt-2 leading-relaxed bg-secondary/40 rounded-lg p-2">{inv.message}</p>}
                      <p className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-1">
                        <CalendarClock className="h-3 w-3" /> {t("refInvites.expires")} {new Date(inv.expires_at).toLocaleDateString("vi-VN")}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => decline(inv)}
                      disabled={acting === inv.id}
                      className="flex-1 h-9 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:bg-secondary flex items-center justify-center gap-1"
                    >
                      <X className="h-3.5 w-3.5" /> {t("refInvites.decline")}
                    </button>
                    <button
                      onClick={() => accept(inv)}
                      disabled={acting === inv.id}
                      className="flex-1 h-9 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center gap-1 hover:bg-primary/90"
                    >
                      {acting === inv.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      {t("refInvites.accept")}
                    </button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div>
          <h2 className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-2">{t("refInvites.history")}</h2>
          <div className="space-y-1.5">
            {past.map(inv => {
              const meta = STATUS_META[inv.status];
              return (
                <Card key={inv.id} className="p-3 shadow-card">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-foreground truncate">{inv.tournament_name ?? "—"}</p>
                      <p className="text-[10px] text-muted-foreground">{inv.host_name ?? "—"} · {new Date(inv.created_at).toLocaleDateString("vi-VN")}</p>
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-lg border ${meta.color}`}>{t(`refInvites.status.${inv.status}`)}</span>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default InvitesTab;
