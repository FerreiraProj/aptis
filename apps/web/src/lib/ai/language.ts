/** UI locales → language name used in AI prompts. */
export const AI_LOCALES = ["pt", "en", "es", "fr", "de", "it"] as const;
export type AiLocale = (typeof AI_LOCALES)[number];

const LOCALE_TO_LANGUAGE: Record<AiLocale, string> = {
  pt: "Portuguese (European)",
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
};

export function localeToLanguage(locale: string | null | undefined): string {
  return LOCALE_TO_LANGUAGE[(locale ?? "pt") as AiLocale] ?? LOCALE_TO_LANGUAGE.pt;
}
