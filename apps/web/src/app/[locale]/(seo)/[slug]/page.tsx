import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import { getSeoPageBySlug } from "@/lib/seo/pages-config";
import { Check } from "lucide-react";

// Dynamic rendering required — parent layout uses getMessages() which reads headers()
export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://aptis.study";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = getSeoPageBySlug(slug);
  if (!page) return {};

  return {
    title: page.metaTitle,
    description: page.metaDescription,
    keywords: page.keywords,
    alternates: {
      canonical: `${APP_URL}/${page.slug}`,
    },
    openGraph: {
      title: page.metaTitle,
      description: page.metaDescription,
      url: `${APP_URL}/${page.slug}`,
      type: "article",
      locale: "pt_PT",
    },
    twitter: {
      card: "summary_large_image",
      title: page.metaTitle,
      description: page.metaDescription,
    },
  };
}

export default async function SeoPage({ params }: Props) {
  const { locale, slug } = await params;

  // These pages are Portuguese SEO content — only serve for pt locale
  if (locale !== "pt") notFound();

  const page = getSeoPageBySlug(slug);
  if (!page) notFound();

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: page.faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: page.h1,
    description: page.metaDescription,
    url: `${APP_URL}/${page.slug}`,
    publisher: {
      "@type": "Organization",
      name: "Aptis",
      url: APP_URL,
      logo: { "@type": "ImageObject", url: `${APP_URL}/logo.png` },
    },
    inLanguage: "pt-PT",
  };

  return (
    <div className="page-bg aurora-bg min-h-screen">
      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      {/* ── Header ──────────────────────────────────────────────────── */}
      <header className="glass sticky top-0 z-50">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="Aptis"
              width={32}
              height={32}
              className="h-8 w-8 object-contain"
            />
            <span className="gradient-text text-xl font-bold">Aptis</span>
          </Link>
          <nav className="flex items-center gap-3">
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
              Começar grátis
            </Link>
          </nav>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl px-4 pb-24 pt-12">
        {/* ── Breadcrumb ──────────────────────────────────────────────── */}
        <nav className="mb-6 text-xs text-muted-foreground" aria-label="Breadcrumb">
          <ol className="flex items-center gap-1">
            <li>
              <Link href="/" className="hover:text-foreground transition-colors">
                Início
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li className="truncate">{page.h1}</li>
          </ol>
        </nav>

        {/* ── Hero ────────────────────────────────────────────────────── */}
        <section className="mb-12">
          <h1 className="mb-5 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            {page.h1}
          </h1>
          <p className="text-lg leading-relaxed text-muted-foreground">
            {page.intro}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/register"
              className="btn-gradient rounded-xl px-6 py-3 text-sm font-semibold"
            >
              {page.ctaLabel ?? "Experimentar gratuitamente"}
            </Link>
            <Link
              href="/#como-funciona"
              className="glass rounded-xl px-6 py-3 text-sm font-semibold text-foreground hover:brightness-105 transition-all"
            >
              Como funciona
            </Link>
          </div>
        </section>

        {/* ── Content Sections ────────────────────────────────────────── */}
        <div className="mb-12 space-y-10">
          {page.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="mb-4 text-xl font-bold sm:text-2xl">
                {section.heading}
              </h2>
              <p className="leading-relaxed text-muted-foreground">
                {section.content}
              </p>
            </section>
          ))}
        </div>

        {/* ── Features ────────────────────────────────────────────────── */}
        <section className="mb-12">
          <h2 className="mb-6 text-xl font-bold sm:text-2xl">
            O que o Aptis oferece
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {page.features.map((feature) => (
              <div key={feature.title} className="glass rounded-2xl p-5 flex items-start gap-4">
                <span className="text-2xl flex-shrink-0">{feature.icon}</span>
                <div>
                  <h3 className="mb-1 font-semibold text-sm">{feature.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA Banner ──────────────────────────────────────────────── */}
        <section className="mb-12">
          <div className="glass rounded-3xl p-8 text-center">
            <h2 className="mb-3 text-xl font-bold sm:text-2xl">
              Pronto para estudar de forma mais inteligente?
            </h2>
            <p className="mb-6 text-muted-foreground">
              Cria uma conta gratuita e transforma os teus documentos em
              flashcards e quizzes em segundos.
            </p>
            <div className="mb-4 flex flex-wrap justify-center gap-3 text-sm text-muted-foreground">
              {["Sem cartão de crédito", "Plano gratuito disponível", "Setup em menos de 2 minutos"].map(
                (item) => (
                  <span key={item} className="flex items-center gap-1.5">
                    <Check size={14} className="text-primary" />
                    {item}
                  </span>
                )
              )}
            </div>
            <Link
              href="/register"
              className="btn-gradient inline-block rounded-xl px-8 py-3 text-sm font-semibold"
            >
              Começar gratuitamente
            </Link>
          </div>
        </section>

        {/* ── FAQ ─────────────────────────────────────────────────────── */}
        <section>
          <h2 className="mb-6 text-xl font-bold sm:text-2xl">
            Perguntas frequentes
          </h2>
          <div className="space-y-4">
            {page.faq.map((item) => (
              <div key={item.question} className="glass-sm rounded-xl p-5">
                <h3 className="mb-2 font-semibold text-sm">{item.question}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.answer}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="glass-sm py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Aptis. Todos os direitos reservados.{" "}
          <Link href="/" className="hover:text-foreground transition-colors">
            Voltar ao início
          </Link>
        </div>
      </footer>
    </div>
  );
}
