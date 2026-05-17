import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Gift, Plus, Trash2, Copy, Check, Power } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatCoin } from "@/hooks/useCoin";
import BrandEmptyState from "@/components/BrandEmptyState";
import { toast } from "sonner";

const sb = supabase as unknown as { from: (t: string) => any };

interface HostPromoCode {
  code: string;
  credit_amount: number;
  max_uses: number;
  used_count: number;
  expires_at: string | null;
  note: string | null;
  is_active: boolean;
  created_at: string;
}

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("vi-VN");

const AdminHostPromosPage = () => {
  const { t } = useLanguage();
  const { user, isMaster } = useAuth();
  const [codes, setCodes] = useState<HostPromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // Create form state
  const [code, setCode] = useState("");
  const [creditAmount, setCreditAmount] = useState(500);
  const [maxUses, setMaxUses] = useState(1);
  const [expiresInDays, setExpiresInDays] = useState<number | "">("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await sb.from("host_promo_codes")
      .select("*").order("created_at", { ascending: false });
    setCodes((data as HostPromoCode[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  if (!isMaster) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">{t("common.notAuthorized")}</div>;
  }

  const handleCreate = async () => {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode || creditAmount <= 0 || maxUses <= 0) return;
    setSaving(true);
    const expires_at = expiresInDays ? new Date(Date.now() + Number(expiresInDays) * 86400000).toISOString() : null;
    const { error } = await sb.from("host_promo_codes").insert({
      code: cleanCode,
      credit_amount: creditAmount,
      max_uses: maxUses,
      expires_at,
      note: note.trim() || null,
      created_by: user?.id,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t("adminPromos.created"));
    setCode(""); setCreditAmount(500); setMaxUses(1); setExpiresInDays(""); setNote("");
    setCreateOpen(false);
    await fetch();
  };

  const toggleActive = async (c: HostPromoCode) => {
    await sb.from("host_promo_codes").update({ is_active: !c.is_active }).eq("code", c.code);
    await fetch();
  };

  const deleteCode = async (c: HostPromoCode) => {
    if (c.used_count > 0) {
      toast.error(t("adminPromos.cantDelete"));
      return;
    }
    if (!confirm(t("adminPromos.deleteConfirm", { code: c.code }))) return;
    await sb.from("host_promo_codes").delete().eq("code", c.code);
    await fetch();
  };

  const copyCode = (c: string) => {
    navigator.clipboard.writeText(c);
    setCopied(c);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="min-h-screen pb-20">
      <PageHeader title={t("adminPromos.title")} back onBack={() => history.back()} />

      <div className="px-4 pt-4 max-w-2xl mx-auto space-y-3">
        <Button onClick={() => setCreateOpen(true)} className="w-full h-10 rounded-xl font-bold">
          <Plus className="h-4 w-4 mr-1.5" /> {t("adminPromos.createBtn")}
        </Button>

        {loading ? (
          <div className="py-12 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground/50" /></div>
        ) : codes.length === 0 ? (
          <Card className="shadow-card">
            <BrandEmptyState pillar="community" title={t("adminPromos.empty")} description={t("adminPromos.emptyDesc")} />
          </Card>
        ) : (
          <div className="space-y-2">
            {codes.map((c, i) => {
              const expired = c.expires_at ? new Date(c.expires_at) < new Date() : false;
              const exhausted = c.used_count >= c.max_uses;
              const isOff = !c.is_active || expired || exhausted;
              return (
                <motion.div key={c.code} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
                  <Card className={`p-3 shadow-card ${isOff ? "opacity-60" : ""}`}>
                    <div className="flex items-center justify-between gap-2">
                      <button onClick={() => copyCode(c.code)} className="flex items-center gap-1.5 group">
                        <code className="font-stat font-bold text-sm text-primary tracking-wider">{c.code}</code>
                        {copied === c.code
                          ? <Check className="h-3 w-3 text-primary" />
                          : <Copy className="h-3 w-3 text-muted-foreground group-hover:text-primary" />
                        }
                      </button>
                      <div className="flex items-center gap-1">
                        {expired && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-destructive/15 text-destructive uppercase">{t("adminPromos.expired")}</span>}
                        {exhausted && !expired && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase">{t("adminPromos.exhausted")}</span>}
                        {!c.is_active && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 uppercase">{t("adminPromos.inactive")}</span>}
                        <button onClick={() => toggleActive(c)} className="h-7 w-7 rounded-lg hover:bg-secondary flex items-center justify-center">
                          <Power className={`h-3.5 w-3.5 ${c.is_active ? "text-primary" : "text-muted-foreground"}`} />
                        </button>
                        <button onClick={() => deleteCode(c)} disabled={c.used_count > 0} className="h-7 w-7 rounded-lg hover:bg-destructive/10 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed">
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-2 text-center">
                      <div>
                        <p className="font-stat font-bold text-sm text-foreground tabular-nums leading-none">{formatCoin(c.credit_amount)}</p>
                        <p className="text-[9px] text-muted-foreground uppercase font-semibold mt-1">{t("adminPromos.credit")}</p>
                      </div>
                      <div>
                        <p className="font-stat font-bold text-sm text-foreground tabular-nums leading-none">{c.used_count}/{c.max_uses}</p>
                        <p className="text-[9px] text-muted-foreground uppercase font-semibold mt-1">{t("adminPromos.uses")}</p>
                      </div>
                      <div>
                        <p className="font-stat font-bold text-sm text-foreground tabular-nums leading-none">{c.expires_at ? fmtDate(c.expires_at) : "∞"}</p>
                        <p className="text-[9px] text-muted-foreground uppercase font-semibold mt-1">{t("adminPromos.expires")}</p>
                      </div>
                    </div>
                    {c.note && <p className="mt-2 text-[11px] text-muted-foreground">{c.note}</p>}
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Gift className="h-4 w-4 text-primary" /> {t("adminPromos.createTitle")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">{t("adminPromos.codeLabel")}</Label>
              <Input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="WELCOME500" className="font-stat uppercase tracking-widest text-center" autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">{t("adminPromos.creditLabel")}</Label>
                <Input type="number" min={1} step={100} value={creditAmount} onChange={e => setCreditAmount(Math.max(0, parseInt(e.target.value) || 0))} className="font-stat" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">{t("adminPromos.maxUsesLabel")}</Label>
                <Input type="number" min={1} value={maxUses} onChange={e => setMaxUses(Math.max(1, parseInt(e.target.value) || 1))} className="font-stat" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">{t("adminPromos.expiresLabel")}</Label>
              <Input type="number" min={0} value={expiresInDays} onChange={e => setExpiresInDays(e.target.value === "" ? "" : Math.max(0, parseInt(e.target.value) || 0))} placeholder={t("adminPromos.expiresPh")} className="font-stat" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">{t("adminPromos.noteLabel")}</Label>
              <Input value={note} onChange={e => setNote(e.target.value)} placeholder={t("adminPromos.notePh")} />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setCreateOpen(false)} disabled={saving}>
                {t("common.cancel")}
              </Button>
              <Button className="flex-1 rounded-xl font-bold" onClick={handleCreate} disabled={saving || !code.trim() || creditAmount <= 0}>
                {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                {t("adminPromos.confirmCreate")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminHostPromosPage;
