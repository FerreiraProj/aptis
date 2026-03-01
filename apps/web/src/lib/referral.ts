import { prisma } from "@aptis/database";

/** Generate a referral code in the format "ABC-X9Y2" (3 letters + 4 alphanumeric). */
function generate(fullName?: string | null): string {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const alphanum = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const prefix = fullName
    ? fullName
        .toUpperCase()
        .replace(/[^A-Z]/g, "")
        .slice(0, 3)
        .padEnd(3, letters[Math.floor(Math.random() * 26)])
    : Array.from({ length: 3 }, () => letters[Math.floor(Math.random() * 26)]).join("");
  const suffix = Array.from({ length: 4 }, () => alphanum[Math.floor(Math.random() * alphanum.length)]).join("");
  return `${prefix}-${suffix}`;
}

/** Get or create the referral code for a user. Safe to call on every visit. */
export async function getOrCreateReferralCode(userId: string, fullName?: string | null) {
  const existing = await prisma.referralCode.findUnique({ where: { userId } });
  if (existing) return existing;

  // Retry up to 5 times on collision (extremely rare)
  for (let i = 0; i < 5; i++) {
    const code = generate(fullName);
    try {
      return await prisma.referralCode.create({ data: { userId, code } });
    } catch {
      // unique constraint violation — try again
    }
  }
  throw new Error("Failed to generate a unique referral code after 5 attempts");
}

/** Resolve a raw code string to a ReferralCode row (or null). */
export async function resolveCode(code: string) {
  return prisma.referralCode.findUnique({ where: { code: code.toUpperCase() } });
}

/**
 * Register that `referredUserId` used `code` to sign up.
 * Creates a ReferralUse with convertedAt = null (signup but not yet paid).
 * Silently ignores duplicate signups (same code + user).
 */
export async function registerReferralSignup(code: string, referredUserId: string) {
  const referralCode = await resolveCode(code);
  if (!referralCode) return;

  // Don't let someone refer themselves
  if (referralCode.userId === referredUserId) return;

  try {
    await prisma.referralUse.create({
      data: { referralCodeId: referralCode.id, referredUserId },
    });
  } catch {
    // Unique constraint: already registered — ignore
  }
}

/**
 * Mark the referral as converted (first payment received).
 * Increments the referrer's pendingMonths by 1 and applies months to Stripe.
 */
export async function convertReferral(referredUserId: string, stripeSubId: string) {
  const use = await prisma.referralUse.findFirst({
    where: { referredUserId, convertedAt: null },
  });
  if (!use) return;

  const now = new Date();
  await prisma.referralUse.update({
    where: { id: use.id },
    data: { convertedAt: now, stripeSubId },
  });

  // Credit 1 month to the referrer
  await prisma.referralCode.update({
    where: { id: use.referralCodeId },
    data: { pendingMonths: { increment: 1 } },
  });

  // Import here to avoid circular deps
  const { applyPendingReferralMonths } = await import("./stripe/discounts");
  const referralCode = await prisma.referralCode.findUnique({
    where: { id: use.referralCodeId },
    select: { userId: true },
  });
  if (referralCode) {
    await applyPendingReferralMonths(referralCode.userId);
  }
}
