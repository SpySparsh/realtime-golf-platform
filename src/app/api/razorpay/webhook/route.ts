import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { withApiHandler } from "@/middlewares/api-handler";
import { createRazorpayWebhookService } from "@/modules/razorpay-webhook.module";
import { ok } from "@/utils/api-response";

/**
 * POST /api/razorpay/webhook
 * Verifies Razorpay's raw-body signature, persists the event once, then queues
 * reconciliation. Processing is intentionally async for retry-safe delivery.
 */
export const POST = withApiHandler(async (request: NextRequest) => {
  const rawBody = await request.text();
  const service = createRazorpayWebhookService(createAdminClient());
  const result = await service.acceptWebhook({
    rawBody,
    signature: request.headers.get("x-razorpay-signature"),
    providerEventId: request.headers.get("x-razorpay-event-id"),
  });

  return ok(result);
});
