import { Link } from "@/i18n/navigation";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { Check } from "lucide-react";

type PlanRow = {
  id: string;
  plan: string;
  name: string;
  description: string | null;
  priceMonthly: number;
  priceYearly: number;
  promoPriceMonthly: number | null;
  promoPriceYearly: number | null;
  currency: string;
  features: string[];
  trialDays: number;
};

const HIGHLIGHTED: Record<string, boolean> = {
  PRO: true,
};

export async function PricingSection() {
  const t = await getTranslations("pricing");
  const hdrs = await headers();
  const host = hdrs.get("host") ?? "localhost:3000";
  const proto = hdrs.get("x-forwarded-proto") ?? "http";
  const baseUrl = `${proto}://${host}`;

  let plans: PlanRow[] = [];
  try {
    const res = await fetch(`${baseUrl}/api/pricing`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      plans = data.plans ?? [];
    } else {
      console.error("[PricingSection] /api/pricing returned", res.status);
    }
  } catch (err) {
    console.error("[PricingSection] fetch failed:", err);
  }

  if (plans.length === 0) return null;

  const publicPlans = plans.filter((p) => p.plan !== "INSTITUTIONAL");

  function fmtPrice(cents: number): string {
    if (cents === 0) return t("free");
    const euros = cents / 100;
    return `€${euros % 1 === 0 ? euros.toFixed(0) : euros.toFixed(2)}`;
  }

  return (
    <section id="pricing" className="py-24">
      <div className="container mx-auto px-4">
        <h2 className="mb-12 text-center text-3xl font-bold">{t("title")}</h2>
        <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-3">
          {publicPlans.map((p) => {
            const highlighted = !!HIGHLIGHTED[p.plan];
            const hasPromo = p.promoPriceMonthly != null;
            const displayPrice = hasPromo ? p.promoPriceMonthly! : p.priceMonthly;

            return (
              <div
                key={p.plan}
                className={`glass rounded-3xl p-8 flex flex-col relative ${
                  highlighted ? "ring-2 ring-primary/50 shadow-xl shadow-primary/10" : ""
                }`}
              >
                {highlighted && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="btn-gradient rounded-full px-4 py-1 text-xs font-semibold text-white">
                      {t("mostPopular")}
                    </span>
                  </div>
                )}

                <h3 className="mb-1 text-xl font-bold">
                  {t.has(`plans.${p.plan}.name`) ? t(`plans.${p.plan}.name`) : p.name}
                </h3>
                {(t.has(`plans.${p.plan}.description`) || p.description) && (
                  <p className="mb-4 text-sm text-muted-foreground">
                    {t.has(`plans.${p.plan}.description`) ? t(`plans.${p.plan}.description`) : p.description}
                  </p>
                )}

                {/* Price block */}
                <div className="mb-6">
                  {hasPromo && (
                    <p className="text-sm line-through text-muted-foreground">
                      {fmtPrice(p.priceMonthly)}
                    </p>
                  )}
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">{fmtPrice(displayPrice)}</span>
                    {displayPrice > 0 && (
                      <span className="text-sm text-muted-foreground">{t("perMonth")}</span>
                    )}
                  </div>
                  {p.trialDays > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("trialDays", { days: p.trialDays })}
                    </p>
                  )}
                </div>

                {/* Features — use i18n translations, fall back to DB values */}
                <ul className="mb-8 flex-1 space-y-2">
                  {(t.has(`plans.${p.plan}.features`)
                    ? (t.raw(`plans.${p.plan}.features`) as string[])
                    : p.features
                  ).map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check size={14} className="mt-0.5 shrink-0 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/register"
                  className={`block w-full rounded-xl py-2 text-center text-sm font-semibold transition-all ${
                    highlighted
                      ? "btn-gradient text-white"
                      : "glass border border-input hover:brightness-105"
                  }`}
                >
                  {displayPrice === 0 ? t("ctaFree") : t("cta")}
                </Link>
              </div>
            );
          })}
        </div>

        {plans.find((p) => p.plan === "INSTITUTIONAL") && (
          <p className="mt-12 text-center text-sm text-muted-foreground">
            {t("institution")}{" "}
            <a href="mailto:hello@aptis.ai" className="text-primary hover:underline">
              {t("contactUs")}
            </a>
          </p>
        )}
      </div>
    </section>
  );
}
