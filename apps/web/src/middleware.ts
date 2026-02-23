import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

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

function isProtectedPath(pathname: string): boolean {
  // Strip locale prefix (e.g., /en/dashboard -> /dashboard, /dashboard -> /dashboard)
  const stripped = pathname.replace(/^\/(pt|en)/, "");
  return (
    PROTECTED_PATHS.some((p) => stripped === p || stripped.startsWith(p + "/")) ||
    ADMIN_PATHS.some((p) => stripped === p || stripped.startsWith(p + "/"))
  );
}

function isAdminPath(pathname: string): boolean {
  const stripped = pathname.replace(/^\/(pt|en)/, "");
  return ADMIN_PATHS.some((p) => stripped === p || stripped.startsWith(p + "/"));
}

export async function middleware(request: NextRequest) {
  // Skip for API routes and static files
  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
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

  // Create Supabase client for auth check
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
    const locale =
      pathname.startsWith("/en/") || pathname === "/en" ? "en" : "pt";
    const loginPath = locale === "en" ? "/en/login" : "/login";
    const url = request.nextUrl.clone();
    url.pathname = loginPath;
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  // Admin path: role check happens at the API/page level
  // Middleware only checks authentication here
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
