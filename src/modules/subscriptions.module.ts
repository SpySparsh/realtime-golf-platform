import { SubscriptionsRepository } from "@/repositories/subscriptions.repository";
import { SubscriptionAuditRepository } from "@/repositories/subscription-audit.repository";
import { SubscriptionsService } from "@/services/subscriptions.service";

export function createSubscriptionsService(supabase: any) {
  return new SubscriptionsService(
    new SubscriptionsRepository(supabase),
    new SubscriptionAuditRepository(supabase)
  );
}
