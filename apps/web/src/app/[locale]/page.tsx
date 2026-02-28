import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { PricingSection } from "./pricing-section";
import {
  BookOpen,
  Target,
  MessageCircle,
  CalendarDays,
  Upload,
  FolderOpen,
  Layers,
  Sparkles,
  Check,
  X,
  Brain,
  FileText,
  Zap,
  Shield,
} from "lucide-react";

// Always render dynamically so the pricing section always reads fresh DB prices
export const dynamic = "force-dynamic";

export default function LandingPage() {
  return (
    <main className="page-bg aurora-bg flex min-h-screen flex-col">
      <Header />
      <HeroSection />
      <ProblemSection />
      <SolutionSection />
      <AiSpecialistSection />
      <HowItWorksSection />
      <StudyPlansSection />
      <ComparisonSection />
      <TargetAudienceSection />
      <PricingSection />
      <PrivacySection />
      <Footer />
    </main>
  );
}

function Header() {
  return (
    <header className="glass sticky top-0 z-50">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Image src="/logo.png" alt="Aptis" width={32} height={32} className="h-10 w-10 object-contain" />
          <span className="gradient-text text-xl font-bold">Aptis</span>
        </div>
        <nav className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/login"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Entrar
          </Link>
          <Link
            href="/register"
            className="btn-gradient rounded-xl px-4 py-2 text-sm font-medium"
          >
            Começar gratuitamente
          </Link>
        </nav>
      </div>
    </header>
  );
}

function HeroSection() {
  return (
    <section className="container mx-auto flex flex-col items-center gap-8 px-4 py-24 text-center">
      <div className="glass-sm rounded-full px-4 py-1.5 text-sm font-medium text-primary">
        O teu sistema de estudo inteligente, disciplina por disciplina
      </div>
      <h1 className="max-w-4xl text-4xl font-bold tracking-tight sm:text-6xl">
        Estuda melhor em qualquer disciplina com uma{" "}
        <span className="gradient-text">IA que se adapta à matéria</span>
      </h1>
      <p className="max-w-2xl text-lg text-muted-foreground">
        Carrega PDFs, apontamentos ou apresentações.
        Organiza por disciplina.
        Gera planos, quizzes e flashcards focados exatamente no que queres estudar.
      </p>
      <div className="flex flex-col gap-4 sm:flex-row">
        <Link
          href="/register"
          className="btn-gradient rounded-xl px-8 py-3 text-sm font-semibold"
        >
          Começar gratuitamente
        </Link>
        <Link
          href="#como-funciona"
          className="glass rounded-xl px-8 py-3 text-sm font-semibold text-foreground hover:brightness-105 transition-all"
        >
          Como funciona
        </Link>
      </div>
      <p className="text-sm text-muted-foreground">
        Sem guardar os teus ficheiros originais. Plano gratuito disponível.
      </p>
    </section>
  );
}

function ProblemSection() {
  const problems = [
    "PDFs espalhados por várias pastas",
    "Flashcards numa app, resumos noutra",
    "Quizzes genéricos sem contexto real",
    "Sem plano de estudo estruturado",
  ];

  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-6 text-3xl font-bold sm:text-4xl">
            O teu estudo está fragmentado.
          </h2>
          <div className="mb-8 grid gap-3 sm:grid-cols-2">
            {problems.map((p) => (
              <div key={p} className="glass-sm rounded-xl px-5 py-4 flex items-center gap-3 text-left">
                <X size={16} className="shrink-0 text-destructive" />
                <span className="text-sm">{p}</span>
              </div>
            ))}
          </div>
          <p className="text-lg font-semibold text-foreground">
            O problema não é falta de conteúdo.{" "}
            <span className="gradient-text">É falta de estrutura.</span>
          </p>
        </div>
      </div>
    </section>
  );
}

function SolutionSection() {
  const steps = [
    { Icon: FolderOpen, text: "Cria disciplinas (ou não — é opcional)" },
    { Icon: Upload, text: "Carrega documentos" },
    { Icon: Layers, text: "Classifica por matéria" },
    { Icon: Sparkles, text: "Estuda um ou vários documentos ao mesmo tempo" },
  ];

  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-4 text-center text-3xl font-bold sm:text-4xl">
            Transforma caos em disciplina.
          </h2>
          <p className="mb-10 text-center text-muted-foreground">
            Tu escolhes o que estudar. A IA adapta-se ao contexto.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {steps.map(({ Icon, text }) => (
              <div key={text} className="glass rounded-2xl p-6 flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Icon size={20} className="text-primary" />
                </div>
                <p className="text-sm leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function AiSpecialistSection() {
  const examples = [
    { area: "Biologia", emoji: "🧬", description: "explica como professor de biologia" },
    { area: "Direito", emoji: "⚖️", description: "usa linguagem jurídica" },
    { area: "Medicina", emoji: "🩺", description: "raciocínio clínico" },
    { area: "Engenharia", emoji: "⚙️", description: "abordagem técnica" },
  ];

  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="mb-4 text-3xl font-bold sm:text-4xl">
            A IA muda conforme a disciplina.
          </h2>
          <p className="mb-10 text-muted-foreground">
            Se estás a estudar:
          </p>
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {examples.map(({ area, emoji, description }) => (
              <div key={area} className="glass rounded-2xl p-6 hover:scale-[1.02] transition-transform">
                <div className="mb-3 text-3xl">{emoji}</div>
                <h3 className="mb-1 font-semibold">{area}</h3>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
          <div className="glass-sm inline-block rounded-2xl px-8 py-4">
            <p className="font-semibold">
              Não é uma IA genérica.{" "}
              <span className="gradient-text">É uma IA contextual.</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const steps = [
    {
      number: "1",
      Icon: Upload,
      title: "Adiciona documentos",
      description: "PDF, PPTX, TXT e mais.",
    },
    {
      number: "2",
      Icon: FolderOpen,
      title: "Organiza por disciplina",
      description: "Opcional — ou estuda diretamente documentos soltos.",
    },
    {
      number: "3",
      Icon: Target,
      title: "Escolhe o que queres estudar",
      description: "Um documento, vários ou uma disciplina inteira.",
    },
    {
      number: "4",
      Icon: Sparkles,
      title: "Recebe o teu plano de estudo",
      description: "Flashcards inteligentes, quizzes adaptativos, explicações personalizadas e plano automático.",
    },
  ];

  return (
    <section id="como-funciona" className="py-20">
      <div className="container mx-auto px-4">
        <h2 className="mb-12 text-center text-3xl font-bold sm:text-4xl">Como funciona</h2>
        <div className="mx-auto max-w-4xl grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(({ number, Icon, title, description }) => (
            <div key={number} className="glass rounded-2xl p-6 hover:scale-[1.02] transition-transform">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-white text-sm font-bold">
                  {number}
                </span>
                <Icon size={18} className="text-primary" />
              </div>
              <h3 className="mb-2 font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function StudyPlansSection() {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl">
          <div className="glass rounded-3xl p-10">
            <h2 className="mb-4 text-center text-3xl font-bold sm:text-4xl">
              Planeia cada disciplina de forma independente.
            </h2>
            <p className="mb-8 text-center text-muted-foreground">
              Tens várias disciplinas difíceis? Cria um plano para cada uma — ou mistura documentos num plano global.
            </p>
            <div className="mb-8 grid gap-4 sm:grid-cols-3">
              {["Matemática", "Biologia", "Direito"].map((subject) => (
                <div key={subject} className="glass-sm rounded-xl px-4 py-3 flex items-center gap-2">
                  <CalendarDays size={16} className="text-primary" />
                  <span className="text-sm font-medium">Plano para {subject}</span>
                </div>
              ))}
            </div>
            <p className="text-center font-semibold">
              O estudo adapta-se à{" "}
              <span className="gradient-text">tua realidade académica.</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function ComparisonSection() {
  const rows = [
    {
      feature: "Flashcards",
      generic: "Iguais para todos",
      aptis: "Baseados nos teus documentos",
    },
    {
      feature: "Contexto",
      generic: "Sem contexto disciplinar",
      aptis: "IA especialista por matéria",
    },
    {
      feature: "Organização",
      generic: "Manual",
      aptis: "Estrutura automática",
    },
    {
      feature: "Planeamento",
      generic: "Sem plano real",
      aptis: "Planeamento adaptativo",
    },
  ];

  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <h2 className="mb-12 text-center text-3xl font-bold sm:text-4xl">
          Porque não é como as outras ferramentas
        </h2>
        <div className="mx-auto max-w-3xl">
          <div className="glass rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-3 glass-sm px-6 py-3 text-sm font-semibold">
              <span className="text-muted-foreground">Funcionalidade</span>
              <span className="text-center text-muted-foreground">Ferramentas genéricas</span>
              <span className="text-center gradient-text">Aptis</span>
            </div>
            {/* Rows */}
            {rows.map((row, i) => (
              <div
                key={row.feature}
                className={`grid grid-cols-3 px-6 py-4 text-sm items-center ${i !== rows.length - 1 ? "border-b border-border/50" : ""
                  }`}
              >
                <span className="font-medium">{row.feature}</span>
                <span className="flex items-center justify-center gap-1.5 text-muted-foreground text-center">
                  <X size={13} className="shrink-0 text-destructive" />
                  {row.generic}
                </span>
                <span className="flex items-center justify-center gap-1.5 text-center">
                  <Check size={13} className="shrink-0 text-primary" />
                  {row.aptis}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function TargetAudienceSection() {
  const audiences = [
    { emoji: "📚", label: "Secundário" },
    { emoji: "🎓", label: "Universitários" },
    { emoji: "📝", label: "Exames nacionais" },
    { emoji: "🏆", label: "Certificações" },
    { emoji: "⚖️", label: "Concursos" },
  ];

  return (
    <section className="py-20">
      <div className="container mx-auto px-4 text-center">
        <h2 className="mb-4 text-3xl font-bold sm:text-4xl">Para quem é?</h2>
        <p className="mb-10 text-muted-foreground">
          Se tens matéria para estudar, isto foi feito para ti.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          {audiences.map(({ emoji, label }) => (
            <div key={label} className="glass rounded-2xl px-6 py-4 flex items-center gap-2">
              <span className="text-xl">{emoji}</span>
              <span className="font-medium">{label}</span>
            </div>
          ))}
        </div>
        <div className="mt-12">
          <Link
            href="/register"
            className="btn-gradient rounded-xl px-8 py-3 text-sm font-semibold inline-block"
          >
            Começar gratuitamente
          </Link>
        </div>
      </div>
    </section>
  );
}

function PrivacySection() {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl">
          <div className="glass rounded-3xl p-10 text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                <Shield size={28} className="text-primary" />
              </div>
            </div>
            <h2 className="mb-4 text-2xl font-bold">
              Os teus ficheiros não ficam guardados.
            </h2>
            <p className="mb-2 text-muted-foreground">
              O documento é eliminado após extração do conteúdo.
            </p>
            <p className="text-muted-foreground">
              Guardamos apenas texto estruturado e embeddings — nunca o ficheiro original.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="glass-sm mt-auto py-8">
      <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Aptis. Todos os direitos reservados.
      </div>
    </footer>
  );
}
