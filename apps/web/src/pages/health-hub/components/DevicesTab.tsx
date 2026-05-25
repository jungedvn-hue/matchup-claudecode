import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Bluetooth, RefreshCcw, Trash2, FileText, ExternalLink, Loader2, CheckCircle2, AlertCircle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useDeviceConnections, type DeviceProvider } from "@/hooks/useHealthExtras";
import BluetoothHRDialog from "./BluetoothHRDialog";
import CSVImportDialog from "./CSVImportDialog";
import { toast } from "sonner";

const sb = supabase as unknown as { functions: { invoke: (n: string, opts?: any) => any } };

interface ProviderInfo {
  key: DeviceProvider;
  name: string;
  bg: string;
  initial: string;
}

const OAUTH_PROVIDERS: ProviderInfo[] = [
  { key: "oura",   name: "Oura Ring",      bg: "#000000", initial: "O" },
  { key: "fitbit", name: "Fitbit",         bg: "#00B0B9", initial: "F" },
  { key: "garmin", name: "Garmin Connect", bg: "#007CC3", initial: "G" },
  { key: "whoop",  name: "Whoop",          bg: "#FF6B00", initial: "W" },
];

const DevicesTab = () => {
  const { t } = useLanguage();
  const { connections, loading, refetch, remove } = useDeviceConnections();
  const [search] = useSearchParams();
  const [btOpen, setBtOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);

  // Handle OAuth callback redirect
  useEffect(() => {
    const oauth = search.get("oauth");
    const provider = search.get("provider");
    if (oauth === "success" && provider) {
      toast.success(t("health.device.connected") + " — " + provider);
      refetch();
      window.history.replaceState({}, "", window.location.pathname + window.location.hash);
    } else if (oauth === "error") {
      toast.error(t("health.device.connectFailed"));
      window.history.replaceState({}, "", window.location.pathname + window.location.hash);
    }
  }, [search, t, refetch]);

  const handleOAuthConnect = async (provider: DeviceProvider) => {
    setConnecting(provider);
    try {
      const { data, error } = await sb.functions.invoke("health-oauth/init", {
        body: null, // GET
        method: "GET" as any,
        // Note: supabase-js doesn't natively support GET; fall back to fetch
      });
      if (error) throw error;
      if (data?.authorize_url) window.location.href = data.authorize_url;
    } catch {
      // Fallback: direct fetch
      try {
        const session = (await (supabase as any).auth.getSession())?.data?.session;
        const token = session?.access_token;
        const supabaseUrl = (supabase as any).supabaseUrl ?? "";
        const res = await fetch(`${supabaseUrl}/functions/v1/health-oauth/init?provider=${provider}`, {
          headers: { "Authorization": `Bearer ${token}` },
        });
        const data = await res.json();
        if (data?.authorize_url) window.location.href = data.authorize_url;
        else toast.error(data?.error ?? "Init failed");
      } catch (e) {
        toast.error((e as Error).message);
      }
    } finally {
      setConnecting(null);
    }
  };

  const handleSync = async (connectionId: string) => {
    setSyncing(connectionId);
    const { data, error } = await sb.functions.invoke("health-sync", { body: { connection_id: connectionId } });
    setSyncing(null);
    if (error) { toast.error(error.message ?? "Sync failed"); return; }
    if (data?.error) { toast.error(data.error); return; }
    toast.success(t("health.device.syncSuccess", { count: data?.upserted ?? 0 }));
    refetch();
  };

  const handleDisconnect = async (connectionId: string, name: string) => {
    if (!confirm(t("health.device.confirmDisconnect", { name }))) return;
    const { error } = await remove(connectionId);
    if (error) toast.error(error.message);
    else toast.success(t("health.device.disconnected"));
  };

  // Group connections by provider
  const byProvider = new Map<DeviceProvider, typeof connections>();
  connections.forEach(c => {
    const arr = byProvider.get(c.provider) ?? [];
    arr.push(c);
    byProvider.set(c.provider, arr);
  });

  return (
    <div className="space-y-3">
      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => setBtOpen(true)}
          className="p-3 rounded-2xl bg-gradient-to-br from-blue-500/15 to-blue-500/5 border border-blue-500/20 text-left hover:shadow-md transition-all active:scale-95">
          <div className="h-9 w-9 rounded-xl bg-blue-500/20 flex items-center justify-center mb-2">
            <Bluetooth className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-sm font-display font-bold text-foreground">{t("health.device.bluetooth")}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{t("health.device.bluetoothDesc")}</p>
        </button>
        <button onClick={() => setCsvOpen(true)}
          className="p-3 rounded-2xl bg-gradient-to-br from-violet-500/15 to-violet-500/5 border border-violet-500/20 text-left hover:shadow-md transition-all active:scale-95">
          <div className="h-9 w-9 rounded-xl bg-violet-500/20 flex items-center justify-center mb-2">
            <FileText className="h-4 w-4 text-violet-600 dark:text-violet-400" />
          </div>
          <p className="text-sm font-display font-bold text-foreground">{t("health.device.csv")}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{t("health.device.csvDesc")}</p>
        </button>
      </div>

      {/* Connected devices */}
      {connections.length > 0 && (
        <Card className="p-4 shadow-card">
          <h3 className="text-sm font-display font-bold text-foreground mb-2.5">{t("health.devices.connected")}</h3>
          <div className="space-y-2">
            {connections.map(c => (
              <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/40 border border-border">
                <ProviderAvatar provider={c.provider} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{c.device_name ?? c.provider}</p>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    {c.last_sync_at ? (
                      <><CheckCircle2 className="h-3 w-3 text-primary" /> {t("health.device.lastSync")} {new Date(c.last_sync_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</>
                    ) : (
                      <><AlertCircle className="h-3 w-3 text-amber-500" /> {t("health.device.neverSynced")}</>
                    )}
                  </p>
                </div>
                {["garmin","oura","fitbit","whoop"].includes(c.provider) && (
                  <button onClick={() => handleSync(c.id)} disabled={syncing === c.id}
                    className="h-8 w-8 rounded-lg bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground"
                    aria-label="Sync">
                    {syncing === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5" />}
                  </button>
                )}
                <button onClick={() => handleDisconnect(c.id, c.device_name ?? c.provider)}
                  className="h-8 w-8 rounded-lg bg-card border border-border flex items-center justify-center text-rose-500 hover:bg-rose-500/10"
                  aria-label="Disconnect">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* OAuth providers */}
      <Card className="p-4 shadow-card">
        <h3 className="text-sm font-display font-bold text-foreground mb-2.5">{t("health.devices.connectMore")}</h3>
        <div className="space-y-2">
          {OAUTH_PROVIDERS.filter(p => !byProvider.has(p.key)).map(p => (
            <div key={p.key} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 border border-border">
              <div className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: p.bg }}>
                <span className="text-white font-extrabold text-lg">{p.initial}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-display font-bold text-foreground">{p.name}</p>
                <p className="text-[10px] text-muted-foreground">{t("health.device.viaOAuth")}</p>
              </div>
              <button onClick={() => handleOAuthConnect(p.key)} disabled={connecting === p.key}
                className="h-9 px-3 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1.5 disabled:opacity-50">
                {connecting === p.key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
                {t("health.device.connect")}
              </button>
            </div>
          ))}
        </div>
      </Card>

      <BluetoothHRDialog open={btOpen} onOpenChange={setBtOpen} />
      <CSVImportDialog open={csvOpen} onOpenChange={setCsvOpen} onImported={refetch} />
    </div>
  );
};

const ProviderAvatar = ({ provider }: { provider: DeviceProvider }) => {
  const meta: Record<DeviceProvider, { bg: string; label: string }> = {
    garmin: { bg: "#007CC3", label: "G" },
    oura: { bg: "#000000", label: "O" },
    fitbit: { bg: "#00B0B9", label: "F" },
    whoop: { bg: "#FF6B00", label: "W" },
    google_fit: { bg: "#4285F4", label: "GF" },
    samsung_health: { bg: "#1428A0", label: "S" },
    web_bluetooth: { bg: "#0078D4", label: "BT" },
    csv_import: { bg: "#7C3AED", label: "CSV" },
  };
  const m = meta[provider];
  return (
    <div className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: m.bg }}>
      <span className="text-white font-extrabold text-xs">{m.label}</span>
    </div>
  );
};

export default DevicesTab;
