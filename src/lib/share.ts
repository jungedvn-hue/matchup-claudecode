export const buildGroupUrl = (groupId: string) =>
  `${window.location.origin}/group/${groupId}`;

export const buildEventUrl = (groupId: string, eventId: string) =>
  `${window.location.origin}/group/${groupId}?event=${eventId}`;

export type ShareOutcome = "shared" | "copied" | "failed";

export const shareOrCopy = async (payload: {
  title: string;
  text: string;
  url: string;
}): Promise<ShareOutcome> => {
  // Native share sheet (mobile)
  if (typeof navigator !== "undefined" && "share" in navigator) {
    try {
      await (navigator as any).share(payload);
      return "shared";
    } catch (e: any) {
      // User cancelled — don't fall through to clipboard, but report success-ish
      if (e?.name === "AbortError") return "failed";
      // Otherwise fall through to clipboard
    }
  }
  // Clipboard fallback
  try {
    await navigator.clipboard.writeText(payload.url);
    return "copied";
  } catch {
    return "failed";
  }
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};
