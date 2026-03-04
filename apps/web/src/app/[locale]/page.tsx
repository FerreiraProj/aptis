import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { PricingSection } from "./pricing-section";
import {
  Target,
  CalendarDays,
  Upload,
  FolderOpen,
  Layers,
  Sparkles,
  Check,
  X,
  Shield,
} from "lucide-react";
import { getTranslations } from "next-intl/server";

// Always render dynamically so the pricing section always reads fresh DB prices
export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type T = (key: string, values?: Record<string, any>) => string;

export default async function LandingPage() {
  const t = await getTranslations("landing");
  return (
    <main className="page-bg aurora-bg flex min-h-screen flex-col">
      <Header t={t} />
      <HeroSection t={t} />
      <ProblemSection t={t} />
      <SolutionSection t={t} />
      <AiSpecialistSection t={t} />
      <HowItWorksSection t={t} />
      <StudyPlansSection t={t} />
      <ComparisonSection t={t} />
      <TargetAudienceSection t={t} />
      <PricingSection />
      <PrivacySection t={t} />
      <Footer t={t} />
    </main>
  );
}

function Header({ t }: { t: T }) {
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
            {t("header.signIn")}
          </Link>
          <Link
            href="/register"
            className="btn-gradient rounded-xl px-4 py-2 text-sm font-medium"
          >
            {t("header.signUp")}
          </Link>
        </nav>
      </div>
    </header>
  );
}

function HeroSection({ t }: { t: T }) {
  return (
    <section className="container mx-auto flex flex-col items-center gap-8 px-4 py-24 text-center">
      <div className="glass-sm rounded-full px-4 py-1.5 text-sm font-medium text-primary">
        {t("hero.badge")}
      </div>
      <h1 className="max-w-4xl text-4xl font-bold tracking-tight sm:text-6xl">
        {t("hero.title1")}{" "}
        <span className="gradient-text">{t("hero.titleHighlight")}</span>
      </h1>
      <p className="max-w-2xl text-lg text-muted-foreground">
        {t("hero.description")}
      </p>
      <div className="flex flex-col gap-4 sm:flex-row">
        <Link
          href="/register"
          className="btn-gradient rounded-xl px-8 py-3 text-sm font-semibold"
        >
          {t("hero.ctaStart")}
        </Link>
        <Link
          href="#como-funciona"
          className="glass rounded-xl px-8 py-3 text-sm font-semibold text-foreground hover:brightness-105 transition-all"
        >
          {t("hero.ctaHow")}
        </Link>
      </div>
      <p className="text-sm text-muted-foreground">
        {t("hero.privacy")}
      </p>
    </section>
  );
}

function ProblemSection({ t }: { t: T }) {
  const problems = [
    t("problem.item1"),
    t("problem.item2"),
    t("problem.item3"),
    t("problem.item4"),
  ];

  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-6 text-3xl font-bold sm:text-4xl">
            {t("problem.title")}
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
            {t("problem.conclusion1")}{" "}
            <span className="gradient-text">{t("problem.conclusionHighlight")}</span>
          </p>
        </div>
      </div>
    </section>
  );
}

function SolutionSection({ t }: { t: T }) {
  const steps = [
    { Icon: FolderOpen, text: t("solution.step1") },
    { Icon: Upload, text: t("solution.step2") },
    { Icon: Layers, text: t("solution.step3") },
    { Icon: Sparkles, text: t("solution.step4") },
  ];

  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-4 text-center text-3xl font-bold sm:text-4xl">
            {t("solution.title")}
          </h2>
          <p className="mb-10 text-center text-muted-foreground">
            {t("solution.subtitle")}
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

function AiSpecialistSection({ t }: { t: T }) {
  const examples = [
    { area: t("aiSpecialist.area1"), emoji: "🧬", description: t("aiSpecialist.area1desc") },
    { area: t("aiSpecialist.area2"), emoji: "⚖️", description: t("aiSpecialist.area2desc") },
    { area: t("aiSpecialist.area3"), emoji: "🩺", description: t("aiSpecialist.area3desc") },
    { area: t("aiSpecialist.area4"), emoji: "⚙️", description: t("aiSpecialist.area4desc") },
  ];

  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="mb-4 text-3xl font-bold sm:text-4xl">
            {t("aiSpecialist.title")}
          </h2>
          <p className="mb-10 text-muted-foreground">
            {t("aiSpecialist.subtitle")}
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
              {t("aiSpecialist.conclusion1")}{" "}
              <span className="gradient-text">{t("aiSpecialist.conclusionHighlight")}</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection({ t }: { t: T }) {
  const steps = [
    {
      number: "1",
      Icon: Upload,
      title: t("howItWorks.step1Title"),
      description: t("howItWorks.step1Desc"),
    },
    {
      number: "2",
      Icon: FolderOpen,
      title: t("howItWorks.step2Title"),
      description: t("howItWorks.step2Desc"),
    },
    {
      number: "3",
      Icon: Target,
      title: t("howItWorks.step3Title"),
      description: t("howItWorks.step3Desc"),
    },
    {
      number: "4",
      Icon: Sparkles,
      title: t("howItWorks.step4Title"),
      description: t("howItWorks.step4Desc"),
    },
  ];

  return (
    <section id="como-funciona" className="py-20">
      <div className="container mx-auto px-4">
        <h2 className="mb-12 text-center text-3xl font-bold sm:text-4xl">{t("howItWorks.title")}</h2>
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

function StudyPlansSection({ t }: { t: T }) {
  const subjects = [t("studyPlans.subject1"), t("studyPlans.subject2"), t("studyPlans.subject3")];

  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl">
          <div className="glass rounded-3xl p-10">
            <h2 className="mb-4 text-center text-3xl font-bold sm:text-4xl">
              {t("studyPlans.title")}
            </h2>
            <p className="mb-8 text-center text-muted-foreground">
              {t("studyPlans.subtitle")}
            </p>
            <div className="mb-8 grid gap-4 sm:grid-cols-3">
              {subjects.map((subject) => (
                <div key={subject} className="glass-sm rounded-xl px-4 py-3 flex items-center gap-2">
                  <CalendarDays size={16} className="text-primary" />
                  <span className="text-sm font-medium">{t("studyPlans.planFor", { subject })}</span>
                </div>
              ))}
            </div>
            <p className="text-center font-semibold">
              {t("studyPlans.conclusion1")}{" "}
              <span className="gradient-text">{t("studyPlans.conclusionHighlight")}</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function ComparisonSection({ t }: { t: T }) {
  const rows = [
    {
      feature: t("comparison.feature1"),
      generic: t("comparison.generic1"),
      aptis: t("comparison.aptis1"),
    },
    {
      feature: t("comparison.feature2"),
      generic: t("comparison.generic2"),
      aptis: t("comparison.aptis2"),
    },
    {
      feature: t("comparison.feature3"),
      generic: t("comparison.generic3"),
      aptis: t("comparison.aptis3"),
    },
    {
      feature: t("comparison.feature4"),
      generic: t("comparison.generic4"),
      aptis: t("comparison.aptis4"),
    },
  ];

  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <h2 className="mb-12 text-center text-3xl font-bold sm:text-4xl">
          {t("comparison.title")}
        </h2>
        <div className="mx-auto max-w-3xl">
          <div className="glass rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-3 glass-sm px-6 py-3 text-sm font-semibold">
              <span className="text-muted-foreground">{t("comparison.colFeature")}</span>
              <span className="text-center text-muted-foreground">{t("comparison.colGeneric")}</span>
              <span className="text-center gradient-text">{t("comparison.colAptis")}</span>
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

function TargetAudienceSection({ t }: { t: T }) {
  const audiences = [
    { emoji: "📚", label: t("targetAudience.audience1") },
    { emoji: "🎓", label: t("targetAudience.audience2") },
    { emoji: "📝", label: t("targetAudience.audience3") },
    { emoji: "🏆", label: t("targetAudience.audience4") },
    { emoji: "⚖️", label: t("targetAudience.audience5") },
  ];

  return (
    <section className="py-20">
      <div className="container mx-auto px-4 text-center">
        <h2 className="mb-4 text-3xl font-bold sm:text-4xl">{t("targetAudience.title")}</h2>
        <p className="mb-10 text-muted-foreground">
          {t("targetAudience.subtitle")}
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
            {t("targetAudience.cta")}
          </Link>
        </div>
      </div>
    </section>
  );
}

function PrivacySection({ t }: { t: T }) {
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
              {t("privacy.title")}
            </h2>
            <p className="mb-2 text-muted-foreground">
              {t("privacy.text1")}
            </p>
            <p className="text-muted-foreground">
              {t("privacy.text2")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer({ t }: { t: T }) {
  return (
    <footer className="glass-sm mt-auto py-8">
      <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Aptis. {t("footer.rights")}
      </div>
    </footer>
  );
}
