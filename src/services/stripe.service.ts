import type Stripe from "stripe";
import { stripe, PLAN_AMOUNTS_PENCE } from "@/lib/stripe";
import { env, requireEnv } from "@/infrastructure/config/env";
import { notFound } from "@/utils/app-error";
import { SubscriptionsRepository } from "@/repositories/subscriptions.repository";
import { ProfilesRepository } from "@/repositories/profiles.repository";
import { SubscriptionsService } from "@/services/subscriptions.service";
import { mapStripeStatusToLifecycle } from "@/services/subscription-state-machine";
import { PaymentReconciliationsRepository } from "@/repositories/payment-reconciliations.repository";
import { AppError } from "@/utils/app-error";
import { logger } from "@/observability/logger";
import type { CheckoutInput } from "@/validators/stripe.validator";

export class StripeService {
  constructor(
    private readonly subscriptionsRepository: SubscriptionsRepository,
    private readonly profilesRepository?: ProfilesRepository,
    private readonly subscriptionsService?: SubscriptionsService,
    private readonly paymentReconciliationsRepository?: PaymentReconciliationsRepository
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
      client_reference_id: user.id,
      metadata: {
        supabase_user_id: user.id,
        plan: input.plan,
        charity_id: input.charityId ?? "",
        charity_percentage: String(input.charityPercentage),
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
    logger.info("stripe.webhook.received", {
      stripeEventId: event.id,
      stripeEventType: event.type,
    });

    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await this.reconcileStripeSubscription(subscription, event.id);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await this.reconcileStripeSubscription(subscription, event.id, "cancelled");
        break;
      }
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription" || !session.subscription) break;

        const stripeSubscription = await this.retrieveSubscriptionWithCheckoutMetadata(session);
        const localSubscription = await this.reconcileStripeSubscription(stripeSubscription, event.id, "active");
        await this.recordStripeReconciliation({
          event,
          stripeSubscription,
          localSubscription,
          status: "paid",
          amount: session.amount_total,
          currency: session.currency,
          paymentId: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id,
        });
        await this.sendSubscriptionConfirmedEmail(stripeSubscription);
        break;
      }
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
        if (!subId) break;

        const stripeSubscription = await stripe.subscriptions.retrieve(subId);
        const localSubscription = await this.reconcileStripeSubscription(stripeSubscription, event.id, "active");
        await this.recordStripeReconciliation({
          event,
          stripeSubscription,
          localSubscription,
          status: "paid",
          amount: invoice.amount_paid,
          currency: invoice.currency,
          paymentId: typeof invoice.payment_intent === "string" ? invoice.payment_intent : invoice.payment_intent?.id,
        });
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
        if (!subId) break;

        const stripeSubscription = await stripe.subscriptions.retrieve(subId);
        const localSubscription = await this.reconcileStripeSubscription(stripeSubscription, event.id, "payment_failed");
        await this.recordStripeReconciliation({
          event,
          stripeSubscription,
          localSubscription,
          status: "failed",
          amount: invoice.amount_due,
          currency: invoice.currency,
          paymentId: typeof invoice.payment_intent === "string" ? invoice.payment_intent : invoice.payment_intent?.id,
        });
        break;
      }
      default:
        break;
    }

    return { received: true };
  }

  async reconcileCheckoutSession(sessionId: string, expectedUserId: string) {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });

    if (session.mode !== "subscription" || !session.subscription) {
      throw new AppError("Checkout session is not a subscription", 400, "INVALID_CHECKOUT_SESSION");
    }

    const sessionUserId = session.metadata?.supabase_user_id ?? session.client_reference_id;
    if (sessionUserId && sessionUserId !== expectedUserId) {
      throw new AppError("Checkout session does not belong to this user", 403, "CHECKOUT_SESSION_USER_MISMATCH");
    }

    const stripeSubscription =
      typeof session.subscription === "string"
        ? await this.retrieveSubscriptionWithCheckoutMetadata(session)
        : this.mergeCheckoutMetadataIntoSubscription(session.subscription, session);

    return this.reconcileStripeSubscription(stripeSubscription, `checkout_return:${session.id}`, "active");
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

  private async retrieveSubscriptionWithCheckoutMetadata(session: Stripe.Checkout.Session) {
    const subscriptionId =
      typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
    if (!subscriptionId) {
      throw new AppError("Checkout session is missing subscription id", 400, "CHECKOUT_SESSION_MISSING_SUBSCRIPTION");
    }

    const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
    return this.mergeCheckoutMetadataIntoSubscription(stripeSubscription, session);
  }

  private mergeCheckoutMetadataIntoSubscription(
    stripeSubscription: Stripe.Subscription,
    session: Stripe.Checkout.Session
  ) {
    stripeSubscription.metadata = {
      ...(session.metadata ?? {}),
      ...(stripeSubscription.metadata ?? {}),
      supabase_user_id:
        stripeSubscription.metadata?.supabase_user_id ??
        session.metadata?.supabase_user_id ??
        session.client_reference_id ??
        "",
    };
    return stripeSubscription;
  }

  private async reconcileStripeSubscription(
    subscription: Stripe.Subscription,
    providerEventId?: string,
    forcedStatus?: ReturnType<typeof mapStripeStatusToLifecycle>
  ) {
    const meta = subscription.metadata ?? {};
    let userId = meta.supabase_user_id;
    if (!userId) {
      const { data: existing } = await this.subscriptionsRepository.findByStripeSubscriptionId(subscription.id);
      userId = existing?.user_id;
    }
    if (!userId) {
      logger.warn("stripe.subscription.missing_user_metadata", {
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: subscription.customer,
        providerEventId,
      });
      throw new AppError("Stripe subscription is missing Supabase user metadata", 422, "STRIPE_METADATA_MISSING", {
        stripeSubscriptionId: subscription.id,
      });
    }

    const plan = (meta.plan ?? "monthly") as "monthly" | "yearly";
    const charityPct = parseFloat(meta.charity_percentage ?? "10");
    const amountPence = plan === "monthly" ? 999 : 9999;
    const lifecycleStatus = forcedStatus ?? mapStripeStatusToLifecycle(subscription.status);
    const payload = {
      user_id: userId,
      stripe_customer_id: subscription.customer as string,
      stripe_subscription_id: subscription.id,
      plan,
      status: lifecycleStatus,
      amount_pence: amountPence,
      charity_id: meta.charity_id || null,
      charity_percentage: charityPct,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      cancelled_at: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000).toISOString()
        : null,
    };

    const { data: existing } = await this.subscriptionsRepository.findByStripeSubscriptionId(subscription.id);
    if (!existing) {
      const { error: upsertError } = await this.subscriptionsRepository.upsertFromStripe(payload);
      if (upsertError) throw upsertError;

      const { data: created, error: refetchError } = await this.subscriptionsRepository.findByStripeSubscriptionId(subscription.id);
      if (refetchError) throw refetchError;
      await this.subscriptionsService?.recordWebhookTransition({
        subscription: created,
        toStatus: lifecycleStatus,
        reason: "webhook_reconciled",
        providerEventId,
        metadata: {
          stripeStatus: subscription.status,
          createdFromWebhook: true,
        },
      });
      await this.subscriptionsService?.scheduleLifecycleJobs(created);
      logger.info("stripe.subscription.created", {
        stripeSubscriptionId: subscription.id,
        userId,
        status: lifecycleStatus,
      });
      return created;
    }

    const updated = await this.subscriptionsService?.transitionSubscription({
      subscription: existing,
      toStatus: lifecycleStatus,
      reason: "webhook_reconciled",
      providerEventId,
      patch: payload,
      metadata: {
        stripeStatus: subscription.status,
      },
    });
    logger.info("stripe.subscription.updated", {
      stripeSubscriptionId: subscription.id,
      userId,
      status: lifecycleStatus,
    });
    return updated;
  }

  private async recordStripeReconciliation(input: {
    event: Stripe.Event;
    stripeSubscription: Stripe.Subscription;
    localSubscription: any;
    status: "paid" | "failed";
    amount?: number | null;
    currency?: string | null;
    paymentId?: string | null;
  }) {
    if (!this.paymentReconciliationsRepository) return;

    const { error } = await this.paymentReconciliationsRepository.record({
      provider: "stripe",
      provider_event_id: input.event.id,
      provider_payment_id: input.paymentId ?? null,
      provider_subscription_id: input.stripeSubscription.id,
      subscription_id: input.localSubscription?.id ?? null,
      user_id: input.localSubscription?.user_id ?? input.stripeSubscription.metadata?.supabase_user_id ?? null,
      status: input.status,
      amount: input.amount ?? null,
      currency: input.currency ?? "gbp",
      raw_payload: input.event as unknown as Record<string, unknown>,
      metadata: {
        stripeEventType: input.event.type,
        stripeSubscriptionStatus: input.stripeSubscription.status,
      },
    });
    if (error) throw error;
  }
}
