import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripe() {
  if (!stripeClient) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("Missing required environment variable: STRIPE_SECRET_KEY");
    }

    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-02-24.acacia",
      typescript: true,
    });
  }

  return stripeClient;
}

export const stripe = new Proxy({} as Stripe, {
  get(_target, property) {
    return (getStripe() as any)[property];
  },
});

// Plan price IDs — update these with your Stripe dashboard price IDs
export const STRIPE_PRICES = {
  monthly: process.env.STRIPE_MONTHLY_PRICE_ID ?? "price_monthly",
  yearly: process.env.STRIPE_YEARLY_PRICE_ID ?? "price_yearly",
} as const;

// Monthly plan = £9.99/mo, Yearly = £99.99/yr (£8.33/mo equiv)
export const PLAN_AMOUNTS_PENCE = {
  monthly: 999,
  yearly: 9999,
} as const;
