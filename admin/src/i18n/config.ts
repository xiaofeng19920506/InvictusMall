import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "../locales/en/common.json";
import zh from "../locales/zh/common.json";
import es from "../locales/es/common.json";
import fr from "../locales/fr/common.json";
import ko from "../locales/ko/common.json";
import ja from "../locales/ja/common.json";

const resources = {
  en: { translation: en },
  zh: { translation: zh },
  es: { translation: es },
  fr: { translation: fr },
  ko: { translation: ko },
  ja: { translation: ja },
};

export const SUPPORTED_LANGUAGES = ["en", "zh", "es", "fr", "ko", "ja"] as const;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    supportedLngs: SUPPORTED_LANGUAGES,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      caches: ["localStorage"],
      lookupLocalStorage: "admin-app-language",
    },
  });

export default i18n;
