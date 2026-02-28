import { NextResponse } from "next/server";
import { prisma } from "@aptis/database";
import { requireAuth, isAuthError } from "@/lib/auth/guards";
import { SUPPORTED_LOCALES, type SupportedLocale } from "@/i18n/routing";

export async function PUT(req: Request) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth.error;

  const body = await req.json().catch(() => ({}));
  const { locale } = body as { locale: unknown };

  if (!locale || !SUPPORTED_LOCALES.includes(locale as SupportedLocale)) {
    return NextResponse.json({ error: "Invalid locale" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: auth.user.id },
    data: { preferredLocale: locale as string },
  });

  const response = NextResponse.json({ ok: true });
  response.cookies.set("NEXT_LOCALE", locale as string, {
    path: "/",
    maxAge: 365 * 24 * 60 * 60,
  });
  return response;
}
