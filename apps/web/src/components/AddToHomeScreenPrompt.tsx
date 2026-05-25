import { useEffect, useState } from "react";
import { Smartphone, X, Share, Plus } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import {
  detectPlatform, isStandalonePWA, isInAppBrowser,
} from "@/lib/inAppBrowser";

const DISMISS_KEY = "a2hs-dismissed-at";
const DISMISS_DAYS = 14;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const AddToHomeScreenPrompt = () => {
  const { t } = useLanguage();
  const [show, setShow] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const platform = typeof window !== "undefined" ? detectPlatform() : "other";

  useEffect(() => {
    if (isStandalonePWA() || isInAppBrowser()) return;

    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) ?? "0");
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_DAYS * 86400000) return;

    // Android / Chrome desktop: real beforeinstallprompt
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    // iOS: no native prompt — show manual instructions after a delay
    if (platform === "ios") {
      const timer = setTimeout(() => setShow(true), 4000);
      return () => { window.removeEventListener("beforeinstallprompt", onPrompt); clearTimeout(timer); };
    }
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, [platform]);

  if (!show) return null;

  const handleInstall = async () => {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
    }
    handleDismiss();
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setShow(false);
  };

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm">
      <div className="rounded-2xl bg-card border border-border shadow-2xl p-3.5 flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Smartphone className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-display font-bold text-foreground">{t("a2hs.title")}</p>
          {platform === "ios" ? (
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed flex flex-wrap items-center gap-1">
              <span>{t("a2hs.iosStep1")}</span>
              <Share className="inline h-3 w-3 text-blue-500" />
              <span>{t("a2hs.iosStep2")}</span>
              <Plus className="inline h-3 w-3 text-foreground" />
              <span>{t("a2hs.iosStep3")}</span>
            </p>
          ) : (
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{t("a2hs.androidDesc")}</p>
          )}
          {deferred && (
            <button
              onClick={handleInstall}
              className="mt-2 h-8 px-3 rounded-lg bg-primary text-primary-foreground text-[11px] font-bold hover:bg-primary/90 active:scale-95 transition-all"
            >
              {t("a2hs.install")}
            </button>
          )}
        </div>
        <button
          onClick={handleDismiss}
          className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary shrink-0"
          aria-label={t("common.close")}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default AddToHomeScreenPrompt;
