export type PaymentWebhookStatus =
  | "received"
  | "queued"
  | "processing"
  | "processed"
  | "ignored"
  | "failed";

export class PaymentWebhookEventsRepository {
  constructor(private readonly supabase: any) {}

  async createReceived(event: {
    provider: "razorpay";
    provider_event_id: string;
    event_type: string;
    event_created_at: string;
    signature_sha256: string;
    payload: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }) {
    return this.supabase
      .from("payment_webhook_events")
      .insert({
        ...event,
        status: "received",
        metadata: event.metadata ?? {},
      })
      .select()
      .single();
  }

  async findByProviderEventId(provider: string, providerEventId: string) {
    return this.supabase
      .from("payment_webhook_events")
      .select("*")
      .eq("provider", provider)
      .eq("provider_event_id", providerEventId)
      .maybeSingle();
  }

  async findById(id: string) {
    return this.supabase
      .from("payment_webhook_events")
      .select("*")
      .eq("id", id)
      .maybeSingle();
  }

  async markQueued(id: string) {
    return this.updateStatus(id, "queued");
  }

  async markProcessing(id: string) {
    return this.supabase.rpc("claim_payment_webhook_event", { p_event_id: id });
  }

  async markProcessed(id: string, reconciliationId?: string | null) {
    return this.supabase
      .from("payment_webhook_events")
      .update({
        status: "processed",
        processed_at: new Date().toISOString(),
        locked_at: null,
        last_error: null,
        reconciliation_id: reconciliationId ?? null,
      })
      .eq("id", id)
      .select()
      .single();
  }

  async markIgnored(id: string, reason: string) {
    return this.supabase
      .from("payment_webhook_events")
      .update({
        status: "ignored",
        processed_at: new Date().toISOString(),
        locked_at: null,
        last_error: null,
        metadata: { ignored_reason: reason },
      })
      .eq("id", id)
      .select()
      .single();
  }

  async markFailed(id: string, error: string) {
    return this.supabase
      .from("payment_webhook_events")
      .update({
        status: "failed",
        locked_at: null,
        last_error: error,
      })
      .eq("id", id)
      .select()
      .single();
  }

  private async updateStatus(id: string, status: PaymentWebhookStatus) {
    return this.supabase
      .from("payment_webhook_events")
      .update({ status })
      .eq("id", id)
      .select()
      .single();
  }
}
