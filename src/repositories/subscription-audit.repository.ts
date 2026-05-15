import type {
  SubscriptionLifecycleState,
  SubscriptionTransitionReason,
} from "@/services/subscription-state-machine";

export class SubscriptionAuditRepository {
  constructor(private readonly supabase: any) {}

  async record(event: {
    subscription_id?: string | null;
    user_id?: string | null;
    from_status?: SubscriptionLifecycleState | string | null;
    to_status: SubscriptionLifecycleState | string;
    reason: SubscriptionTransitionReason | string;
    provider_event_id?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    try {
      await this.supabase.from("subscription_audit_logs").insert({
        subscription_id: event.subscription_id ?? null,
        user_id: event.user_id ?? null,
        from_status: event.from_status ?? null,
        to_status: event.to_status,
        reason: event.reason,
        provider_event_id: event.provider_event_id ?? null,
        metadata: event.metadata ?? {},
      });
    } catch (error) {
      console.error("[subscription-audit] failed to record event", error);
    }
  }
}

