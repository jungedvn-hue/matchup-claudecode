import { useState } from "react";
import { Loader2, Search, X, Check, UserPlus, Percent } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/i18n/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { useUserSearch } from "@/hooks/useUserSearch";
import { useSessionCohostInvites } from "@/hooks/useCohostInvites";

const CohostDialog = ({ open, sessionId, onClose }: { open: boolean; sessionId: string | null; onClose: () => void }) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { invites, loading, invite, cancel } = useSessionCohostInvites(sessionId ?? undefined);
  const [query, setQuery] = useState("");
  const { results, loading: searching } = useUserSearch(query);
  const [picked, setPicked] = useState<{ user_id: string; display_name: string | null } | null>(null);
  const [ratePct, setRatePct] = useState("10");
  const [days, setDays] = useState("15");
  const [busy, setBusy] = useState(false);

  const accepted = invites.find(i => i.status === "accepted");
  const pending = invites.filter(i => i.status === "pending");

  const doInvite = async () => {
    if (!picked) return;
    const rate = Math.max(0, Math.min(100, Number(ratePct) || 0)) / 100;
    setBusy(true);
    const { error } = await invite(picked.user_id, rate, Number(days));
    setBusy(false);
    if (error) { toast({ title: t("auth.toast.error"), description: error.message, variant: "destructive" }); return; }
    toast({ title: t("cohost.invited") });
    setPicked(null); setQuery("");
  };

  const doCancel = async (id: string) => {
    setBusy(true); await cancel(id); setBusy(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setPicked(null); setQuery(""); onClose(); } }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5 text-primary" /> {t("cohost.title")}</DialogTitle></DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-3 py-2">
            {accepted && (
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">{accepted.host?.display_name ?? t("cohost.aHost")}</p>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400">{t("cohost.active")} · {(accepted.credit_back_rate * 100).toFixed(0)}% · {accepted.attribution_days}{t("cohost.daysShort")}</p>
                </div>
                <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
            )}

            {pending.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">{t("cohost.pending")}</Label>
                {pending.map(inv => (
                  <div key={inv.id} className="flex items-center justify-between rounded-lg bg-secondary/40 border border-border px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm truncate">{inv.host?.display_name ?? t("cohost.aHost")}</p>
                      <p className="text-[11px] text-muted-foreground">{(inv.credit_back_rate * 100).toFixed(0)}% · {inv.attribution_days}{t("cohost.daysShort")}</p>
                    </div>
                    <button onClick={() => doCancel(inv.id)} disabled={busy} className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {!accepted && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">{t("cohost.searchLabel")}</Label>
                  {picked ? (
                    <div className="flex items-center justify-between rounded-lg bg-primary/10 border border-primary/20 px-3 py-2">
                      <span className="text-sm font-medium">{picked.display_name ?? t("cohost.aHost")}</span>
                      <button onClick={() => setPicked(null)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
                    </div>
                  ) : (
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("cohost.searchPh")} className="pl-8" />
                    </div>
                  )}
                  {!picked && query.trim().length >= 2 && (
                    <div className="rounded-lg border border-border divide-y divide-border/60 max-h-44 overflow-y-auto">
                      {searching ? (
                        <div className="flex justify-center py-3"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
                      ) : results.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground text-center py-3">{t("cohost.noResults")}</p>
                      ) : results.map(r => (
                        <button key={r.user_id} onClick={() => setPicked({ user_id: r.user_id, display_name: r.display_name })}
                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-secondary text-left">
                          <div className="h-7 w-7 rounded-full bg-secondary overflow-hidden shrink-0">
                            {r.avatar_url && <img src={r.avatar_url} alt="" className="w-full h-full object-cover" />}
                          </div>
                          <span className="text-sm truncate">{r.display_name ?? t("cohost.aHost")}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {picked && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">{t("cohost.rate")}</Label>
                      <div className="relative">
                        <Input type="number" min={0} max={100} value={ratePct} onChange={(e) => setRatePct(e.target.value)} className="pr-7" />
                        <Percent className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">{t("cohost.window")}</Label>
                      <Select value={days} onValueChange={setDays}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15">15 {t("cohost.days")}</SelectItem>
                          <SelectItem value="30">30 {t("cohost.days")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                <Button onClick={doInvite} disabled={!picked || busy} className="w-full gap-1.5">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} {t("cohost.invite")}
                </Button>
                <p className="text-[10px] text-muted-foreground text-center">{t("cohost.rateHint")}</p>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CohostDialog;
