import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, CalendarClock, Loader2, MapPin, Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as unknown as { rpc: (n: string, p?: any) => any };

interface TourRow {
  id: string;
  name: string;
  date: string | null;
  location: string | null;
  status: string;
  host_id: string;
}


const STATUS_TONE: Record<string, string> = {
  draft:      "bg-muted text-muted-foreground border-border",
  scheduled:  "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  in_progress:"bg-primary/10 text-primary border-primary/30",
  completed:  "bg-secondary text-foreground border-border",
};

const parseDate = (s: string | null) => {
  if (!s) return null;
  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d : null;
};

const RefereeSchedulePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [items, setItems] = useState<TourRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await sb.rpc("fn_my_referee_tournaments");
    setItems((data ?? []) as TourRow[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const { upcoming, past } = useMemo(() => {
    const now = Date.now();
    const up: TourRow[] = [];
    const pa: TourRow[] = [];
    for (const r of items) {
      const d = parseDate(r.date);
      const isPast = r.status === "completed" || (d != null && d.getTime() < now - 86_400_000);
      if (isPast) pa.push(r); else up.push(r);
    }
    up.sort((a, b) => (parseDate(a.date)?.getTime() ?? 0) - (parseDate(b.date)?.getTime() ?? 0));
    pa.sort((a, b) => (parseDate(b.date)?.getTime() ?? 0) - (parseDate(a.date)?.getTime() ?? 0));
    return { upcoming: up, past: pa };
  }, [items]);

  const Row = ({ r }: { r: TourRow }) => (
    <Card
      className="p-3 shadow-card hover:border-primary/30 transition-all cursor-pointer"
      onClick={() => navigate(`/tournaments/${r.id}`)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-foreground truncate">{r.name}</p>
          <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
            {r.date && (
              <span className="inline-flex items-center gap-1">
                <CalendarClock className="h-3 w-3" />{new Date(r.date).toLocaleDateString("vi-VN")}
              </span>
            )}
            {r.location && (
              <span className="inline-flex items-center gap-1 truncate">
                <MapPin className="h-3 w-3" />{r.location}
              </span>
            )}
          </div>
        </div>
        <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-lg border shrink-0 ${STATUS_TONE[r.status] ?? STATUS_TONE.draft}`}>
          {t(`refSchedule.status.${r.status}`)}
        </span>
      </div>
    </Card>
  );

  return (
    <div className="min-h-screen pb-20">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button onClick={() => navigate(-1)} className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-lg font-display font-bold flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" /> {t("refSchedule.title")}
          </h1>
        </div>
      </div>

      <div className="px-4 pt-4 max-w-2xl mx-auto space-y-4">
        {loading ? (
          <div className="py-12 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground/50" /></div>
        ) : items.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground space-y-2">
            <Trophy className="h-8 w-8 mx-auto text-muted-foreground/30" />
            <p>{t("refSchedule.empty")}</p>
          </Card>
        ) : (
          <>
            {upcoming.length > 0 && (
              <div>
                <h2 className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-2">
                  {t("refSchedule.upcoming")} <span className="font-stat tabular-nums text-foreground">({upcoming.length})</span>
                </h2>
                <div className="space-y-2">
                  {upcoming.map((r, i) => (
                    <motion.div key={r.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
                      <Row r={r} />
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
            {past.length > 0 && (
              <div>
                <h2 className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-2">
                  {t("refSchedule.past")} <span className="font-stat tabular-nums text-foreground">({past.length})</span>
                </h2>
                <div className="space-y-2">
                  {past.map(r => <Row key={r.id} r={r} />)}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default RefereeSchedulePage;
