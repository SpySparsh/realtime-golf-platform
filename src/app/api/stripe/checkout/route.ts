import type { NextRequest } from "next/server";
import { getAuthenticatedContext } from "@/middlewares/auth";
import { withApiHandler } from "@/middlewares/api-handler";
import { createStripeService } from "@/modules/stripe.module";
import { ok } from "@/utils/api-response";
import { validateCheckoutInput } from "@/validators/stripe.validator";

/**
 * POST /api/stripe/checkout
 * Creates a Stripe Checkout Session for a new subscription.
 */
export const POST = withApiHandler(async (request: NextRequest) => {
  const { supabase, user } = await getAuthenticatedContext();
  const input = validateCheckoutInput(await request.json());
  const stripeService = createStripeService(supabase);
  const result = await stripeService.createCheckoutSession(user, input);
  return ok(result);
});
