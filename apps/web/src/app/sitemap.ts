import type { MetadataRoute } from "next";
import { SEO_PAGES } from "@/lib/seo/pages-config";

const LOCALES = ["pt", "en", "es", "fr", "de", "it"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://aptis.study";
  const now = new Date();

  // Landing page for every locale (pt has no prefix with localePrefix:"as-needed")
  const landingPages: MetadataRoute.Sitemap = LOCALES.map((locale) => ({
    url: locale === "pt" ? base : `${base}/${locale}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 1.0,
  }));

  // Auth pages
  const authPages: MetadataRoute.Sitemap = ["/login", "/register"].map(
    (path) => ({
      url: `${base}${path}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    })
  );

  // SEO long-tail pages (Portuguese, no locale prefix)
  const seoPages: MetadataRoute.Sitemap = SEO_PAGES.map((page) => ({
    url: `${base}/${page.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  return [...landingPages, ...authPages, ...seoPages];
}
