import { defineRouting } from "next-intl/routing";

export const SUPPORTED_LOCALES = ["pt", "en", "fr", "it", "de", "es"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const LOCALE_LABELS: Record<SupportedLocale, string> = {
  pt: "Português",
  en: "English",
  fr: "Français",
  it: "Italiano",
  de: "Deutsch",
  es: "Español",
};

export const LOCALE_FLAGS: Record<SupportedLocale, string> = {
  pt: "🇵🇹",
  en: "🇬🇧",
  fr: "🇫🇷",
  it: "🇮🇹",
  de: "🇩🇪",
  es: "🇪🇸",
};

// Map Accept-Language language-tag prefixes to our supported locales.
// Any prefix not listed falls back to "en" (not "pt").
export const ACCEPT_LANG_MAP: Record<string, SupportedLocale> = {
  pt: "pt",
  en: "en",
  fr: "fr",
  it: "it",
  de: "de",
  es: "es",
};

export const routing = defineRouting({
  locales: SUPPORTED_LOCALES,
  defaultLocale: "pt",
  // pt has no URL prefix; all other locales get /{locale}/... prefix
  localePrefix: "as-needed",
});
