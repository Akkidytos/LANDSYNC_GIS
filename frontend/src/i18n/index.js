import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en.json";
import hi from "./hi.json";
const stored = localStorage.getItem("landsync_lang") || "en";
i18n.use(initReactI18next).init({
    resources: { en: { translation: en }, hi: { translation: hi } },
    lng: stored,
    fallbackLng: "en",
    interpolation: { escapeValue: false },
});
export function setLanguage(lang) {
    localStorage.setItem("landsync_lang", lang);
    i18n.changeLanguage(lang);
}
export default i18n;
