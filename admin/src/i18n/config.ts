import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "../locales/en/common.json";
import zh from "../locales/zh/common.json";
import es from "../locales/es/common.json";
import fr from "../locales/fr/common.json";
import ko from "../locales/ko/common.json";
import ja from "../locales/ja/common.json";
import de from "../locales/de/common.json";
import pt from "../locales/pt/common.json";
import ru from "../locales/ru/common.json";
import ar from "../locales/ar/common.json";
import it from "../locales/it/common.json";
import nl from "../locales/nl/common.json";
import pl from "../locales/pl/common.json";
import tr from "../locales/tr/common.json";
import vi from "../locales/vi/common.json";
import th from "../locales/th/common.json";
import id from "../locales/id/common.json";
import hi from "../locales/hi/common.json";

const resources = {
  en: { translation: en },
  zh: { translation: zh },
  es: { translation: es },
  fr: { translation: fr },
  ko: { translation: ko },
  ja: { translation: ja },
  de: { translation: de },
  pt: { translation: pt },
  ru: { translation: ru },
  ar: { translation: ar },
  it: { translation: it },
  nl: { translation: nl },
  pl: { translation: pl },
  tr: { translation: tr },
  vi: { translation: vi },
  th: { translation: th },
  id: { translation: id },
  hi: { translation: hi },
};

export const SUPPORTED_LANGUAGES = [
<<<<<<< HEAD
  "en", "zh", "es", "fr", "ko", "ja", 
  "de", "pt", "ru", "ar", "it", "nl", 
  "pl", "tr", "vi", "th", "id", "hi"
=======
  "en",
  "zh",
  "es",
  "fr",
  "ko",
  "ja",
  "de",
  "pt",
  "ru",
  "ar",
  "it",
  "nl",
  "pl",
  "tr",
  "vi",
  "th",
  "id",
  "hi",
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
] as const;

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
