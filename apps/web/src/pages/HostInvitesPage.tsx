import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, UserPlus, Check, X, Clock, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/i18n/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { useMyCohostInvites } from "@/hooks/useCohostInvites";

const fmtTime = (iso: string) => new Date(iso).toLocaleString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

const HostInvitesPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { toast } = useToast();
  const { invites, loading, respond } = useMyCohostInvites();
  const [busyId, setBusyId] = useState<string | null>(null);

  const pending = invites.filter(i => i.status === "pending");
  const past = invites.filter(i => i.status !== "pending");

  const act = async (id: string, accept: boolean) => {
    setBusyId(id);
    const { error } = await respond(id, accept);
    setBusyId(null);
    if (error) toast({ title: t("auth.toast.error"), description: error.message, variant: "destructive" });
    else toast({ title: accept ? t("hostInvites.accepted") : t("hostInvites.declined") });
  };

  return (
    <div className="pb-24 min-h-screen">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button onClick={() => navigate(-1)} className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center hover:bg-secondary/70 shrink-0"><ArrowLeft className="h-4 w-4" /></button>
          <h1 className="text-base font-display font-bold text-foreground flex items-center gap-2"><UserPlus className="h-5 w-5 text-primary" /> {t("hostInvites.title")}</h1>
        </div>
      </div>

      <div className="px-4 pt-4 max-w-2xl mx-auto space-y-3">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : invites.length === 0 ? (
          <Card className="p-8 text-center space-y-3 mt-4 shadow-card">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto"><UserPlus className="h-6 w-6 text-primary" /></div>
            <p className="text-sm text-muted-foreground">{t("hostInvites.empty")}</p>
          </Card>
        ) : (
          <>
            {pending.map((inv, i) => (
              <motion.div key={inv.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Card className="p-4 shadow-card space-y-2.5">
                  <div>
                    <p className="text-sm font-display font-bold text-foreground">{inv.session?.title ?? t("hostInvites.aSession")}</p>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{inv.session?.venue?.name}</p>
                    {inv.session?.starts_at && <p className="text-[11px] text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{fmtTime(inv.session.starts_at)}</p>}
                  </div>
                  <div className="flex items-center gap-2 text-[12px]">
                    <Badge variant="outline" className="text-[10px]">{(inv.credit_back_rate * 100).toFixed(0)}% {t("hostInvites.creditBack")}</Badge>
                    <Badge variant="outline" className="text-[10px]">{inv.attribution_days} {t("cohost.days")}</Badge>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <Button onClick={() => act(inv.id, true)} disabled={busyId === inv.id} className="flex-1 gap-1.5">
                      {busyId === inv.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} {t("hostInvites.accept")}
                    </Button>
                    <Button onClick={() => act(inv.id, false)} disabled={busyId === inv.id} variant="outline" className="flex-1 gap-1.5">
                      <X className="h-4 w-4" /> {t("hostInvites.decline")}
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}

            {past.length > 0 && (
              <div className="space-y-2 pt-2">
                <p className="text-xs font-medium text-muted-foreground px-1">{t("hostInvites.history")}</p>
                {past.map(inv => (
                  <Card key={inv.id} className="p-3 shadow-card flex items-center justify-between opacity-70">
                    <div className="min-w-0">
                      <p className="text-sm truncate">{inv.session?.title ?? t("hostInvites.aSession")}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{inv.session?.venue?.name}</p>
                    </div>
                    <Badge variant="secondary" className="text-[9px]">{t(`hostInvites.status.${inv.status}`)}</Badge>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default HostInvitesPage;
