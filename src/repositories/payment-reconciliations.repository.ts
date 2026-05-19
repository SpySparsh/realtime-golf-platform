export class PaymentReconciliationsRepository {
  constructor(private readonly supabase: any) {}

  async record(event: {
    provider: "razorpay" | "stripe";
    provider_payment_id?: string | null;
    provider_order_id?: string | null;
    provider_subscription_id?: string | null;
    provider_event_id: string;
    subscription_id?: string | null;
    user_id?: string | null;
    status: "paid" | "failed" | "refunded" | "ignored";
    amount?: number | null;
    currency?: string | null;
    raw_payload?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }) {
    return this.supabase
      .from("payment_reconciliations")
      .upsert(
        {
          provider: event.provider,
          provider_payment_id: event.provider_payment_id ?? null,
          provider_order_id: event.provider_order_id ?? null,
          provider_subscription_id: event.provider_subscription_id ?? null,
          provider_event_id: event.provider_event_id,
          subscription_id: event.subscription_id ?? null,
          user_id: event.user_id ?? null,
          status: event.status,
          amount: event.amount ?? null,
          currency: event.currency ?? null,
          raw_payload: event.raw_payload ?? {},
          metadata: event.metadata ?? {},
        },
        { onConflict: "provider,provider_event_id" }
      )
      .select()
      .single();
  }
}
