import { SubscriptionsRepository } from "@/repositories/subscriptions.repository";
import { SubscriptionsService } from "@/services/subscriptions.service";

export function createSubscriptionsService(supabase: any) {
  return new SubscriptionsService(new SubscriptionsRepository(supabase));
}

