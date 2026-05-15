import type { NextRequest } from "next/server";
import { getAuthenticatedContext } from "@/middlewares/auth";
import { withApiHandler } from "@/middlewares/api-handler";
import { createSubscriptionsService } from "@/modules/subscriptions.module";
import { ok } from "@/utils/api-response";
import { validateUpdateSubscriptionInput } from "@/validators/subscriptions.validator";

/**
 * GET /api/subscription
 * Returns the current user's subscription with charity details.
 */
export const GET = withApiHandler(async () => {
  const { supabase, user } = await getAuthenticatedContext();
  const subscriptionsService = createSubscriptionsService(supabase);
  const subscription = await subscriptionsService.getUserSubscription(user.id);
  return ok(subscription);
});

/**
 * PATCH /api/subscription
 * Allows users to update their charity selection and contribution percentage.
 */
export const PATCH = withApiHandler(async (request: NextRequest) => {
  const { supabase, user } = await getAuthenticatedContext();
  const input = validateUpdateSubscriptionInput(await request.json());
  const subscriptionsService = createSubscriptionsService(supabase);
  const subscription = await subscriptionsService.updateUserSubscription(user.id, input);
  return ok(subscription);
});
