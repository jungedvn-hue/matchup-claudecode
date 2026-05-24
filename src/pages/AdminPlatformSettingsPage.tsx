import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Settings, Loader2, Save, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/i18n/LanguageContext";
import { usePlatformSettings, type PlatformSetting } from "@/hooks/usePlatformSettings";
import { toast } from "sonner";

const knownMeta: Record<string, { format: "percent" | "vnd" | "text" | "json"; hint?: string }> = {
  booking_commission_pct: { format: "percent", hint: "Commission % applied to each court booking. 0-100." },
};

const SettingRow = ({ setting, onSave }: { setting: PlatformSetting; onSave: (key: string, value: unknown) => Promise<{ error: unknown }> }) => {
  const { t } = useLanguage();
  const meta = knownMeta[setting.key] ?? { format: "json" as const };
  const [raw, setRaw] = useState("");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (meta.format === "percent" || meta.format === "vnd") {
      setRaw(String(setting.value ?? ""));
    } else if (meta.format === "text") {
      setRaw(String(setting.value ?? ""));
    } else {
      setRaw(JSON.stringify(setting.value, null, 2));
    }
    setDirty(false);
  }, [setting.key, setting.value, meta.format]);

  const submit = async () => {
    setSaving(true);
    let parsed: unknown;
    try {
      if (meta.format === "percent") {
        const n = Number(raw);
        if (!Number.isFinite(n) || n < 0 || n > 100) { toast.error("0–100 expected"); setSaving(false); return; }
        parsed = n;
      } else if (meta.format === "vnd") {
        const n = Number(raw);
        if (!Number.isFinite(n) || n < 0) { toast.error("Must be a non-negative number"); setSaving(false); return; }
        parsed = Math.round(n);
      } else if (meta.format === "text") {
        parsed = raw;
      } else {
        parsed = JSON.parse(raw);
      }
    } catch (e) {
      toast.error("Invalid value");
      setSaving(false); return;
    }
    const { error } = await onSave(setting.key, parsed);
    setSaving(false);
    if (error) toast.error((error as any)?.message ?? "Save failed");
    else { toast.success(t("admin.settings.saved")); setDirty(false); }
  };

  return (
    <Card className="p-4 shadow-card space-y-2">
      <div>
        <p className="text-sm font-display font-bold text-foreground">{setting.key}</p>
        {(setting.description || meta.hint) && (
          <p className="text-[11px] text-muted-foreground mt-0.5">{setting.description ?? meta.hint}</p>
        )}
      </div>

      <div className="flex items-end gap-2">
        {meta.format === "percent" ? (
          <div className="flex-1 relative">
            <Input
              type="number" min={0} max={100} step="0.01"
              value={raw}
              onChange={(e) => { setRaw(e.target.value); setDirty(true); }}
              className="h-9 tabular-nums pr-8"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
          </div>
        ) : meta.format === "vnd" ? (
          <div className="flex-1 relative">
            <Input
              type="number" min={0}
              value={raw}
              onChange={(e) => { setRaw(e.target.value); setDirty(true); }}
              className="h-9 tabular-nums pr-10"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">đ</span>
          </div>
        ) : meta.format === "text" ? (
          <Input
            value={raw}
            onChange={(e) => { setRaw(e.target.value); setDirty(true); }}
            className="h-9 flex-1"
          />
        ) : (
          <Textarea
            value={raw}
            onChange={(e) => { setRaw(e.target.value); setDirty(true); }}
            className="font-mono text-[11px] flex-1 min-h-[80px]"
          />
        )}
        <Button onClick={submit} disabled={saving || !dirty} size="sm" className="gap-1.5 h-9">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          {t("common.save")}
        </Button>
      </div>

      <p className="text-[10px] text-muted-foreground tabular-nums">
        {t("admin.settings.lastUpdated")}: {new Date(setting.updated_at).toLocaleString("vi-VN")}
      </p>
    </Card>
  );
};

const AdminPlatformSettingsPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { items, loading, update } = usePlatformSettings();

  return (
    <div className="pb-24 min-h-screen">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button onClick={() => navigate(-1)} className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg font-display font-bold text-foreground flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" /> {t("admin.settings.title")}
            </h1>
            <p className="text-xs text-muted-foreground truncate">{t("admin.settings.subtitle")}</p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 max-w-2xl mx-auto space-y-3">
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-700 dark:text-amber-400">{t("admin.settings.warning")}</p>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground/50" /></div>
        ) : items.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">{t("admin.settings.empty")}</Card>
        ) : (
          items.map(s => <SettingRow key={s.key} setting={s} onSave={update} />)
        )}
      </div>
    </div>
  );
};

export default AdminPlatformSettingsPage;
