import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CalendarClock, CheckCircle2, Loader2, LogIn, LogOut, MapPin, Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useRefereeAttendance } from "@/hooks/useReferee";
import { toast } from "sonner";

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

const ScheduleTab = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [items, setItems] = useState<TourRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { items: attendance, checkIn, checkOut } = useRefereeAttendance(user?.id);
  const [busyId, setBusyId] = useState<string | null>(null);

  const attMap = useMemo(() => {
    const m = new Map<string, { check_in_at: string | null; check_out_at: string | null }>();
    for (const a of attendance) m.set(a.tournament_id, { check_in_at: a.check_in_at, check_out_at: a.check_out_at });
    return m;
  }, [attendance]);

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

  const handleCheck = async (e: React.MouseEvent, tournamentId: string, mode: "in" | "out") => {
    e.stopPropagation();
    setBusyId(tournamentId);
    const res = mode === "in" ? await checkIn(tournamentId) : await checkOut(tournamentId);
    setBusyId(null);
    if (res.error) toast.error(t("ref.attendance.error"));
    else toast.success(t(mode === "in" ? "ref.attendance.checkedIn" : "ref.attendance.checkedOut"));
  };

  const fmtTime = (s: string | null) => s ? new Date(s).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "";

  const Row = ({ r }: { r: TourRow }) => {
    const att = attMap.get(r.id);
    const checkedIn = !!att?.check_in_at;
    const checkedOut = !!att?.check_out_at;
    const busy = busyId === r.id;
    return (
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

        <div className="mt-2 pt-2 border-t border-border/60 flex items-center justify-between gap-2">
          <div className="text-[11px] text-muted-foreground min-w-0 flex-1">
            {checkedOut ? (
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                <CheckCircle2 className="h-3 w-3" />
                {t("ref.attendance.completed")} · {fmtTime(att!.check_in_at)} – {fmtTime(att!.check_out_at)}
              </span>
            ) : checkedIn ? (
              <span className="inline-flex items-center gap-1 text-primary font-semibold">
                <LogIn className="h-3 w-3" />
                {t("ref.attendance.checkedInAt")} {fmtTime(att!.check_in_at)}
              </span>
            ) : (
              <span>{t("ref.attendance.notYet")}</span>
            )}
          </div>
          {!checkedOut && (
            <Button
              variant={checkedIn ? "default" : "outline"}
              size="sm"
              className="h-7 px-2 text-[11px]"
              disabled={busy}
              onClick={(e) => handleCheck(e, r.id, checkedIn ? "out" : "in")}
            >
              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : checkedIn ? <LogOut className="h-3 w-3 mr-1" /> : <LogIn className="h-3 w-3 mr-1" />}
              {!busy && t(checkedIn ? "ref.attendance.checkOut" : "ref.attendance.checkIn")}
            </Button>
          )}
        </div>
      </Card>
    );
  };

  if (loading) return <div className="py-12 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground/50" /></div>;
  if (items.length === 0) return (
    <Card className="p-8 text-center text-sm text-muted-foreground space-y-2">
      <Trophy className="h-8 w-8 mx-auto text-muted-foreground/30" />
      <p>{t("refSchedule.empty")}</p>
    </Card>
  );

  return (
    <div className="space-y-4">
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
    </div>
  );
};

export default ScheduleTab;
