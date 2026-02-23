import { createClient } from "@/lib/supabase/server";
import { prisma } from "@aptis/database";
import { NextResponse } from "next/server";
import type { UserRole } from "@aptis/database";

interface AuthResult {
  user: { id: string; email: string };
  dbUser: { id: string; role: UserRole };
}

interface AuthError {
  error: NextResponse;
}

/**
 * Require authenticated user. Returns user info or error response.
 */
export async function requireAuth(): Promise<AuthResult | AuthError> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, role: true },
  });

  if (!dbUser) {
    return {
      error: NextResponse.json({ error: "User not found" }, { status: 404 }),
    };
  }

  return { user: { id: user.id, email: user.email! }, dbUser };
}

/**
 * Require admin role.
 */
export async function requireAdmin(): Promise<AuthResult | AuthError> {
  const result = await requireAuth();

  if ("error" in result) return result;

  if (result.dbUser.role !== "ADMIN") {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return result;
}

/**
 * Type guard to check if result is an error.
 */
export function isAuthError(
  result: AuthResult | AuthError
): result is AuthError {
  return "error" in result;
}
