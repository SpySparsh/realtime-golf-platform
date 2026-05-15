import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { withApiHandler } from "@/middlewares/api-handler";
import { createStripeService } from "@/modules/stripe.module";
import { badRequest } from "@/utils/app-error";
import { ok } from "@/utils/api-response";

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
  const result = await stripeService.handleWebhookEvent(event);
  return ok(result);
});
