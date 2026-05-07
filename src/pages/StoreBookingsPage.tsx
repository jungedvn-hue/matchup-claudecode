import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Phone, Calendar, MessageSquare, Check, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/i18n/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { useMyStore, useStoreBookings, type Booking } from "@/hooks/useStores";

type StatusTab = "pending" | "confirmed" | "completed" | "cancelled";

const StoreBookingsPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { toast } = useToast();
  const { store, loading: storeLoading } = useMyStore();
  const { bookings, loading, updateStatus } = useStoreBookings(store?.id);
  const [tab, setTab] = useState<StatusTab>("pending");

  const counts = useMemo(() => ({
    pending: bookings.filter(b => b.status === "pending").length,
    confirmed: bookings.filter(b => b.status === "confirmed").length,
    completed: bookings.filter(b => b.status === "completed").length,
    cancelled: bookings.filter(b => b.status === "cancelled" || b.status === "rejected").length,
  }), [bookings]);

  const filtered = useMemo(() => {
    if (tab === "cancelled") return bookings.filter(b => b.status === "cancelled" || b.status === "rejected");
    return bookings.filter(b => b.status === tab);
  }, [bookings, tab]);

  if (storeLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }
  if (!store) {
    navigate("/my-store");
    return null;
  }

  const setStatus = async (id: string, status: Booking["status"]) => {
    const { error } = await updateStatus(id, status);
    if (error) {
      toast({ title: t("auth.toast.error"), description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: t("store.booking.toast.statusUpdated") });
  };

  return (
    <div className="pb-24 min-h-screen">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3 space-y-3">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button onClick={() => navigate("/my-store")} className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center hover:bg-secondary/70 transition-colors">
            <ArrowLeft className="h-4 w-4 text-foreground" />
          </button>
          <h1 className="text-base font-display font-bold text-foreground">{t("store.booking.title")}</h1>
        </div>
        <div className="max-w-2xl mx-auto">
          <Tabs value={tab} onValueChange={(v) => setTab(v as StatusTab)}>
            <TabsList className="grid grid-cols-4 w-full h-9">
              {(["pending", "confirmed", "completed", "cancelled"] as StatusTab[]).map(s => (
                <TabsTrigger key={s} value={s} className="text-[11px] gap-1">
                  {t(`store.booking.status.${s}`)}
                  {counts[s] > 0 && <span className="ml-0.5 text-[9px] px-1 rounded-full bg-primary/20 text-primary font-bold">{counts[s]}</span>}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="px-4 pt-4 max-w-2xl mx-auto">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <Card className="p-8 text-center mt-4 shadow-card">
            <Calendar className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">{t("store.empty.bookings")}</p>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {filtered.map((b, i) => (
              <motion.div key={b.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Card className="p-4 shadow-card">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-display font-semibold text-foreground">{b.player_name}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {new Date(b.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5 mb-3">
                    {b.player_phone && (
                      <div className="flex items-center gap-2 text-xs">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        <a href={`tel:${b.player_phone}`} className="text-primary hover:underline">{b.player_phone}</a>
                      </div>
                    )}
                    {b.scheduled_date && (
                      <div className="flex items-center gap-2 text-xs">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span className="text-foreground">{b.scheduled_date}{b.scheduled_time && ` · ${b.scheduled_time}`}</span>
                      </div>
                    )}
                    {b.message && (
                      <div className="flex items-start gap-2 text-xs">
                        <MessageSquare className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
                        <p className="text-muted-foreground leading-relaxed">{b.message}</p>
                      </div>
                    )}
                  </div>

                  {b.status === "pending" && (
                    <div className="flex gap-2 pt-2 border-t border-border/50">
                      <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => setStatus(b.id, "rejected")}>
                        <X className="h-3 w-3 mr-1" /> {t("store.booking.action.reject")}
                      </Button>
                      <Button size="sm" className="flex-1 h-8 text-xs" onClick={() => setStatus(b.id, "confirmed")}>
                        <Check className="h-3 w-3 mr-1" /> {t("store.booking.action.confirm")}
                      </Button>
                    </div>
                  )}
                  {b.status === "confirmed" && (
                    <div className="flex gap-2 pt-2 border-t border-border/50">
                      <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => setStatus(b.id, "cancelled")}>
                        {t("store.booking.action.cancel")}
                      </Button>
                      <Button size="sm" className="flex-1 h-8 text-xs" onClick={() => setStatus(b.id, "completed")}>
                        <Check className="h-3 w-3 mr-1" /> {t("store.booking.action.complete")}
                      </Button>
                    </div>
                  )}
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StoreBookingsPage;
