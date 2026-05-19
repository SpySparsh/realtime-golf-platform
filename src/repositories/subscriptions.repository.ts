import type { UpdateSubscriptionInput } from "@/validators/subscriptions.validator";

export class SubscriptionsRepository {
  constructor(private readonly supabase: any) {}

  async findByUserId(userId: string) {
    return this.supabase
      .from("subscriptions")
      .select("*, charity:charities!subscriptions_charity_id_fkey(*)")
      .eq("user_id", userId)
      .maybeSingle();
  }

  async findById(subscriptionId: string) {
    return this.supabase
      .from("subscriptions")
      .select("*")
      .eq("id", subscriptionId)
      .maybeSingle();
  }

  async findStripeCustomerByUserId(userId: string) {
    return this.supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .maybeSingle();
  }

  async findByStripeSubscriptionId(stripeSubscriptionId: string) {
    return this.supabase
      .from("subscriptions")
      .select("*")
      .eq("stripe_subscription_id", stripeSubscriptionId)
      .maybeSingle();
  }

  async findByRazorpaySubscriptionId(razorpaySubscriptionId: string) {
    return this.supabase
      .from("subscriptions")
      .select("*")
      .eq("razorpay_subscription_id", razorpaySubscriptionId)
      .maybeSingle();
  }

  async findByRazorpayPaymentId(razorpayPaymentId: string) {
    return this.supabase
      .from("subscriptions")
      .select("*")
      .eq("razorpay_payment_id", razorpayPaymentId)
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
      .select("*, charity:charities!subscriptions_charity_id_fkey(*)")
      .single();
  }

  async updateByStripeSubscriptionId(stripeSubscriptionId: string, payload: Record<string, unknown>) {
    return this.supabase
      .from("subscriptions")
      .update(payload)
      .eq("stripe_subscription_id", stripeSubscriptionId);
  }

  async updateById(subscriptionId: string, payload: Record<string, unknown>) {
    return this.supabase
      .from("subscriptions")
      .update(payload)
      .eq("id", subscriptionId)
      .select()
      .single();
  }

  async upsertFromStripe(payload: Record<string, unknown>) {
    return this.supabase
      .from("subscriptions")
      .upsert(payload, { onConflict: "stripe_subscription_id" });
  }
}
