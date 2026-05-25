import { useEffect, useRef, useState } from "react";
import { Bluetooth, BluetoothConnected, BluetoothOff, Heart, Loader2, AlertCircle, X, Save } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/i18n/LanguageContext";
import { useDeviceConnections } from "@/hooks/useHealthExtras";
import { useHealthData } from "@/hooks/useHealthData";
import { toast } from "sonner";

// Standard Bluetooth GATT Heart Rate service: 0x180D
// Heart Rate Measurement characteristic: 0x2A37
const HR_SERVICE = "heart_rate";
const HR_MEASUREMENT = "heart_rate_measurement";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const BluetoothHRDialog = ({ open, onOpenChange }: Props) => {
  const { t } = useLanguage();
  const { upsertBluetooth } = useDeviceConnections();
  const { upsertToday } = useHealthData(7);

  const [supported] = useState(() => typeof navigator !== "undefined" && !!(navigator as any).bluetooth);
  const [scanning, setScanning] = useState(false);
  const [connected, setConnected] = useState(false);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [currentHr, setCurrentHr] = useState<number | null>(null);
  const [readings, setReadings] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const deviceRef = useRef<any>(null);
  const charRef = useRef<any>(null);

  const startSession = () => { setReadings([]); setCurrentHr(null); setError(null); };

  const connect = async () => {
    if (!supported) return;
    setScanning(true); setError(null);
    try {
      const device: any = await (navigator as any).bluetooth.requestDevice({
        filters: [{ services: [HR_SERVICE] }],
        optionalServices: [HR_SERVICE],
      });
      setDeviceName(device.name ?? "Heart Rate Monitor");
      device.addEventListener("gattserverdisconnected", () => {
        setConnected(false);
        toast.info(t("bt.disconnected"));
      });
      const server = await device.gatt.connect();
      const service = await server.getPrimaryService(HR_SERVICE);
      const char = await service.getCharacteristic(HR_MEASUREMENT);
      await char.startNotifications();
      char.addEventListener("characteristicvaluechanged", (e: any) => {
        const v = e.target.value as DataView;
        // Per Bluetooth GATT HR Measurement spec
        const flags = v.getUint8(0);
        const hr = (flags & 0x1) ? v.getUint16(1, true) : v.getUint8(1);
        if (hr > 0 && hr < 250) {
          setCurrentHr(hr);
          setReadings(prev => [...prev.slice(-300), hr]); // keep last ~5 min
        }
      });
      deviceRef.current = device;
      charRef.current = char;
      setConnected(true);
      startSession();

      // Save connection record
      await upsertBluetooth(device.name ?? "Bluetooth HR", { gatt_service: HR_SERVICE });
      toast.success(t("bt.connected", { name: device.name ?? "Device" }));
    } catch (e: any) {
      setError(e.message ?? "Connection failed");
    } finally {
      setScanning(false);
    }
  };

  const disconnect = async () => {
    try {
      if (charRef.current) await charRef.current.stopNotifications();
      if (deviceRef.current?.gatt?.connected) deviceRef.current.gatt.disconnect();
    } catch {}
    setConnected(false);
  };

  useEffect(() => {
    if (!open) disconnect();
    return () => disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const stats = readings.length > 0 ? {
    avg: Math.round(readings.reduce((s, n) => s + n, 0) / readings.length),
    min: Math.min(...readings),
    max: Math.max(...readings),
  } : null;

  const saveSession = async () => {
    if (!stats) return;
    const { error } = await upsertToday({ avg_hr: stats.avg, resting_hr: stats.min });
    if (error) toast.error(error.message);
    else { toast.success(t("bt.sessionSaved")); onOpenChange(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-center flex items-center justify-center gap-2">
            <Bluetooth className="h-4 w-4 text-blue-500" /> {t("bt.title")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          {!supported && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-foreground">{t("bt.notSupported")}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{t("bt.notSupportedHint")}</p>
              </div>
            </div>
          )}

          {supported && !connected && (
            <>
              <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-3">
                <p className="text-xs text-foreground/85 leading-relaxed">{t("bt.howItWorks")}</p>
              </div>
              <button onClick={connect} disabled={scanning}
                className="w-full h-12 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50">
                {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bluetooth className="h-4 w-4" />}
                {t("bt.connect")}
              </button>
              {error && (
                <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-2.5 text-[11px] text-foreground/85">
                  {error}
                </div>
              )}
            </>
          )}

          {connected && (
            <>
              <div className="rounded-2xl bg-gradient-to-br from-rose-500/15 via-rose-500/5 to-card border border-rose-500/20 p-5 text-center">
                <div className="flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                  <BluetoothConnected className="h-3 w-3 text-blue-500" /> {deviceName}
                </div>
                <div className="mt-3 flex items-baseline justify-center gap-2">
                  <Heart className="h-6 w-6 text-rose-500 animate-pulse" />
                  <p className="text-5xl font-display font-bold text-foreground tabular-nums">{currentHr ?? "—"}</p>
                  <p className="text-sm font-semibold text-muted-foreground">bpm</p>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">{readings.length} {t("bt.samples")}</p>
              </div>

              {stats && (
                <div className="grid grid-cols-3 gap-2">
                  <Stat label={t("bt.avg")} value={stats.avg} />
                  <Stat label={t("bt.min")} value={stats.min} />
                  <Stat label={t("bt.max")} value={stats.max} />
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={disconnect} className="flex-1 h-10 rounded-xl border border-border text-sm font-semibold flex items-center justify-center gap-1.5">
                  <BluetoothOff className="h-3.5 w-3.5" /> {t("bt.disconnect")}
                </button>
                <button onClick={saveSession} disabled={!stats}
                  className="flex-1 h-10 rounded-xl bg-primary hover:bg-primary text-white font-bold flex items-center justify-center gap-1.5 disabled:opacity-40">
                  <Save className="h-3.5 w-3.5" /> {t("bt.saveSession")}
                </button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

const Stat = ({ label, value }: { label: string; value: number }) => (
  <div className="text-center p-2 rounded-xl bg-secondary/50">
    <p className="text-[9px] uppercase tracking-wider font-semibold text-muted-foreground">{label}</p>
    <p className="text-base font-display font-bold tabular-nums text-foreground">{value}</p>
  </div>
);

export default BluetoothHRDialog;
