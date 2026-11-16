import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  experimental: {
    // Enable server actions
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  // These Node.js-only packages must NOT be bundled by Turbopack/webpack.
  // Excluded from bundling so Node.js requires them directly at runtime.
  serverExternalPackages: ["pdf-parse", "tesseract.js", "pdf2pic"],
  // Allow importing from packages/database
  transpilePackages: ["@aptis/database"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
};

// Sentry wraps the build to upload source maps (only when SENTRY_AUTH_TOKEN is set).
// Runtime reporting is configured in src/instrumentation*.ts and is a no-op without a DSN.
export default withSentryConfig(withNextIntl(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
});
