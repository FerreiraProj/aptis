"use client";

import { useTransition, useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { ChevronDown, Check } from "lucide-react";
import {
  SUPPORTED_LOCALES,
  LOCALE_LABELS,
  LOCALE_FLAGS,
  type SupportedLocale,
} from "@/i18n/routing";

export function LandingLanguageSwitcher() {
  const locale = useLocale() as SupportedLocale;
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function switchLocale(next: SupportedLocale) {
    setOpen(false);
    if (next === locale) return;
    startTransition(() => {
      router.replace(pathname, { locale: next });
    });
  }

  return (
    <div className="relative" ref={ref}>
      <button
        disabled={isPending}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent/60 hover:text-foreground transition-colors disabled:opacity-50"
        aria-label="Switch language"
      >
        <span className="text-base leading-none">{LOCALE_FLAGS[locale]}</span>
        <span className="hidden sm:inline">{LOCALE_LABELS[locale]}</span>
        <ChevronDown size={12} className={`shrink-0 opacity-50 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1 z-50 min-w-[160px] glass-dialog rounded-xl overflow-hidden shadow-xl">
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
      )}
    </div>
  );
}
