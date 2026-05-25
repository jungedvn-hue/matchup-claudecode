import { type ReactNode, useEffect } from "react";
import { useTranslation } from "react-i18next";
import i18n, { SUPPORTED_LANGUAGES, type Language } from "./index";

export type { Language };

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  // i18next is initialized at module load. The provider is a no-op boundary
  // that ensures the i18n module is imported before consumers run.
  useEffect(() => {
    if (!SUPPORTED_LANGUAGES.includes(i18n.language as Language)) {
      i18n.changeLanguage("en");
    }
  }, []);
  return <>{children}</>;
};

export const useLanguage = () => {
  const { t, i18n: instance } = useTranslation();
  return {
    language: (instance.language || "en") as Language,
    setLanguage: (lang: Language) => {
      instance.changeLanguage(lang);
    },
    t: (key: string, options?: Record<string, unknown>) => t(key, options) as string,
  };
};
