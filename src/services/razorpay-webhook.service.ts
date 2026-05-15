import { createHmac, createHash, timingSafeEqual } from "crypto";
import { env, requireEnv } from "@/infrastructure/config/env";
import { logger } from "@/observability/logger";
import { enqueuePaymentWebhook } from "@/queues/payment-webhook.queue";
import { PaymentReconciliationsRepository } from "@/repositories/payment-reconciliations.repository";
import { PaymentWebhookEventsRepository } from "@/repositories/payment-webhook-events.repository";
import { SubscriptionsRepository } from "@/repositories/subscriptions.repository";
import { SubscriptionsService } from "@/services/subscriptions.service";
import { badRequest, forbidden } from "@/utils/app-error";

type RazorpayWebhookPayload = {
  entity?: string;
  account_id?: string;
  event?: string;
  created_at?: number;
  payload?: Record<string, { entity?: Record<string, any> }>;
};

export class RazorpayWebhookService {
  constructor(
    private readonly webhookEventsRepository: PaymentWebhookEventsRepository,
    private readonly reconciliationsRepository: PaymentReconciliationsRepository,
    private readonly subscriptionsRepository: SubscriptionsRepository,
    private readonly subscriptionsService?: SubscriptionsService
  ) {}

  async acceptWebhook(input: {
    rawBody: string;
    signature: string | null;
    providerEventId: string | null;
  }) {
    if (!input.signature) throw badRequest("Missing x-razorpay-signature");
    if (!input.providerEventId) throw badRequest("Missing x-razorpay-event-id");

    const signatureSha256 = createHash("sha256").update(input.signature).digest("hex");
    this.verifySignature(input.rawBody, input.signature);

    const payload = this.parsePayload(input.rawBody);
    this.assertFresh(payload);

    const { data, error } = await this.webhookEventsRepository.createReceived({
      provider: "razorpay",
      provider_event_id: input.providerEventId,
      event_type: payload.event!,
      event_created_at: new Date(payload.created_at! * 1000).toISOString(),
      signature_sha256: signatureSha256,
      payload: payload as Record<string, unknown>,
      metadata: {
        accountId: payload.account_id ?? null,
      },
    });

    if (error?.code === "23505") {
      const { data: existing } = await this.webhookEventsRepository.findByProviderEventId(
        "razorpay",
        input.providerEventId
      );
      if (existing && ["received", "failed"].includes(existing.status)) {
        await this.enqueuePersistedEvent(existing);
      }

      logger.info("razorpay.webhook.duplicate", {
        providerEventId: input.providerEventId,
        eventType: payload.event,
        status: existing?.status,
      });
      return { accepted: true, duplicate: true };
    }
    if (error) throw error;

    await this.enqueuePersistedEvent(data);

    logger.info("razorpay.webhook.queued", {
      webhookEventId: data.id,
      providerEventId: input.providerEventId,
      eventType: payload.event,
    });

    return { accepted: true, duplicate: false };
  }

  async processPersistedEvent(webhookEventId: string) {
    const { data: event, error } = await this.webhookEventsRepository.findById(webhookEventId);
    if (error) throw error;
    if (!event) throw new Error(`Payment webhook event not found: ${webhookEventId}`);
    return this.processEventRecord(event);
  }

  async processEventRecordById(id: string) {
    const { data: event, error } = await this.webhookEventsRepository.findById(id);
    if (error) throw error;
    if (!event) throw new Error(`Payment webhook event not found: ${id}`);
    return this.processEventRecord(event);
  }

  private async processEventRecord(event: any) {
    if (event.status === "processed" || event.status === "ignored") {
      return { status: event.status, skipped: true };
    }

    const { data: locked, error: lockError } = await this.webhookEventsRepository.markProcessing(event.id);
    if (lockError) throw lockError;
    if (!locked) return { status: event.status, skipped: true };

    try {
      const result = await this.reconcile(locked);
      if (result.status === "ignored") {
        await this.webhookEventsRepository.markIgnored(locked.id, result.reason ?? "unsupported_event");
      } else {
        await this.webhookEventsRepository.markProcessed(locked.id, result.reconciliationId);
      }
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown webhook processing error";
      await this.webhookEventsRepository.markFailed(locked.id, message);
      logger.error("razorpay.webhook.processing_failed", {
        webhookEventId: locked.id,
        providerEventId: locked.provider_event_id,
        error: message,
      });
      throw error;
    }
  }

  private async enqueuePersistedEvent(event: any) {
    await enqueuePaymentWebhook({
      webhookEventId: event.id,
      provider: "razorpay",
      providerEventId: event.provider_event_id,
    });
    await this.webhookEventsRepository.markQueued(event.id);
  }

  private async reconcile(event: any) {
    const payload = event.payload as RazorpayWebhookPayload;
    const eventType = payload.event ?? event.event_type;
    const payment = this.entity(payload, "payment");
    const subscriptionEntity = this.entity(payload, "subscription");
    const order = this.entity(payload, "order");

    const paymentId = payment?.id ?? null;
    const orderId = payment?.order_id ?? order?.id ?? null;
    const razorpaySubscriptionId =
      payment?.subscription_id ?? subscriptionEntity?.id ?? this.note(payment, "razorpay_subscription_id");
    const userId = this.note(payment, "supabase_user_id") ?? this.note(subscriptionEntity, "supabase_user_id");
    const localSubscriptionId =
      this.note(payment, "subscription_id") ?? this.note(subscriptionEntity, "subscription_id");

    const status = this.reconciliationStatus(eventType);
    if (status === "ignored" || status === "refunded") {
      const { data } = await this.reconciliationsRepository.record({
        provider: "razorpay",
        provider_event_id: event.provider_event_id,
        provider_payment_id: paymentId,
        provider_order_id: orderId,
        provider_subscription_id: razorpaySubscriptionId,
        status,
        amount: payment?.amount ?? order?.amount ?? null,
        currency: payment?.currency ?? order?.currency ?? null,
        raw_payload: payload as Record<string, unknown>,
      });
      return {
        status,
        reconciliationId: data?.id,
        reason: status === "ignored" ? "unsupported_event" : undefined,
      };
    }

    const subscription = await this.findSubscription({
      localSubscriptionId,
      razorpaySubscriptionId,
      paymentId,
    });

    const patch = {
      razorpay_customer_id: payment?.customer_id ?? subscriptionEntity?.customer_id ?? null,
      razorpay_subscription_id: razorpaySubscriptionId ?? subscription?.razorpay_subscription_id ?? null,
      razorpay_payment_id: paymentId ?? subscription?.razorpay_payment_id ?? null,
      razorpay_order_id: orderId ?? subscription?.razorpay_order_id ?? null,
      amount_pence: typeof payment?.amount === "number" ? payment.amount : subscription?.amount_pence,
      lifecycle_metadata: {
        ...(subscription?.lifecycle_metadata ?? {}),
        razorpay: {
          lastEventType: eventType,
          lastPaymentId: paymentId,
          lastOrderId: orderId,
          lastReconciledAt: new Date().toISOString(),
        },
      },
      ...(status === "failed"
        ? {
            last_payment_failed_at: new Date().toISOString(),
          }
        : {}),
    };

    if (subscription && this.subscriptionsService) {
      await this.subscriptionsService.transitionSubscription({
        subscription,
        toStatus: status === "paid" ? "active" : "payment_failed",
        reason: status === "paid" ? "invoice_paid" : "invoice_payment_failed",
        providerEventId: event.provider_event_id,
        patch,
        metadata: {
          provider: "razorpay",
          eventType,
          paymentId,
          orderId,
        },
      });
    }

    const { data, error } = await this.reconciliationsRepository.record({
      provider: "razorpay",
      provider_event_id: event.provider_event_id,
      provider_payment_id: paymentId,
      provider_order_id: orderId,
      provider_subscription_id: razorpaySubscriptionId,
      subscription_id: subscription?.id ?? localSubscriptionId ?? null,
      user_id: subscription?.user_id ?? userId ?? null,
      status,
      amount: payment?.amount ?? order?.amount ?? null,
      currency: payment?.currency ?? order?.currency ?? null,
      raw_payload: payload as Record<string, unknown>,
      metadata: {
        eventType,
        subscriptionFound: Boolean(subscription),
      },
    });
    if (error) throw error;

    logger.info("razorpay.payment.reconciled", {
      webhookEventId: event.id,
      providerEventId: event.provider_event_id,
      eventType,
      status,
      paymentId,
      subscriptionId: subscription?.id ?? localSubscriptionId ?? null,
    });

    return { status, reconciliationId: data?.id };
  }

  private async findSubscription(input: {
    localSubscriptionId?: string | null;
    razorpaySubscriptionId?: string | null;
    paymentId?: string | null;
  }) {
    if (input.localSubscriptionId) {
      const { data } = await this.subscriptionsRepository.findById(input.localSubscriptionId);
      if (data) return data;
    }

    if (input.razorpaySubscriptionId) {
      const { data } = await this.subscriptionsRepository.findByRazorpaySubscriptionId(
        input.razorpaySubscriptionId
      );
      if (data) return data;
    }

    if (input.paymentId) {
      const { data } = await this.subscriptionsRepository.findByRazorpayPaymentId(input.paymentId);
      if (data) return data;
    }

    return null;
  }

  private verifySignature(rawBody: string, signature: string) {
    const expected = createHmac("sha256", requireEnv("razorpayWebhookSecret"))
      .update(rawBody)
      .digest("hex");

    const actualBuffer = Buffer.from(signature, "hex");
    const expectedBuffer = Buffer.from(expected, "hex");
    if (
      actualBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(actualBuffer, expectedBuffer)
    ) {
      throw forbidden("Invalid Razorpay webhook signature");
    }
  }

  private parsePayload(rawBody: string): RazorpayWebhookPayload {
    let payload: RazorpayWebhookPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      throw badRequest("Invalid Razorpay webhook payload");
    }

    if (payload.entity !== "event" || !payload.event || !payload.created_at) {
      throw badRequest("Malformed Razorpay webhook payload");
    }

    return payload;
  }

  private assertFresh(payload: RazorpayWebhookPayload) {
    const eventTimeMs = Number(payload.created_at) * 1000;
    const now = Date.now();
    const maxAgeMs = env.razorpayWebhookToleranceSeconds * 1000;
    const futureSkewMs = 5 * 60 * 1000;

    if (!Number.isFinite(eventTimeMs)) throw badRequest("Invalid Razorpay event timestamp");
    if (eventTimeMs > now + futureSkewMs) throw forbidden("Razorpay webhook timestamp is in the future");
    if (now - eventTimeMs > maxAgeMs) throw forbidden("Razorpay webhook timestamp is outside replay window");
  }

  private entity(payload: RazorpayWebhookPayload, key: string) {
    return payload.payload?.[key]?.entity ?? null;
  }

  private note(entity: any, key: string) {
    const notes = entity?.notes;
    if (!notes || Array.isArray(notes)) return null;
    return typeof notes[key] === "string" && notes[key] ? notes[key] : null;
  }

  private reconciliationStatus(eventType: string) {
    if (["payment.captured", "order.paid", "subscription.charged"].includes(eventType)) return "paid";
    if (["payment.failed", "subscription.halted"].includes(eventType)) return "failed";
    if (["refund.processed", "payment.refunded"].includes(eventType)) return "refunded";
    return "ignored";
  }
}
