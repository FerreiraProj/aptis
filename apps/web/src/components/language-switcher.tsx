"use client";

import { useTransition } from "react";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { ChevronDown, Check } from "lucide-react";
import {
  SUPPORTED_LOCALES,
  LOCALE_LABELS,
  LOCALE_FLAGS,
  type SupportedLocale,
} from "@/i18n/routing";

export function LanguageSwitcher() {
  const locale = useLocale() as SupportedLocale;
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  async function switchLocale(next: SupportedLocale) {
    if (next === locale) return;

    // Await DB update BEFORE navigating to avoid a redirect loop:
    // the dashboard layout reads preferredLocale from DB on every render,
    // so we must ensure the write is committed before the new page loads.
    try {
      await fetch("/api/user/locale", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: next }),
      });
    } catch {
      // Non-critical — locale switch still works via the cookie set by the API
    }

    startTransition(() => {
      router.replace(pathname, { locale: next });
    });
  }

  return (
    <div className="relative group">
      <button
        disabled={isPending}
        className="flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent/60 hover:text-foreground transition-colors disabled:opacity-50"
        aria-label="Switch language"
      >
        <span className="text-base leading-none">{LOCALE_FLAGS[locale]}</span>
        <span>{LOCALE_LABELS[locale]}</span>
        <ChevronDown size={12} className="shrink-0 opacity-50" />
      </button>

      {/* Dropdown */}
      <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block z-50 min-w-[160px] glass rounded-xl overflow-hidden shadow-xl">
        {SUPPORTED_LOCALES.map((loc) => (
          <button
            key={loc}
            onClick={() => switchLocale(loc)}
            className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-accent/60 hover:text-foreground ${
              loc === locale ? "font-medium text-foreground" : "text-muted-foreground"
            }`}
          >
            <span className="text-base leading-none">{LOCALE_FLAGS[loc]}</span>
            {LOCALE_LABELS[loc]}
            {loc === locale && (
              <Check size={14} className="ml-auto text-primary" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
