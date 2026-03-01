import { Resend } from "resend";
import * as React from "react";

let _resend: Resend | null = null;

function lazyResend(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("RESEND_API_KEY is not configured");
    _resend = new Resend(key);
  }
  return _resend;
}

// Lazy proxy — safe to import at module level; only initializes when accessed
export const resend = new Proxy({} as Resend, {
  get(_, prop: string | symbol) {
    return lazyResend()[prop as keyof Resend];
  },
});

// ─── Email senders ────────────────────────────────────────────────────────────

const FROM = "Aptis <noreply@aptis.app>";

export async function sendLoyaltyDiscountWarning(
  email: string,
  name: string,
  pct: number
) {
  const { LoyaltyWarningEmail } = await import("./templates/loyalty-warning");
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "O teu desconto de fidelidade foi removido",
    react: React.createElement(LoyaltyWarningEmail, { name, pct }),
  });
}

export async function sendReferralRewardEmail(
  email: string,
  name: string,
  pendingMonths: number
) {
  const { ReferralRewardEmail } = await import("./templates/referral-reward");
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `Parabéns! Ganhaste ${pendingMonths} ${pendingMonths === 1 ? "mês" : "meses"} de desconto`,
    react: React.createElement(ReferralRewardEmail, { name, pendingMonths }),
  });
}
