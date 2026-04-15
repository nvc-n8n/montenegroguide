import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";

import me from "@/locales/me.json";
import en from "@/locales/en.json";
import de from "@/locales/de.json";
import es from "@/locales/es.json";
import it from "@/locales/it.json";
import ru from "@/locales/ru.json";

export const SUPPORTED_LANGUAGES = [
  { code: "me", label: "Crnogorski", flag: "\uD83C\uDDF2\uD83C\uDDEA" },
  { code: "en", label: "English", flag: "\uD83C\uDDEC\uD83C\uDDE7" },
  { code: "de", label: "Deutsch", flag: "\uD83C\uDDE9\uD83C\uDDEA" },
  { code: "es", label: "Espanol", flag: "\uD83C\uDDEA\uD83C\uDDF8" },
  { code: "it", label: "Italiano", flag: "\uD83C\uDDEE\uD83C\uDDF9" },
  { code: "ru", label: "Russkij", flag: "\uD83C\uDDF7\uD83C\uDDFA" },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

const getDeviceLanguage = (): LanguageCode => {
  const locale = Localization.getLocales()[0]?.languageCode ?? "me";
  const mapped: Record<string, LanguageCode> = {
    sr: "me",
    hr: "me",
    bs: "me",
    cnr: "me",
    en: "en",
    de: "de",
    es: "es",
    it: "it",
    ru: "ru",
  };
  return mapped[locale] ?? "me";
};

i18n.use(initReactI18next).init({
  resources: {
    me: { translation: me },
    en: { translation: en },
    de: { translation: de },
    es: { translation: es },
    it: { translation: it },
    ru: { translation: ru },
  },
  lng: getDeviceLanguage(),
  fallbackLng: "me",
  interpolation: {
    escapeValue: false,
  },
});

export const changeLanguage = async (code: LanguageCode) => {
  await i18n.changeLanguage(code);
};

export default i18n;
