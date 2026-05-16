import { useEffect, useState } from "react";
import { AlertTriangle, ExternalLink, Copy, Check, X } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import {
  detectInAppBrowser, detectPlatform, openInSystemBrowser, isStandalonePWA,
  type InAppBrowser,
} from "@/lib/inAppBrowser";
import { copyToClipboard } from "@/lib/share";
import { toast } from "sonner";

const DISMISS_KEY = "iab-banner-dismissed";

const labelFor = (b: InAppBrowser): string => {
  switch (b) {
    case "facebook": return "Facebook";
    case "messenger": return "Messenger";
    case "instagram": return "Instagram";
    case "zalo": return "Zalo";
    case "line": return "LINE";
    case "wechat": return "WeChat";
    case "tiktok": return "TikTok";
    case "twitter": return "X / Twitter";
    case "linkedin": return "LinkedIn";
    case "snapchat": return "Snapchat";
    default: return "in-app browser";
  }
};

const InAppBrowserBanner = () => {
  const { t } = useLanguage();
  const [browser, setBrowser] = useState<InAppBrowser>(null);
  const [dismissed, setDismissed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isStandalonePWA()) return;
    setBrowser(detectInAppBrowser());
    setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  if (!browser || dismissed) return null;

  const platform = detectPlatform();
  const url = window.location.href;

  const handleOpen = () => openInSystemBrowser(url);

  const handleCopy = async () => {
    const ok = await copyToClipboard(url);
    if (ok) {
      setCopied(true);
      toast.success(t("share.copied"));
      setTimeout(() => setCopied(false), 1800);
    }
  };

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  const browserLabel = labelFor(browser);
  const targetBrowser = platform === "ios" ? "Safari" : platform === "android" ? "Chrome" : t("iab.systemBrowser");

  return (
    <div className="bg-amber-500/10 border-b-2 border-amber-500/40 px-4 py-3">
      <div className="max-w-2xl mx-auto flex items-start gap-3">
        <div className="h-9 w-9 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-display font-bold text-foreground">
            {t("iab.title")}
          </p>
          <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">
            {t("iab.description", { browser: browserLabel, target: targetBrowser })}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            <button
              onClick={handleOpen}
              className="h-8 px-3 rounded-lg bg-primary text-primary-foreground text-[11px] font-bold flex items-center gap-1.5 hover:bg-primary/90 active:scale-95 transition-all"
            >
              <ExternalLink className="h-3 w-3" />
              {t("iab.openIn", { target: targetBrowser })}
            </button>
            <button
              onClick={handleCopy}
              className="h-8 px-3 rounded-lg bg-card border border-border text-[11px] font-semibold text-foreground flex items-center gap-1.5 hover:bg-secondary active:scale-95 transition-all"
            >
              {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
              {t("iab.copyLink")}
            </button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-card shrink-0 -mt-1"
          aria-label={t("common.close")}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default InAppBrowserBanner;
