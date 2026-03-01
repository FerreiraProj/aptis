import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@aptis/database";
import { Link } from "@/i18n/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  LayoutDashboard,
  Users,
  FileText,
  Zap,
  CreditCard,
  Gauge,
  ArrowLeft,
  Percent,
  Handshake,
} from "lucide-react";

const adminNavItems = [
  { href: "/admin", label: "Painel", Icon: LayoutDashboard },
  { href: "/admin/users", label: "Utilizadores", Icon: Users },
  { href: "/admin/documents", label: "Documentos", Icon: FileText },
  { href: "/admin/usage", label: "Uso da API", Icon: Zap },
  { href: "/admin/plans", label: "Planos", Icon: CreditCard },
  { href: "/admin/rate-limits", label: "Rate Limits", Icon: Gauge },
  { href: "/admin/discounts", label: "Descontos", Icon: Percent },
  { href: "/admin/affiliates", label: "Afiliados", Icon: Handshake },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true },
  });

  if (dbUser?.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen page-bg">
      <aside className="glass-sidebar hidden w-56 flex-shrink-0 lg:flex lg:flex-col sticky top-0 h-screen z-30">
        <div className="flex h-16 items-center border-b border-white/30 dark:border-white/10 px-6">
          <Link href="/admin">
            <span className="gradient-text text-lg font-bold">Aptis Admin</span>
          </Link>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-4">
          {adminNavItems.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
            >
              <Icon size={15} className="shrink-0" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-white/30 dark:border-white/10 p-4 space-y-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={14} />
            App
          </Link>
          <div className="flex justify-end">
            <ThemeToggle />
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto p-6">{children}</div>
      </main>
    </div>
  );
}
