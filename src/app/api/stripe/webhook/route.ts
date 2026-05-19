import type { NextRequest } from "next/server";
import { createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { withApiHandler } from "@/middlewares/api-handler";
import { createStripeService } from "@/modules/stripe.module";
import { PaymentWebhookEventsRepository } from "@/repositories/payment-webhook-events.repository";
import { badRequest } from "@/utils/app-error";
import { ok } from "@/utils/api-response";
import { logger } from "@/observability/logger";

/**
 * POST /api/stripe/webhook
 * Handles Stripe events and syncs state to Supabase.
 */
export const POST = withApiHandler(async (request: NextRequest) => {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) throw badRequest("Missing stripe-signature");

  const adminClient = createAdminClient();
  const stripeService = createStripeService(adminClient);
  const event = stripeService.constructWebhookEvent(body, signature);
  const webhookEvents = new PaymentWebhookEventsRepository(adminClient);
  const signatureSha256 = createHash("sha256").update(signature).update(".").update(body).digest("hex");

  const { data: existing, error: existingError } = await webhookEvents.findByProviderEventId("stripe", event.id);
  if (existingError) throw existingError;

  if (existing?.status === "processed") {
    logger.info("stripe.webhook.duplicate_processed", {
      stripeEventId: event.id,
      stripeEventType: event.type,
      webhookEventId: existing.id,
    });
    return ok({ received: true, duplicate: true });
  }

  let webhookEvent = existing;
  if (!webhookEvent) {
    const { data, error } = await webhookEvents.createReceived({
      provider: "stripe",
      provider_event_id: event.id,
      event_type: event.type,
      event_created_at: new Date(event.created * 1000).toISOString(),
      signature_sha256: signatureSha256,
      payload: event as unknown as Record<string, unknown>,
    });
    if (error) throw error;
    webhookEvent = data;
  }

  const { data: claimed, error: claimError } = await webhookEvents.markProcessing(webhookEvent.id);
  if (claimError) throw claimError;
  if (!claimed) {
    logger.info("stripe.webhook.not_claimed", {
      stripeEventId: event.id,
      stripeEventType: event.type,
      webhookEventId: webhookEvent.id,
    });
    return ok({ received: true, duplicate: true });
  }

  try {
    const result = await stripeService.handleWebhookEvent(event);
    await webhookEvents.markProcessed(webhookEvent.id);
    return ok(result);
  } catch (error) {
    await webhookEvents.markFailed(
      webhookEvent.id,
      error instanceof Error ? error.message : "Unknown Stripe webhook processing error"
    );
    throw error;
  }
});
