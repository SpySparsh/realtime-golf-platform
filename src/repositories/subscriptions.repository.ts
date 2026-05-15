import type { UpdateSubscriptionInput } from "@/validators/subscriptions.validator";

export class SubscriptionsRepository {
  constructor(private readonly supabase: any) {}

  async findByUserId(userId: string) {
    return this.supabase
      .from("subscriptions")
      .select("*, charity:charities(*)")
      .eq("user_id", userId)
      .maybeSingle();
  }

  async findStripeCustomerByUserId(userId: string) {
    return this.supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .maybeSingle();
  }

  async findActiveSubscriptions() {
    return this.supabase
      .from("subscriptions")
      .select("prize_pool_contribution_pence, user_id, status")
      .eq("status", "active");
  }

  async updateForUser(userId: string, input: UpdateSubscriptionInput) {
    const updatePayload: Record<string, unknown> = {};
    if (input.charity_id !== undefined) updatePayload.charity_id = input.charity_id;
    if (input.charity_percentage !== undefined) {
      updatePayload.charity_percentage = input.charity_percentage;
    }

    return this.supabase
      .from("subscriptions")
      .update(updatePayload)
      .eq("user_id", userId)
      .select()
      .single();
  }

  async updateByStripeSubscriptionId(stripeSubscriptionId: string, payload: Record<string, unknown>) {
    return this.supabase
      .from("subscriptions")
      .update(payload)
      .eq("stripe_subscription_id", stripeSubscriptionId);
  }

  async upsertFromStripe(payload: Record<string, unknown>) {
    return this.supabase
      .from("subscriptions")
      .upsert(payload, { onConflict: "stripe_subscription_id" });
  }
}

