import type Stripe from "stripe";
import { stripe, PLAN_AMOUNTS_PENCE } from "@/lib/stripe";
import { env, requireEnv } from "@/infrastructure/config/env";
import { notFound } from "@/utils/app-error";
import { SubscriptionsRepository } from "@/repositories/subscriptions.repository";
import { ProfilesRepository } from "@/repositories/profiles.repository";
import type { CheckoutInput } from "@/validators/stripe.validator";

export class StripeService {
  constructor(
    private readonly subscriptionsRepository: SubscriptionsRepository,
    private readonly profilesRepository?: ProfilesRepository
  ) {}

  async createCheckoutSession(user: { id: string; email?: string | null }, input: CheckoutInput) {
    const { data: existingSub } = await this.subscriptionsRepository.findStripeCustomerByUserId(user.id);
    let customerId = existingSub?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
    }

    const amountPence = PLAN_AMOUNTS_PENCE[input.plan];
    const interval = input.plan === "monthly" ? "month" : "year";

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
              name: `Golf Charity Platform - ${input.plan.charAt(0).toUpperCase() + input.plan.slice(1)} Plan`,
              description: `Includes monthly prize draws and ${input.charityPercentage}% charity contribution`,
            },
          },
          quantity: 1,
        },
      ],
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
          plan: input.plan,
          charity_id: input.charityId ?? "",
          charity_percentage: String(input.charityPercentage),
        },
      },
      success_url: `${env.appUrl}/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.appUrl}/pricing`,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
    });

    return { url: session.url };
  }

  async createBillingPortalSession(userId: string) {
    const { data: subscription } = await this.subscriptionsRepository.findStripeCustomerByUserId(userId);
    if (!subscription?.stripe_customer_id) throw notFound("No subscription found");

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${env.appUrl}/dashboard`,
    });

    return { url: session.url };
  }

  async createDonationSession(amount: number) {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: {
              name: "One-off Charity Donation",
              description: "Direct independent donation to support our partners.",
            },
            unit_amount: amount * 100,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${env.appUrl}/subscribe/success`,
      cancel_url: `${env.appUrl}/donate`,
      metadata: {
        type: "independent_donation",
      },
    });

    return { url: session.url };
  }

  constructWebhookEvent(body: string, signature: string) {
    return stripe.webhooks.constructEvent(body, signature, requireEnv("stripeWebhookSecret"));
  }

  async handleWebhookEvent(event: Stripe.Event) {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await this.upsertSubscription(subscription);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await this.subscriptionsRepository.updateByStripeSubscriptionId(subscription.id, {
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
        });
        break;
      }
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription" || !session.subscription) break;

        const stripeSubscription = await stripe.subscriptions.retrieve(session.subscription as string);
        await this.upsertSubscription(stripeSubscription);
        await this.sendSubscriptionConfirmedEmail(stripeSubscription);
        break;
      }
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
        if (!subId) break;

        const stripeSubscription = await stripe.subscriptions.retrieve(subId);
        await this.subscriptionsRepository.updateByStripeSubscriptionId(subId, {
          status: "active",
          current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
        });
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
        if (!subId) break;

        await this.subscriptionsRepository.updateByStripeSubscriptionId(subId, { status: "past_due" });
        break;
      }
      default:
        break;
    }

    return { received: true };
  }

  private async sendSubscriptionConfirmedEmail(subscription: Stripe.Subscription) {
    const userId = subscription.metadata?.supabase_user_id;
    if (!userId || !this.profilesRepository) return;

    const { data: profile } = await this.profilesRepository.findEmailProfile(userId);
    if (!profile?.email) return;

    const { sendEmail } = await import("@/lib/email");
    await sendEmail({
      type: "subscription_confirmed",
      to: profile.email,
      name: profile.full_name ?? "Golfer",
      plan: subscription.metadata?.plan ?? "monthly",
    });
  }

  private async upsertSubscription(subscription: Stripe.Subscription) {
    const meta = subscription.metadata ?? {};
    const userId = meta.supabase_user_id;
    if (!userId) return;

    const plan = (meta.plan ?? "monthly") as "monthly" | "yearly";
    const charityPct = parseFloat(meta.charity_percentage ?? "10");
    const amountPence = plan === "monthly" ? 999 : 9999;
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

    await this.subscriptionsRepository.upsertFromStripe({
      user_id: userId,
      stripe_customer_id: subscription.customer as string,
      stripe_subscription_id: subscription.id,
      plan,
      status: statusMap[subscription.status] ?? "inactive",
      amount_pence: amountPence,
      charity_id: meta.charity_id || null,
      charity_percentage: charityPct,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      cancelled_at: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000).toISOString()
        : null,
    });
  }
}
