import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { formatDrawMonth } from "@/lib/utils";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type Stripe from "stripe";

/**
 * POST /api/stripe/webhook
 * Handles all Stripe events and syncs state to Supabase.
 * Uses the service-role admin client (bypasses RLS).
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("[webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // @ts-ignore - Bypass Supabase local schema typings mismatch
  const supabase: any = createAdminClient();

  try {
    switch (event.type) {
      // -----------------------------------------------------------------------
      // Subscription created or updated
      // -----------------------------------------------------------------------
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await upsertSubscription(supabase, subscription);
        break;
      }

      // -----------------------------------------------------------------------
      // Subscription cancelled / deleted
      // -----------------------------------------------------------------------
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await supabase
          .from("subscriptions")
          .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
          .eq("stripe_subscription_id", subscription.id);
        break;
      }

      // -----------------------------------------------------------------------
      // Checkout session completed — subscription just purchased
      // -----------------------------------------------------------------------
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription" || !session.subscription) break;

        // Fetch the full subscription object
        const stripeSubscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );
        await upsertSubscription(supabase, stripeSubscription);

        // Send welcome email
        const userId = stripeSubscription.metadata?.supabase_user_id;
        if (userId) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("email, full_name")
            .eq("id", userId)
            .single();

          if (profile?.email) {
            await sendEmail({
              type: "subscription_confirmed",
              to: profile.email,
              name: profile.full_name ?? "Golfer",
              plan: stripeSubscription.metadata?.plan ?? "monthly",
            });
          }
        }
        break;
      }

      // -----------------------------------------------------------------------
      // Invoice paid — renew period dates
      // -----------------------------------------------------------------------
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId =
          typeof invoice.subscription === "string"
            ? invoice.subscription
            : invoice.subscription?.id;
        if (!subId) break;

        const stripeSubscription = await stripe.subscriptions.retrieve(subId);
        await supabase
          .from("subscriptions")
          .update({
            status: "active",
            current_period_start: new Date(
              stripeSubscription.current_period_start * 1000
            ).toISOString(),
            current_period_end: new Date(
              stripeSubscription.current_period_end * 1000
            ).toISOString(),
          })
          .eq("stripe_subscription_id", subId);
        break;
      }

      // -----------------------------------------------------------------------
      // Payment failed — mark as past_due
      // -----------------------------------------------------------------------
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId =
          typeof invoice.subscription === "string"
            ? invoice.subscription
            : invoice.subscription?.id;
        if (!subId) break;

        await supabase
          .from("subscriptions")
          .update({ status: "past_due" })
          .eq("stripe_subscription_id", subId);
        break;
      }

      default:
        // Unhandled events — just acknowledge
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[webhook] Handler error:", err);
    return NextResponse.json({ error: "Webhook handler error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// Helper: upsert a subscription record from a Stripe.Subscription object
// ---------------------------------------------------------------------------
async function upsertSubscription(
  supabase: any,
  subscription: Stripe.Subscription
) {
  const meta = subscription.metadata ?? {};
  const userId = meta.supabase_user_id;
  if (!userId) return;

  const plan = (meta.plan ?? "monthly") as "monthly" | "yearly";
  const charityId = meta.charity_id || null;
  const charityPct = parseFloat(meta.charity_percentage ?? "10");
  const amountPence =
    plan === "monthly" ? 999 : 9999;

  // Map Stripe status → our enum
  const statusMap: Record<string, string> = {
    active: "active",
    past_due: "past_due",
    canceled: "cancelled",
    trialing: "trialing",
    incomplete: "inactive",
    incomplete_expired: "inactive",
    unpaid: "past_due",
    paused: "inactive",
  };
  const status = (statusMap[subscription.status] ?? "inactive") as
    | "active"
    | "inactive"
    | "cancelled"
    | "past_due"
    | "trialing";

  await supabase.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_customer_id: subscription.customer as string,
      stripe_subscription_id: subscription.id,
      plan,
      status,
      amount_pence: amountPence,
      charity_id: charityId,
      charity_percentage: charityPct,
      current_period_start: new Date(
        subscription.current_period_start * 1000
      ).toISOString(),
      current_period_end: new Date(
        subscription.current_period_end * 1000
      ).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      cancelled_at: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000).toISOString()
        : null,
    },
    { onConflict: "stripe_subscription_id" }
  );
}
