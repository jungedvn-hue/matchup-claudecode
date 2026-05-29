import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Coins, User } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { useVenue } from "@/hooks/useVenues";
import { useVenueCreditsPayable } from "@/hooks/useHostCredits";

const fmtMoney = (n: number) => `${Math.round(n).toLocaleString("vi-VN")}đ`;

const VenueCreditsPage = () => {
  const navigate = useNavigate();
  const { venueId } = useParams<{ venueId: string }>();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { data: venue, loading: venueLoading } = useVenue(venueId);
  const { rows, hosts, loading } = useVenueCreditsPayable(venueId);

  useEffect(() => {
    if (!venueLoading && venue && user && venue.owner_user_id !== user.id) navigate("/my-venues", { replace: true });
  }, [venueLoading, venue, user, navigate]);

  if (venueLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!venue) { navigate("/my-venues", { replace: true }); return null; }

  const totalPayable = rows.reduce((s, r) => s + r.balance, 0);

  return (
    <div className="pb-24 min-h-screen">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button onClick={() => navigate(-1)} className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center hover:bg-secondary/70 shrink-0"><ArrowLeft className="h-4 w-4" /></button>
          <div className="min-w-0">
            <h1 className="text-base font-display font-bold text-foreground truncate flex items-center gap-2"><Coins className="h-5 w-5 text-primary" /> {t("venueCredits.title")}</h1>
            <p className="text-[11px] text-muted-foreground truncate">{venue.name}</p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 max-w-2xl mx-auto space-y-3">
        <Card className="p-4 shadow-card flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{t("venueCredits.totalPayable")}</span>
          <span className="text-lg font-display font-bold text-primary tabular-nums">{fmtMoney(totalPayable)}</span>
        </Card>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : rows.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground shadow-card">{t("venueCredits.empty")}</Card>
        ) : (
          <div className="space-y-2">
            {rows.map((r, i) => (
              <motion.div key={r.host_id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Card className="p-3.5 shadow-card flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-secondary overflow-hidden flex items-center justify-center shrink-0">
                    {hosts[r.host_id]?.avatar_url ? <img src={hosts[r.host_id].avatar_url!} alt="" className="w-full h-full object-cover" /> : <User className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  <span className="flex-1 text-sm font-medium truncate">{hosts[r.host_id]?.display_name ?? t("cohost.aHost")}</span>
                  <span className="text-sm font-bold text-primary tabular-nums">{fmtMoney(r.balance)}</span>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
        <p className="text-[10px] text-muted-foreground text-center px-4">{t("venueCredits.hint")}</p>
      </div>
    </div>
  );
};

export default VenueCreditsPage;
