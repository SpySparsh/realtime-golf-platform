import { ProfilesRepository } from "@/repositories/profiles.repository";
import { SubscriptionsRepository } from "@/repositories/subscriptions.repository";
import { StripeService } from "@/services/stripe.service";

export function createStripeService(supabase: any) {
  return new StripeService(
    new SubscriptionsRepository(supabase),
    new ProfilesRepository(supabase)
  );
}

