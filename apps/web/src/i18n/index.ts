import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./locales/en.json";
import vi from "./locales/vi.json";
import zh from "./locales/zh.json";
import th from "./locales/th.json";
import id from "./locales/id.json";

export const SUPPORTED_LANGUAGES = ["en", "vi", "zh", "th", "id"] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_META: Record<Language, { label: string; flag: string }> = {
  en: { label: "English", flag: "🇺🇸" },
  vi: { label: "Tiếng Việt", flag: "🇻🇳" },
  zh: { label: "中文", flag: "🇨🇳" },
  th: { label: "ภาษาไทย", flag: "🇹🇭" },
  id: { label: "Bahasa Indonesia", flag: "🇮🇩" },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      vi: { translation: vi },
      zh: { translation: zh },
      th: { translation: th },
      id: { translation: id },
    },
    fallbackLng: "en",
    supportedLngs: SUPPORTED_LANGUAGES,
    nonExplicitSupportedLngs: true,
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "pickleplay_language",
      caches: ["localStorage"],
    },
    returnNull: false,
    keySeparator: false,
    nsSeparator: false,
  });

export default i18n;
