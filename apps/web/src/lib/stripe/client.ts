import Stripe from "stripe";

let _stripe: Stripe | null = null;

function lazyStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
    _stripe = new Stripe(key, {
      apiVersion: "2026-01-28.clover",
      typescript: true,
    });
  }
  return _stripe;
}

// Lazy proxy — safe to import at module level; only initializes when accessed
export const stripe = new Proxy({} as Stripe, {
  get(_, prop: string | symbol) {
    return lazyStripe()[prop as keyof Stripe];
  },
});
