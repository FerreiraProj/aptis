"use client";

import { usePathname } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import {
  LayoutDashboard,
  Upload,
  FileText,
  BookOpen,
  Zap,
  Target,
  CalendarDays,
  BarChart2,
  MessageCircle,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  "/dashboard": LayoutDashboard,
  "/upload": Upload,
  "/documents": FileText,
  "/flashcards": BookOpen,
  "/flashcards/review": Zap,
  "/quizzes": Target,
  "/study-plan": CalendarDays,
  "/progress": BarChart2,
  "/chat": MessageCircle,
  "/exam-simulator": Trophy,
};

interface NavItem {
  href: string;
  label: string;
}

export function SidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-0.5 overflow-y-auto p-4">
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
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "nav-active"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
            )}
          >
            <Icon size={16} className="shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
