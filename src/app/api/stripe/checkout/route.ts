import { createClient } from "@/lib/supabase/server";
import { stripe, PLAN_AMOUNTS_PENCE } from "@/lib/stripe";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * POST /api/stripe/checkout
 * Creates a Stripe Checkout Session for a new subscription.
 * Body: { plan: "monthly" | "yearly", charityId: string, charityPercentage: number }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // 1. Verify user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { plan, charityId, charityPercentage = 10 } = body as {
    plan: "monthly" | "yearly";
    charityId?: string;
    charityPercentage?: number;
  };

  if (!plan || !["monthly", "yearly"].includes(plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  if (charityPercentage < 10 || charityPercentage > 100) {
    return NextResponse.json({ error: "Invalid charity percentage" }, { status: 400 });
  }

  // 2. Get or create Stripe customer
  const { data: existingSub } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  let customerId = existingSub?.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;
  }

  // 3. Build line item directly with unit_amount (no Price IDs required)
  const amountPence = PLAN_AMOUNTS_PENCE[plan];
  const interval = plan === "monthly" ? "month" : "year";

  // 4. Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [
      {
        price_data: {
          currency: "gbp",
          unit_amount: amountPence,
          recurring: { interval },
          product_data: {
            name: `Golf Charity Platform — ${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`,
            description: `Includes monthly prize draws and ${charityPercentage}% charity contribution`,
          },
        },
        quantity: 1,
      },
    ],
    subscription_data: {
      metadata: {
        supabase_user_id: user.id,
        plan,
        charity_id: charityId ?? "",
        charity_percentage: String(charityPercentage),
      },
    },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
    allow_promotion_codes: true,
    billing_address_collection: "auto",
  });

  return NextResponse.json({ url: session.url });
}
