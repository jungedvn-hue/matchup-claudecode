import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Radio, Plus, X, ExternalLink, Youtube, Facebook } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import type { LivestreamLink, LivestreamPlatform } from "@/lib/tournament/types";

const PLATFORMS: LivestreamPlatform[] = ["youtube", "facebook", "tiktok", "twitch", "custom"];

const detectPlatform = (url: string): LivestreamPlatform => {
  const u = url.toLowerCase();
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube";
  if (u.includes("facebook.com") || u.includes("fb.watch")) return "facebook";
  if (u.includes("tiktok.com")) return "tiktok";
  if (u.includes("twitch.tv")) return "twitch";
  return "custom";
};

const isValidUrl = (s: string): boolean => {
  try { new URL(s); return true; } catch { return false; }
};

const PlatformIcon = ({ platform, className }: { platform: LivestreamPlatform; className?: string }) => {
  if (platform === "youtube") return <Youtube className={className} />;
  if (platform === "facebook") return <Facebook className={className} />;
  return <Radio className={className} />;
};

interface EditorProps {
  value: LivestreamLink[];
  onChange: (next: LivestreamLink[]) => void;
}

export const LivestreamEditor = ({ value, onChange }: EditorProps) => {
  const { t } = useLanguage();

  const add = () => {
    onChange([...value, { platform: "youtube", url: "", label: "" }]);
  };

  const update = (idx: number, patch: Partial<LivestreamLink>) => {
    const next = [...value];
    next[idx] = { ...next[idx], ...patch };
    if (patch.url !== undefined) next[idx].platform = detectPlatform(patch.url);
    onChange(next);
  };

  const remove = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-3">
      {value.length === 0 && (
        <p className="text-xs text-muted-foreground">{t("tm.livestream.empty")}</p>
      )}
      {value.map((link, idx) => {
        const invalid = link.url.length > 0 && !isValidUrl(link.url);
        return (
          <div key={idx} className="space-y-2 p-3 rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PlatformIcon platform={link.platform} className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold capitalize">{t(`tm.livestream.platform.${link.platform}`)}</span>
              </div>
              <button onClick={() => remove(idx)} className="h-7 w-7 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex items-center justify-center">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px]">{t("tm.livestream.url")}</Label>
              <Input
                value={link.url}
                onChange={(e) => update(idx, { url: e.target.value })}
                placeholder="https://"
                className="h-8 text-xs"
              />
              {invalid && <p className="text-[10px] text-destructive">{t("tm.livestream.invalidUrl")}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px]">{t("tm.livestream.label")}</Label>
              <Input
                value={link.label ?? ""}
                onChange={(e) => update(idx, { label: e.target.value })}
                placeholder="Court 1, Final, ..."
                className="h-8 text-xs"
              />
            </div>
          </div>
        );
      })}
      <Button variant="outline" size="sm" onClick={add} className="w-full h-8 text-xs gap-1.5">
        <Plus className="h-3.5 w-3.5" /> {t("tm.livestream.add")}
      </Button>
    </div>
  );
};

interface DisplayProps {
  links: LivestreamLink[];
}

export const LivestreamDisplay = ({ links }: DisplayProps) => {
  const { t } = useLanguage();
  const valid = links.filter(l => isValidUrl(l.url));
  if (valid.length === 0) return null;

  return (
    <Card className="p-3 shadow-card overflow-hidden bg-gradient-to-br from-red-500/5 via-card to-card">
      <div className="flex items-center gap-2 mb-2.5">
        <div className="h-7 w-7 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500">
          <Radio className="h-3.5 w-3.5" />
        </div>
        <h3 className="text-sm font-display font-bold text-foreground">{t("tm.livestream.title")}</h3>
        <span className="ml-auto text-[9px] font-bold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded-full">LIVE</span>
      </div>
      <div className="space-y-1.5">
        {valid.map((link, idx) => (
          <a
            key={idx}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-secondary transition-colors group"
          >
            <PlatformIcon platform={link.platform} className="h-4 w-4 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">
                {link.label || t(`tm.livestream.platform.${link.platform}`)}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">{link.url}</p>
            </div>
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary shrink-0" />
          </a>
        ))}
      </div>
    </Card>
  );
};
