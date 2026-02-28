import { NextResponse } from "next/server";
import { prisma } from "@aptis/database";
import { requireAdmin, isAuthError } from "@/lib/auth/guards";
import type { PlanTier } from "@aptis/database";

// Default plan configs — seeded on first GET
const DEFAULTS: {
  plan: PlanTier;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  features: string[];
  isPublic: boolean;
  trialDays: number;
}[] = [
  {
    plan: "FREE",
    name: "Free",
    description: "Para explorar a plataforma",
    priceMonthly: 0,
    priceYearly: 0,
    features: [
      "1 documento por mês",
      "20 flashcards por documento",
      "10 questões por documento",
      "50 mensagens de chat/mês",
    ],
    isPublic: true,
    trialDays: 0,
  },
  {
    plan: "PRO",
    name: "Pro",
    description: "Para estudantes a sério",
    priceMonthly: 1500,
    priceYearly: 14400,
    features: [
      "Documentos ilimitados",
      "100 flashcards por documento",
      "50 questões por documento",
      "Chat ilimitado com tutor IA",
      "Simulador de exame",
      "Plano de estudo com IA",
    ],
    isPublic: true,
    trialDays: 7,
  },
  {
    plan: "PREMIUM",
    name: "Premium",
    description: "Tudo ilimitado",
    priceMonthly: 2900,
    priceYearly: 27600,
    features: [
      "Tudo do Pro",
      "Flashcards e questões ilimitados",
      "Análise avançada de progresso",
      "Modo offline",
      "Exportação de materiais",
    ],
    isPublic: true,
    trialDays: 7,
  },
  {
    plan: "INSTITUTIONAL",
    name: "Institucional",
    description: "Para instituições de ensino",
    priceMonthly: 0,
    priceYearly: 0,
    features: [
      "Tudo do Premium",
      "Painel de professor",
      "Gestão de turmas",
      "Preço negociável",
    ],
    isPublic: true,
    trialDays: 0,
  },
];

// GET /api/admin/plans — list all plan configs (seeds if empty)
export async function GET() {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth.error;

  // Seed if no configs exist yet
  const count = await prisma.planConfig.count();
  if (count === 0) {
    await prisma.planConfig.createMany({
      data: DEFAULTS.map((d) => ({
        ...d,
        stripePriceIdMonthly: process.env[`STRIPE_PRICE_ID_${d.plan}_MONTHLY`] ?? null,
        stripePriceIdYearly: process.env[`STRIPE_PRICE_ID_${d.plan}_YEARLY`] ?? null,
      })),
      skipDuplicates: true,
    });
  }

  const plans = await prisma.planConfig.findMany({
    orderBy: { priceMonthly: "asc" },
  });

  return NextResponse.json({ plans });
}
