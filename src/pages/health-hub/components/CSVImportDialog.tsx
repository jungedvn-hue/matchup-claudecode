import { useState } from "react";
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useDeviceConnections } from "@/hooks/useHealthExtras";
import { toast } from "sonner";

const sb = supabase as unknown as { from: (t: string) => any };

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onImported?: () => void;
}

interface ParsedRow {
  date: string;
  steps?: number;
  distance_km?: number;
  calories_burned?: number;
  avg_hr?: number;
  resting_hr?: number;
  hrv_ms?: number;
  sleep_hours?: number;
}

// Parse Garmin "DI_CONNECT/DI-Connect-Wellness" CSV (or generic CSV with headers)
const parseGarminCSV = (text: string): ParsedRow[] => {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const header = lines[0].split(",").map(h => h.trim().replace(/"/g, "").toLowerCase());
  const rows: ParsedRow[] = [];

  const idx = (name: string) => header.findIndex(h => h.includes(name));
  const iDate = idx("date") >= 0 ? idx("date") : idx("calendardate");
  const iSteps = idx("step");
  const iDist = idx("distance");
  const iCal = idx("calorie") >= 0 ? idx("calorie") : idx("kcal");
  const iAvgHr = idx("average") >= 0 && header[idx("average")].includes("hr") ? idx("average") : idx("avg_hr");
  const iRestHr = idx("resting");
  const iHrv = idx("hrv");
  const iSleep = idx("sleep");

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map(c => c.replace(/"/g, "").trim());
    if (iDate < 0 || !cols[iDate]) continue;
    const dateStr = cols[iDate];
    // Try to normalize to YYYY-MM-DD
    let date = dateStr;
    if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(dateStr)) {
      const [m, d, y] = dateStr.split("/");
      date = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    } else if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      date = dateStr.slice(0, 10);
    } else continue;

    const num = (i: number) => i >= 0 && cols[i] ? Number(cols[i].replace(/,/g, "")) || undefined : undefined;
    rows.push({
      date,
      steps: num(iSteps),
      distance_km: iDist >= 0 && cols[iDist] ? Number(cols[iDist]) / (cols[iDist].includes(".") && Number(cols[iDist]) > 100 ? 1000 : 1) : undefined,
      calories_burned: num(iCal),
      avg_hr: num(iAvgHr),
      resting_hr: num(iRestHr),
      hrv_ms: num(iHrv),
      sleep_hours: iSleep >= 0 && cols[iSleep] ? Number(cols[iSleep]) : undefined,
    });
  }
  return rows;
};

// Parse Apple Health export.xml — extract daily aggregates for HR / Steps / Sleep
const parseAppleHealth = (text: string): ParsedRow[] => {
  const map = new Map<string, ParsedRow>();
  const recordRegex = /<Record\s+([^/]*?)\/>/g;
  let m: RegExpExecArray | null;
  while ((m = recordRegex.exec(text)) !== null) {
    const attrs = m[1];
    const get = (k: string) => {
      const r = new RegExp(`${k}="([^"]+)"`).exec(attrs);
      return r ? r[1] : null;
    };
    const type = get("type");
    const start = get("startDate");
    const value = get("value");
    if (!type || !start || !value) continue;
    const date = start.slice(0, 10);
    const v = Number(value);
    if (isNaN(v)) continue;

    const existing = map.get(date) ?? { date };
    if (type.endsWith("StepCount")) existing.steps = (existing.steps ?? 0) + v;
    else if (type.endsWith("DistanceWalkingRunning")) existing.distance_km = (existing.distance_km ?? 0) + v;
    else if (type.endsWith("ActiveEnergyBurned")) existing.calories_burned = (existing.calories_burned ?? 0) + v;
    else if (type.endsWith("HeartRate")) existing.avg_hr = existing.avg_hr ? Math.round((existing.avg_hr + v) / 2) : v;
    else if (type.endsWith("RestingHeartRate")) existing.resting_hr = v;
    else if (type.endsWith("HeartRateVariabilitySDNN")) existing.hrv_ms = v;
    map.set(date, existing);
  }
  return Array.from(map.values());
};

const CSVImportDialog = ({ open, onOpenChange, onImported }: Props) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { upsertBluetooth } = useDeviceConnections();
  const [parsing, setParsing] = useState(false);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setParsing(true); setError(null); setDone(false);
    try {
      const text = await file.text();
      let parsed: ParsedRow[] = [];
      if (file.name.toLowerCase().endsWith(".xml") || text.trim().startsWith("<?xml")) {
        parsed = parseAppleHealth(text);
      } else {
        parsed = parseGarminCSV(text);
      }
      if (parsed.length === 0) { setError(t("csv.noRows")); return; }
      setRows(parsed);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    if (!user || rows.length === 0) return;
    setImporting(true);
    let count = 0;
    // Batch insert in chunks of 100
    for (let i = 0; i < rows.length; i += 100) {
      const chunk = rows.slice(i, i + 100).map(r => ({ ...r, user_id: user.id }));
      const { error } = await sb.from("health_daily_logs").upsert(chunk, { onConflict: "user_id,date" });
      if (!error) count += chunk.length;
    }
    await upsertBluetooth("CSV Import", { provider: "csv_import", source: "manual_upload", row_count: count });
    setImporting(false); setDone(true);
    toast.success(t("csv.imported", { count }));
    onImported?.();
    setTimeout(() => { onOpenChange(false); setRows([]); setDone(false); }, 1500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-center flex items-center justify-center gap-2">
            <FileText className="h-4 w-4 text-primary" /> {t("csv.title")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          <div className="rounded-xl bg-secondary/40 p-3 text-[11px] text-foreground/85 leading-relaxed space-y-1.5">
            <p><span className="font-bold">{t("csv.supportedFormats")}:</span></p>
            <ul className="list-disc list-inside text-muted-foreground">
              <li>Garmin Connect CSV export</li>
              <li>Apple Health export.xml</li>
              <li>Generic CSV (date, steps, distance, calories, hr…)</li>
            </ul>
          </div>

          {!rows.length && !done && (
            <label className="block w-full cursor-pointer">
              <div className="rounded-2xl border-2 border-dashed border-border p-6 text-center hover:border-primary/40 transition-colors">
                {parsing ? (
                  <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
                ) : (
                  <>
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground opacity-40" />
                    <p className="text-sm font-semibold text-foreground mt-2">{t("csv.tap")}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">CSV / XML, max 20MB</p>
                  </>
                )}
              </div>
              <input
                type="file"
                accept=".csv,.xml,text/csv,application/xml,text/xml"
                hidden
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
            </label>
          )}

          {rows.length > 0 && !done && (
            <>
              <div className="rounded-xl bg-primary/10 border border-primary/20 p-3 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <p className="text-sm text-foreground">
                  <span className="font-bold">{rows.length}</span> {t("csv.rowsParsed")}
                </p>
              </div>
              <div className="max-h-32 overflow-y-auto rounded-xl bg-secondary/30 p-2 text-[10px] font-mono">
                {rows.slice(0, 5).map((r, i) => (
                  <div key={i} className="text-muted-foreground truncate">
                    {r.date} · {r.steps ?? "—"} steps · {r.sleep_hours ?? "—"}h sleep
                  </div>
                ))}
                {rows.length > 5 && <div className="text-muted-foreground">+ {rows.length - 5} more…</div>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setRows([]); setError(null); }}
                  className="flex-1 h-10 rounded-xl border border-border text-sm font-semibold">{t("common.cancel")}</button>
                <button onClick={handleImport} disabled={importing}
                  className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground font-bold flex items-center justify-center gap-1.5 disabled:opacity-50">
                  {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {t("csv.import")}
                </button>
              </div>
            </>
          )}

          {done && (
            <div className="text-center py-4">
              <CheckCircle2 className="h-12 w-12 text-primary mx-auto" />
              <p className="text-base font-display font-bold text-foreground mt-2">{t("csv.success")}</p>
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
              <p className="text-sm text-foreground">{error}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CSVImportDialog;
