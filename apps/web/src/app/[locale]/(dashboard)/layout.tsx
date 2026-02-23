import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function DashboardLayout({
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

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto p-6">{children}</div>
      </main>
    </div>
  );
}

function Sidebar() {
  // Using a client component for nav active states
  return (
    <aside className="hidden w-64 flex-shrink-0 border-r bg-background lg:flex lg:flex-col">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/dashboard" className="text-xl font-bold text-primary">
          Aptis
        </Link>
      </div>
      <SidebarNav />
      <div className="border-t p-4">
        <SidebarFooter />
      </div>
    </aside>
  );
}

function SidebarNav() {
  const navItems = [
    { href: "/dashboard", label: "Painel", icon: "🏠" },
    { href: "/upload", label: "Carregar", icon: "📤" },
    { href: "/documents", label: "Documentos", icon: "📄" },
    { href: "/flashcards", label: "Flashcards", icon: "🃏" },
    { href: "/flashcards/review", label: "Rever Hoje", icon: "⚡" },
    { href: "/quizzes", label: "Quizzes", icon: "🎯" },
    { href: "/study-plan", label: "Plano de Estudo", icon: "📅" },
    { href: "/progress", label: "Progresso", icon: "📊" },
    { href: "/chat", label: "Tutor IA", icon: "💬" },
    { href: "/exam-simulator", label: "Simulador", icon: "🏆" },
  ];

  return (
    <nav className="flex-1 space-y-1 overflow-y-auto p-4">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <span>{item.icon}</span>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

function SidebarFooter() {
  return (
    <div className="space-y-2">
      <Link
        href="/settings"
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        ⚙️ Definições
      </Link>
    </div>
  );
}
