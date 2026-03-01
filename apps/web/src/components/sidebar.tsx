"use client";

import { useState, useEffect } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import {
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  LayoutDashboard,
  Upload,
  FileText,
  BookOpen,
  BookMarked,
  Zap,
  Target,
  CalendarDays,
  BarChart2,
  MessageCircle,
  Trophy,
  Gift,
} from "lucide-react";
import Image from "next/image";
import { LanguageSwitcher } from "./language-switcher";
import { ThemeToggle } from "./theme-toggle";

// ─── Icon map ─────────────────────────────────────────────────────────────────

const ICON_MAP: Record<
  string,
  React.ComponentType<{ size?: number; className?: string }>
> = {
  "/dashboard": LayoutDashboard,
  "/upload": Upload,
  "/documents": FileText,
  "/subjects": BookMarked,
  "/flashcards": BookOpen,
  "/flashcards/review": Zap,
  "/quizzes": Target,
  "/study-plan": CalendarDays,
  "/progress": BarChart2,
  "/chat": MessageCircle,
  "/exam-simulator": Trophy,
  "/referral": Gift,
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface NavItem {
  href: string;
  label: string;
}

interface SidebarProps {
  items: NavItem[];
  settingsLabel: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Sidebar({ items, settingsLabel }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  // Restore desktop collapse preference
  useEffect(() => {
    try {
      if (localStorage.getItem("sidebarCollapsed") === "true") setCollapsed(true);
    } catch { }
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem("sidebarCollapsed", String(next));
    } catch { }
  }

  return (
    <>
      {/* ── Mobile top bar (fixed, only < lg) ──────────────────────────── */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 glass border-b border-white/20 h-14 flex items-center gap-3 px-4">
        <button
          onClick={() => setMobileOpen(true)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
          aria-label="Abrir menu"
        >
          <Menu size={20} />
        </button>
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image src="/logo.png" alt="Aptis" width={28} height={28} className="h-7 w-7 object-contain" />
          <span className="gradient-text text-lg font-bold">Aptis</span>
        </Link>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </div>

      {/* ── Mobile backdrop overlay ─────────────────────────────────────── */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 lg:hidden",
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      {/* ── Sidebar ────────────────────────────────────────────────────── */}
      <aside
        className={cn(
          // Base layout
          "glass-sidebar flex flex-col z-50 shrink-0",
          // Smooth transitions for width (desktop) and position (mobile)
          "transition-all duration-300",
          // Mobile: fixed drawer that slides from the left
          "fixed top-0 left-0 h-full w-72",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          // Desktop: override to in-flow sticky sidebar (no translate)
          "lg:relative lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
          // Desktop width: collapsed or expanded
          collapsed ? "lg:w-16" : "lg:w-64"
        )}
      >
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div
          className={cn(
            "flex h-16 items-center gap-2 border-b border-white/20 dark:border-white/10 shrink-0 px-4",
            collapsed && "lg:justify-center lg:px-2"
          )}
        >
          {/* Logo — hidden when desktop collapsed */}
          <Link href="/dashboard" className={cn("flex items-center gap-2", collapsed && "lg:hidden")}>
            <Image src="/logo.png" alt="Aptis" width={28} height={28} className="h-7 w-7 object-contain" />
            <span className="gradient-text text-xl font-bold">Aptis</span>
          </Link>

          {/* Desktop: collapse/expand toggle */}
          <button
            onClick={toggleCollapsed}
            className={cn(
              "hidden lg:flex h-8 w-8 items-center justify-center rounded-lg",
              "text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors shrink-0",
              !collapsed && "ml-auto"
            )}
            aria-label={collapsed ? "Expandir menu" : "Colapsar menu"}
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>

          {/* Mobile: close (X) button */}
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
            aria-label="Fechar menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Navigation ─────────────────────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {items.map((item) => {
            const Icon = ICON_MAP[item.href] ?? LayoutDashboard;
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname === item.href || pathname.startsWith(item.href + "/");

            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors overflow-hidden",
                  collapsed && "lg:justify-center lg:px-0",
                  isActive
                    ? "nav-active"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                )}
              >
                <Icon size={16} className="shrink-0" />
                <span
                  className={cn(
                    "truncate transition-all duration-200",
                    collapsed && "lg:hidden"
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* ── Footer ─────────────────────────────────────────────────── */}
        <div
          className={cn(
            "border-t border-white/20 dark:border-white/10 p-3 space-y-2 shrink-0",
            collapsed && "lg:flex lg:flex-col lg:items-center"
          )}
        >
          <Link
            href="/settings"
            title={collapsed ? settingsLabel : undefined}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors overflow-hidden",
              collapsed && "lg:justify-center lg:px-0"
            )}
          >
            <Settings size={15} className="shrink-0" />
            <span className={cn("truncate", collapsed && "lg:hidden")}>
              {settingsLabel}
            </span>
          </Link>

          <div
            className={cn(
              "flex items-center",
              collapsed ? "lg:justify-center" : "justify-between"
            )}
          >
            <div className={cn(collapsed && "lg:hidden")}>
              <LanguageSwitcher />
            </div>
            <ThemeToggle />
          </div>
        </div>
      </aside>
    </>
  );
}
