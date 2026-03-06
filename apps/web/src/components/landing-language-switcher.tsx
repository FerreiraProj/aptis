"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
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
  const [open, setOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Position dropdown below button using viewport coords
  function openDropdown() {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setDropdownPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
    }
    setOpen(true);
  }

  // Close when clicking/touching outside
  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent | TouchEvent) {
      const target = e.target as Node;
      if (
        !btnRef.current?.contains(target) &&
        !dropdownRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [open]);

  function switchLocale(next: SupportedLocale) {
    setOpen(false);
    if (next === locale) return;
    // Update NEXT_LOCALE cookie so middleware keeps the chosen locale
    document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=${365 * 24 * 60 * 60}`;
    // Navigate to the locale-prefixed URL (pt has no prefix)
    window.location.href = next === "pt" ? "/" : `/${next}`;
  }

  const dropdown = open ? (
    <div
      ref={dropdownRef}
      style={{ position: "fixed", top: dropdownPos.top, right: dropdownPos.right }}
      className="z-[9999] min-w-[160px] glass-dialog rounded-xl overflow-hidden shadow-xl"
    >
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
          {loc === locale && <Check size={14} className="ml-auto text-primary" />}
        </button>
      ))}
    </div>
  ) : null;

  return (
    <>
      <button
        ref={btnRef}
        onClick={openDropdown}
        className="flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent/60 hover:text-foreground transition-colors"
        aria-label="Switch language"
      >
        <span className="text-base leading-none">{LOCALE_FLAGS[locale]}</span>
        <span className="hidden sm:inline">{LOCALE_LABELS[locale]}</span>
        <ChevronDown size={12} className={`shrink-0 opacity-50 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {typeof document !== "undefined" && createPortal(dropdown, document.body)}
    </>
  );
}
