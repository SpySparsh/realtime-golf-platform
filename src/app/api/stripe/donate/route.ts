import type { NextRequest } from "next/server";
import { withApiHandler } from "@/middlewares/api-handler";
import { createStripeService } from "@/modules/stripe.module";
import { ok } from "@/utils/api-response";
import { validateDonationInput } from "@/validators/stripe.validator";

export const POST = withApiHandler(async (request: NextRequest) => {
  const { amount } = validateDonationInput(await request.json());
  const stripeService = createStripeService(null);
  const result = await stripeService.createDonationSession(amount);
  return ok(result);
});
