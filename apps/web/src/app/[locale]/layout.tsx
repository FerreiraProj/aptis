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

export const metadata: Metadata = {
  title: {
    default: "Aptis — AI-Powered Study Assistant",
    template: "%s | Aptis",
  },
  description:
    "Transform your PDFs into smart flashcards, adaptive quizzes and personalized study plans with AI. For any subject or area of study.",
  keywords: ["study", "flashcards", "AI", "spaced repetition", "quiz"],
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
