import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import createMiddleware from "next-intl/middleware";
import { routing, ACCEPT_LANG_MAP, type SupportedLocale } from "./i18n/routing";

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
  // Parse comma-separated language tags (e.g. "fr-FR,fr;q=0.9,en;q=0.8")
  const tags = acceptLanguage
    .split(",")
    .map((part) => part.split(";")[0].trim().toLowerCase());
  for (const tag of tags) {
    // Try full tag first (e.g. "pt-br"), then 2-letter prefix
    if (ACCEPT_LANG_MAP[tag]) return ACCEPT_LANG_MAP[tag];
    const prefix = tag.split("-")[0];
    if (ACCEPT_LANG_MAP[prefix]) return ACCEPT_LANG_MAP[prefix];
  }
  return "en";
}

export async function middleware(request: NextRequest) {
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

  // On first visit (no NEXT_LOCALE cookie), detect locale from Accept-Language.
  // next-intl defaults to "pt" when no locale is detected; we want "en" for unknown languages.
  const hasLocaleCookie = request.cookies.has("NEXT_LOCALE");
  if (!hasLocaleCookie) {
    const acceptLanguage = request.headers.get("accept-language");
    const detectedLocale = detectLocaleFromHeader(acceptLanguage);
    const hasLocalePrefix = LOCALE_PREFIX_RE.test(pathname);

    // For non-pt locales without a URL prefix, redirect to the locale-prefixed URL.
    // (pt is the default locale and uses no URL prefix.)
    if (detectedLocale !== "pt" && !hasLocalePrefix) {
      const url = request.nextUrl.clone();
      url.pathname = pathname === "/" ? `/${detectedLocale}` : `/${detectedLocale}${pathname}`;
      const res = NextResponse.redirect(url);
      res.cookies.set("NEXT_LOCALE", detectedLocale, { path: "/", maxAge: 365 * 24 * 60 * 60 });
      return res;
    }

    // For "pt" or already-prefixed paths, run intl middleware normally and set cookie on the response.
    const intlResponse = intlMiddleware(request);
    intlResponse.cookies.set("NEXT_LOCALE", detectedLocale, { path: "/", maxAge: 365 * 24 * 60 * 60 });
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
    url.searchParams.set("redirectTo", pathname);
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
