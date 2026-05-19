import { ProfilesRepository } from "@/repositories/profiles.repository";
import { SubscriptionAuditRepository } from "@/repositories/subscription-audit.repository";
import { SubscriptionsRepository } from "@/repositories/subscriptions.repository";
import { PaymentReconciliationsRepository } from "@/repositories/payment-reconciliations.repository";
import { StripeService } from "@/services/stripe.service";
import { SubscriptionsService } from "@/services/subscriptions.service";

export function createStripeService(supabase: any) {
  const subscriptionsRepository = new SubscriptionsRepository(supabase);
  return new StripeService(
    subscriptionsRepository,
    new ProfilesRepository(supabase),
    new SubscriptionsService(
      subscriptionsRepository,
      new SubscriptionAuditRepository(supabase)
    ),
    new PaymentReconciliationsRepository(supabase)
  );
}
