import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import "../globals.css";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://aptis.study";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "Aptis — Estuda Melhor com IA | Flashcards, Quizzes e Planos",
    template: "%s | Aptis",
  },
  description:
    "Transforma os teus PDFs e apontamentos em flashcards, quizzes e planos de estudo personalizados com IA. Para qualquer disciplina — Biologia, Direito, Medicina, Engenharia e mais.",
  keywords: [
    "estudar com ia",
    "flashcards automáticos",
    "gerar quizzes a partir de pdf",
    "plano de estudo ia",
    "repetição espaçada",
    "active recall",
    "app para estudar",
    "transformar apontamentos em flashcards",
  ],
  openGraph: {
    type: "website",
    locale: "pt_PT",
    url: APP_URL,
    siteName: "Aptis",
    title: "Aptis — Estuda Melhor com IA",
    description:
      "Transforma PDFs e apontamentos em flashcards, quizzes e planos de estudo com IA. Repetição espaçada e active recall para qualquer disciplina.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Aptis — App de estudo com IA",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Aptis — Estuda Melhor com IA",
    description:
      "Transforma PDFs em flashcards, quizzes e planos de estudo com IA. Para qualquer disciplina.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as "pt" | "en" | "fr" | "it" | "de" | "es")) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}
        suppressHydrationWarning
      >
        {/* FOUC prevention: apply stored theme before first paint */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              `(function(){try{var t=localStorage.getItem('theme');` +
              `var d=window.matchMedia('(prefers-color-scheme: dark)').matches;` +
              `if(t==='dark'||((!t||t==='system')&&d))document.documentElement.classList.add('dark');` +
              `}catch(e){}})();`,
          }}
        />
        <NextIntlClientProvider messages={messages}>
          {children}
          <Toaster position="top-right" richColors />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
