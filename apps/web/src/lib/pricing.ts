import { prisma } from "@aptis/database";

/** Public plan configs shown on the landing page pricing section. */
export async function getPublicPlans() {
  return prisma.planConfig.findMany({
    where: { isPublic: true },
    orderBy: { priceMonthly: "asc" },
    select: {
      id: true,
      plan: true,
      name: true,
      description: true,
      priceMonthly: true,
      priceYearly: true,
      promoPriceMonthly: true,
      promoPriceYearly: true,
      currency: true,
      features: true,
      trialDays: true,
    },
  });
}

export type PublicPlan = Awaited<ReturnType<typeof getPublicPlans>>[number];
