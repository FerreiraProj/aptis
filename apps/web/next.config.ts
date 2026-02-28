import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

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

export default withNextIntl(nextConfig);
