import { useTranslations } from "next-intl";
import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col">
      <Header />
      <HeroSection />
      <FeaturesSection />
      <PricingSection />
      <Footer />
    </main>
  );
}

function Header() {
  const t = useTranslations("nav");
  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-primary">Aptis</span>
        </div>
        <nav className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {t("signOut")}
          </Link>
          <Link
            href="/register"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Criar conta
          </Link>
        </nav>
      </div>
    </header>
  );
}

function HeroSection() {
  const t = useTranslations("landing.hero");
  return (
    <section className="container mx-auto flex flex-col items-center gap-8 px-4 py-24 text-center">
      <div className="rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
        Para estudantes de medicina
      </div>
      <h1 className="max-w-4xl text-4xl font-bold tracking-tight sm:text-6xl">
        {t("title")}
      </h1>
      <p className="max-w-2xl text-lg text-muted-foreground">{t("subtitle")}</p>
      <div className="flex flex-col gap-4 sm:flex-row">
        <Link
          href="/register"
          className="rounded-md bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          {t("cta")}
        </Link>
        <Link
          href="#features"
          className="rounded-md border px-8 py-3 text-sm font-semibold hover:bg-accent"
        >
          {t("ctaSecondary")}
        </Link>
      </div>
    </section>
  );
}

function FeaturesSection() {
  const t = useTranslations("landing.features");
  const features = [
    {
      icon: "🃏",
      title: t("flashcards.title"),
      description: t("flashcards.description"),
    },
    {
      icon: "🎯",
      title: t("quizzes.title"),
      description: t("quizzes.description"),
    },
    {
      icon: "💬",
      title: t("chat.title"),
      description: t("chat.description"),
    },
    {
      icon: "📅",
      title: t("plan.title"),
      description: t("plan.description"),
    },
  ];

  return (
    <section id="features" className="bg-muted/50 py-24">
      <div className="container mx-auto px-4">
        <h2 className="mb-12 text-center text-3xl font-bold">{t("title")}</h2>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-lg border bg-background p-6 shadow-sm"
            >
              <div className="mb-4 text-4xl">{feature.icon}</div>
              <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingSection() {
  const t = useTranslations("landing.pricing");
  const plans = [
    {
      key: "free" as const,
      highlighted: false,
    },
    {
      key: "pro" as const,
      highlighted: true,
    },
    {
      key: "premium" as const,
      highlighted: false,
    },
  ];

  return (
    <section id="pricing" className="py-24">
      <div className="container mx-auto px-4">
        <h2 className="mb-12 text-center text-3xl font-bold">{t("title")}</h2>
        <div className="mx-auto grid max-w-5xl gap-8 sm:grid-cols-3">
          {plans.map(({ key, highlighted }) => (
            <div
              key={key}
              className={`rounded-lg border p-8 ${
                highlighted
                  ? "border-primary bg-primary text-primary-foreground shadow-lg"
                  : "bg-background"
              }`}
            >
              <h3 className="mb-2 text-xl font-bold">{t(`${key}.name`)}</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold">{t(`${key}.price`)}</span>
                <span
                  className={`text-sm ${highlighted ? "text-primary-foreground/70" : "text-muted-foreground"}`}
                >
                  {t(`${key}.period`)}
                </span>
              </div>
              <ul className="mb-8 space-y-2">
                {(t.raw(`${key}.features`) as string[]).map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <span>✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className={`block w-full rounded-md py-2 text-center text-sm font-semibold ${
                  highlighted
                    ? "bg-white text-primary hover:bg-white/90"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                }`}
              >
                Começar
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t py-8">
      <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Aptis. Todos os direitos reservados.
      </div>
    </footer>
  );
}
