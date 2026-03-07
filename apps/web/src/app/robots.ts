import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://aptis.study";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard",
          "/admin",
          "/api/",
          "/onboarding",
          "/settings",
          "/upload",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
