import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import createMiddleware from "next-intl/middleware";
import { routing, ACCEPT_LANG_MAP, type SupportedLocale } from "./i18n/routing";

// Country code (ISO 3166-1 alpha-2) → supported locale.
// Countries not listed here → "en" (English fallback).
const COUNTRY_LOCALE_MAP: Record<string, SupportedLocale> = {
  // Portuguese
  PT: "pt", BR: "pt", AO: "pt", MZ: "pt", CV: "pt", GW: "pt", ST: "pt", TL: "pt",
  // Spanish
  ES: "es", MX: "es", AR: "es", CO: "es", CL: "es", PE: "es", VE: "es",
  UY: "es", BO: "es", EC: "es", PY: "es", CR: "es", PA: "es", CU: "es",
  DO: "es", GT: "es", HN: "es", NI: "es", SV: "es", GQ: "es",
  // French
  FR: "fr", BE: "fr", MC: "fr", LU: "fr", SN: "fr", CI: "fr", CM: "fr",
  MG: "fr", BJ: "fr", BF: "fr", ML: "fr", GN: "fr", TG: "fr", GA: "fr",
  // German
  DE: "de", AT: "de",
  // Italian
  IT: "it", SM: "it", VA: "it",
  // English — explicitly listed so the map is self-documenting, but
  // anything not in this map also falls back to "en"
  US: "en", GB: "en", CA: "en", AU: "en", NZ: "en", IE: "en", ZA: "en",
  IN: "en", SG: "en", PH: "en", NG: "en", GH: "en", KE: "en",
};

const intlMiddleware = createMiddleware(routing);

// Routes that require authentication (without locale prefix)
const PROTECTED_PATHS = [
  "/dashboard",
  "/upload",
  "/documents",
  "/flashcards",
  "/quizzes",
  "/study-plan",
  "/progress",
  "/chat",
  "/exam-simulator",
  "/settings",
];

const ADMIN_PATHS = ["/admin"];

const LOCALE_PREFIX_RE = /^\/(pt|en|fr|it|de|es)(\/|$)/;

function stripLocale(pathname: string): string {
  return pathname.replace(LOCALE_PREFIX_RE, "/");
}

function isProtectedPath(pathname: string): boolean {
  const stripped = stripLocale(pathname);
  return (
    PROTECTED_PATHS.some((p) => stripped === p || stripped.startsWith(p + "/")) ||
    ADMIN_PATHS.some((p) => stripped === p || stripped.startsWith(p + "/"))
  );
}

function isAdminPath(pathname: string): boolean {
  const stripped = stripLocale(pathname);
  return ADMIN_PATHS.some((p) => stripped === p || stripped.startsWith(p + "/"));
}

/** Detect locale from Accept-Language header; unknown languages → "en". */
function detectLocaleFromHeader(acceptLanguage: string | null): SupportedLocale {
  if (!acceptLanguage) return "en";
  const tags = acceptLanguage
    .split(",")
    .map((part) => part.split(";")[0].trim().toLowerCase());
  for (const tag of tags) {
    if (ACCEPT_LANG_MAP[tag]) return ACCEPT_LANG_MAP[tag];
    const prefix = tag.split("-")[0];
    if (ACCEPT_LANG_MAP[prefix]) return ACCEPT_LANG_MAP[prefix];
  }
  return "en";
}

/**
 * Detect locale with the following priority:
 * 1. Vercel geo-IP country header (x-vercel-ip-country) — works in Vercel production.
 * 2. Accept-Language browser header — fallback for local dev & unknown countries.
 * 3. "en" as final fallback.
 */
function detectLocale(request: NextRequest): SupportedLocale {
  const country = request.headers.get("x-vercel-ip-country")?.toUpperCase();
  if (country) {
    const mapped = COUNTRY_LOCALE_MAP[country];
    if (mapped) return mapped;
    // Country is known but not in our map → English
    return "en";
  }
  // No geo header (local dev) → fall back to browser language
  return detectLocaleFromHeader(request.headers.get("accept-language"));
}

export async function proxy(request: NextRequest) {
  // Skip for API routes, auth callbacks, and static files
  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/_next/") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // On first visit (no NEXT_LOCALE cookie), detect locale from geo-IP then Accept-Language.
  // next-intl defaults to "pt" when no locale is detected; we want "en" for unknown locations.
  const hasLocaleCookie = request.cookies.has("NEXT_LOCALE");
  if (!hasLocaleCookie) {
    const detectedLocale = detectLocale(request);
    const hasLocalePrefix = LOCALE_PREFIX_RE.test(pathname);

    // For non-pt locales without a URL prefix, redirect to the locale-prefixed URL.
    // (pt is the default locale and uses no URL prefix.)
    if (detectedLocale !== "pt" && !hasLocalePrefix) {
      const url = request.nextUrl.clone();
      url.pathname = pathname === "/" ? `/${detectedLocale}` : `/${detectedLocale}${pathname}`;
      const res = NextResponse.redirect(url);
      // Session cookie — expires when browser closes, so geo-detection runs again next session.
      res.cookies.set("NEXT_LOCALE", detectedLocale, { path: "/" });
      return res;
    }

    // For "pt" or already-prefixed paths, run intl middleware normally and set cookie on the response.
    const intlResponse = intlMiddleware(request);
    intlResponse.cookies.set("NEXT_LOCALE", detectedLocale, { path: "/" });
    if (intlResponse.status !== 200) return intlResponse;
    if (!isProtectedPath(pathname)) return intlResponse;
    return await runAuthCheck(request, intlResponse, pathname);
  }

  // Run next-intl middleware first
  const intlResponse = intlMiddleware(request);

  // If intl redirected (e.g., adding locale prefix), return that
  if (intlResponse.status !== 200) {
    return intlResponse;
  }

  // Only run auth check on protected routes
  if (!isProtectedPath(pathname)) {
    return intlResponse;
  }

  return await runAuthCheck(request, intlResponse, pathname);
}

async function runAuthCheck(
  request: NextRequest,
  intlResponse: NextResponse,
  pathname: string
): Promise<NextResponse> {
  let response = intlResponse;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: use getUser() not getSession() for security
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Detect locale from current URL prefix
    const match = pathname.match(LOCALE_PREFIX_RE);
    const locale: SupportedLocale = match ? (match[1] as SupportedLocale) : "pt";
    const loginPath = locale === "pt" ? "/login" : `/${locale}/login`;
    const url = request.nextUrl.clone();
    url.pathname = loginPath;
    const search = request.nextUrl.search;
    url.searchParams.set("redirectTo", search ? pathname + search : pathname);
    return NextResponse.redirect(url);
  }

  // Admin path: role check delegated to individual admin pages/API routes
  if (isAdminPath(pathname)) {
    // Role check delegated to individual admin pages/API routes
  }

  return response;
}

export const config = {
  matcher: [
    // Match all paths except static files and API routes that don't need auth
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
