import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getOrCreateReferralCode } from "@/lib/referral";
import { prisma } from "@aptis/database";
import { ReferralClient } from "@/components/dashboard/referral-client";
import { getTranslations } from "next-intl/server";

export default async function ReferralPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { fullName: true },
  });

  const referralCode = await getOrCreateReferralCode(user.id, dbUser?.fullName);

  const uses = await prisma.referralUse.findMany({
    where: { referralCodeId: referralCode.id },
    select: {
      id: true,
      convertedAt: true,
      createdAt: true,
      referredUser: { select: { email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const t = await getTranslations("referral");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  return (
    <ReferralClient
      code={referralCode.code}
      pendingMonths={referralCode.pendingMonths}
      appliedMonths={referralCode.appliedMonths}
      totalReferrals={uses.length}
      converted={uses.filter((u) => u.convertedAt).length}
      history={uses.map((u) => ({
        id: u.id,
        email: maskEmail(u.referredUser.email),
        signedUpAt: u.createdAt.toISOString(),
        convertedAt: u.convertedAt?.toISOString() ?? null,
      }))}
      appUrl={appUrl}
      t={{
        title: t("title"),
        description: t("description"),
        yourLink: t("yourLink"),
        copy: t("copy"),
        copied: t("copied"),
        shareWhatsApp: t("shareWhatsApp"),
        shareEmail: t("shareEmail"),
        applyMonths: t("applyMonths", { n: referralCode.pendingMonths }),
        applied: t("applied"),
        statsReferrals: t("statsReferrals"),
        statsConverted: t("statsConverted"),
        statsEarned: t("statsEarned"),
        statsApplied: t("statsApplied"),
        historyTitle: t("historyTitle"),
        statusSignedUp: t("statusSignedUp"),
        statusPaid: t("statusPaid"),
      }}
    />
  );
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  return `${local.slice(0, 1)}***@${domain}`;
}
