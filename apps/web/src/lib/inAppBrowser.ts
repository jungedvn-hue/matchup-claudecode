// Detect in-app browsers (FB, Messenger, Instagram, Zalo, Line, WeChat, TikTok…)
// Google OAuth blocks these with `disallowed_useragent` (403).

export type InAppBrowser =
  | "facebook" | "messenger" | "instagram" | "zalo" | "line"
  | "wechat" | "tiktok" | "twitter" | "linkedin" | "snapchat"
  | "other" | null;

export type Platform = "ios" | "android" | "other";

export const detectPlatform = (): Platform => {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent || "";
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "other";
};

export const detectInAppBrowser = (): InAppBrowser => {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent || "";

  if (/FBAN|FBAV|FB_IAB/i.test(ua)) return "facebook";
  if (/Messenger/i.test(ua)) return "messenger";
  if (/Instagram/i.test(ua)) return "instagram";
  if (/Zalo/i.test(ua)) return "zalo";
  if (/Line\//i.test(ua)) return "line";
  if (/MicroMessenger/i.test(ua)) return "wechat";
  if (/TikTok|musical_ly|BytedanceWebview/i.test(ua)) return "tiktok";
  if (/Twitter/i.test(ua)) return "twitter";
  if (/LinkedInApp/i.test(ua)) return "linkedin";
  if (/Snapchat/i.test(ua)) return "snapchat";

  // Generic webview detection (last resort)
  // iOS: WKWebView without Safari token
  const platform = detectPlatform();
  if (platform === "ios" && /AppleWebKit/i.test(ua) && !/Safari/i.test(ua)) return "other";
  // Android: wv token
  if (platform === "android" && /wv\)/i.test(ua)) return "other";

  return null;
};

export const isInAppBrowser = (): boolean => detectInAppBrowser() !== null;

export const isStandalonePWA = (): boolean => {
  if (typeof window === "undefined") return false;
  // iOS Safari "added to home screen"
  if ((navigator as any).standalone === true) return true;
  // Other browsers (Chrome installed PWA)
  return window.matchMedia?.("(display-mode: standalone)").matches ?? false;
};

/** Try to force-open the current URL in the system browser. */
export const openInSystemBrowser = (url: string): void => {
  const platform = detectPlatform();

  if (platform === "ios") {
    // x-safari-https:// → forces Safari from any in-app browser on iOS
    const safariUrl = url.replace(/^https?:\/\//, "x-safari-https://");
    window.location.href = safariUrl;
    return;
  }

  if (platform === "android") {
    // intent:// → forces Chrome (or default browser) on Android
    const intentUrl = url.replace(
      /^https?:\/\//,
      "intent://"
    ) + "#Intent;scheme=https;package=com.android.chrome;end;";
    window.location.href = intentUrl;
    return;
  }

  // Fallback: open new tab
  window.open(url, "_blank", "noopener,noreferrer");
};
