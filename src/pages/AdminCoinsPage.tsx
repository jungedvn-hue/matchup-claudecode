import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Coins, Loader2, Search, Send, Sparkles, User } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { formatCoin } from "@/hooks/useCoin";
import { toast } from "sonner";

const sb = supabase as unknown as { from: (t: string) => any; rpc: (fn: string, args?: any) => any };

interface RecentGrant {
  id: string;
  user_id: string;
  amount: number;
  description: string | null;
  created_at: string;
  recipient_name?: string;
  recipient_email?: string;
}

const QUICK_AMOUNTS = [100, 500, 1000, 5000, 10000];

const AdminCoinsPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [reason, setReason] = useState("");
  const [granting, setGranting] = useState(false);
  const [recent, setRecent] = useState<RecentGrant[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);

  const fetchRecent = useCallback(async () => {
    setLoadingRecent(true);
    const { data: grants } = await sb.from("coin_transactions")
      .select("id, user_id, amount, description, created_at")
      .eq("type", "admin_grant")
      .order("created_at", { ascending: false })
      .limit(20);

    const rows = (grants ?? []) as RecentGrant[];
    if (rows.length > 0) {
      const uids = [...new Set(rows.map(r => r.user_id))];
      const { data: profiles } = await sb.from("profiles")
        .select("user_id, display_name").in("user_id", uids);
      const pMap: Record<string, string> = {};
      (profiles ?? []).forEach((p: any) => { pMap[p.user_id] = p.display_name ?? "—"; });
      rows.forEach(r => { r.recipient_name = pMap[r.user_id] ?? "—"; });
    }
    setRecent(rows);
    setLoadingRecent(false);
  }, []);

  useEffect(() => { fetchRecent(); }, [fetchRecent]);

  const handleGrant = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !amount || Number(amount) <= 0) {
      toast.error(t("adminCoins.fillFields"));
      return;
    }
    setGranting(true);
    const { data, error } = await sb.rpc("fn_admin_grant_coin", {
      p_email: cleanEmail,
      p_amount: Number(amount),
      p_reason: reason.trim() || null,
    });
    setGranting(false);
    if (error) { toast.error(error.message); return; }
    if (data) {
      toast.success(t("adminCoins.granted", { amount: formatCoin(Number(amount)), email: cleanEmail }));
      setEmail(""); setAmount(""); setReason("");
      fetchRecent();
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="pb-20 min-h-screen">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button onClick={() => navigate(-1)} className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-lg font-display font-bold text-foreground flex items-center gap-2">
            <Coins className="h-5 w-5 text-amber-500" />
            {t("adminCoins.title")}
          </h1>
        </div>
      </div>

      <div className="px-4 pt-4 max-w-2xl mx-auto space-y-4">
        {/* Grant form */}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-4 shadow-card bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-card border-amber-500/20 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <h2 className="text-sm font-display font-bold text-foreground">{t("adminCoins.grantTitle")}</h2>
            </div>

            <div className="space-y-2.5">
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">{t("adminCoins.email")}</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <input
                    value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full h-10 pl-9 pr-3 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">{t("adminCoins.amount")}</label>
                <div className="relative">
                  <Coins className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-500 pointer-events-none" />
                  <input
                    type="number" min="1" max="1000000"
                    value={amount} onChange={e => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="0"
                    className="w-full h-10 pl-9 pr-3 rounded-xl border border-border bg-card text-sm font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-all"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {QUICK_AMOUNTS.map(n => (
                    <button key={n} onClick={() => setAmount(n)}
                      className="h-7 px-2.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-[11px] font-bold tabular-nums transition-all">
                      +{formatCoin(n)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">{t("adminCoins.reason")}</label>
                <input
                  value={reason} onChange={e => setReason(e.target.value)}
                  placeholder={t("adminCoins.reasonPlaceholder")}
                  maxLength={140}
                  className="w-full h-10 px-3 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-all"
                />
              </div>

              <button
                onClick={handleGrant} disabled={granting || !email || !amount}
                className="w-full h-11 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-amber-500/20"
              >
                {granting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {t("adminCoins.grant")}
              </button>
            </div>
          </Card>
        </motion.div>

        {/* Recent grants */}
        <section>
          <h2 className="text-sm font-display font-bold text-foreground mb-2.5">{t("adminCoins.recent")}</h2>
          {loadingRecent ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary opacity-40" /></div>
          ) : recent.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground shadow-card">
              <Sparkles className="h-8 w-8 mx-auto opacity-20 mb-2" />
              <p className="text-sm">{t("adminCoins.emptyRecent")}</p>
            </Card>
          ) : (
            <div className="space-y-1.5">
              {recent.map(g => (
                <Card key={g.id} className="p-3 shadow-card flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{g.recipient_name ?? "—"}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{g.description ?? t("adminCoins.noReason")}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-display font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">+{formatCoin(g.amount)}</p>
                    <p className="text-[9px] text-muted-foreground">{formatDate(g.created_at)}</p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default AdminCoinsPage;
