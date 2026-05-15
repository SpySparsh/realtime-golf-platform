import type { NextRequest } from "next/server";
import { getAuthenticatedContext } from "@/middlewares/auth";
import { withApiHandler } from "@/middlewares/api-handler";
import { createStripeService } from "@/modules/stripe.module";
import { ok } from "@/utils/api-response";

/**
 * POST /api/stripe/portal
 * Creates a Stripe billing portal session so users can manage their subscription.
 */
export const POST = withApiHandler(async (_request: NextRequest) => {
  const { supabase, user } = await getAuthenticatedContext();
  const stripeService = createStripeService(supabase);
  const result = await stripeService.createBillingPortalSession(user.id);
  return ok(result);
});
