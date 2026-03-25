import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
  typescript: true,
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
