import { defineRouting } from "next-intl/routing";
export const routing = defineRouting({
  locales: ["en", "es", "ar", "ru", "uz"],
  defaultLocale: "en",
  localePrefix: "always",
  localeDetection: true,
});

export type Locale = (typeof routing.locales)[number];
export const languageNames: Record<Locale, string> = {
  en: "English",
  es: "Espa\u00f1ol",
  ar: "\u0627\u0644\u0639\u0631\u0628\u064a\u0629",
  ru: "\u0420\u0443\u0441\u0441\u043a\u0438\u0439",
  uz: "O\u02bbzbekcha",
};
