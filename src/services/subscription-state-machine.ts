import { AppError } from "@/utils/app-error";

export type SubscriptionLifecycleState =
  | "pending"
  | "active"
  | "suspended"
  | "expired"
  | "cancelled"
  | "payment_failed"
  | "grace_period";

export type SubscriptionTransitionReason =
  | "checkout_started"
  | "checkout_completed"
  | "invoice_paid"
  | "invoice_payment_failed"
  | "retry_scheduled"
  | "retry_exhausted"
  | "billing_period_expired"
  | "user_cancelled"
  | "provider_cancelled"
  | "admin_suspended"
  | "admin_reactivated"
  | "webhook_reconciled";

const allowedTransitions: Record<SubscriptionLifecycleState, SubscriptionLifecycleState[]> = {
  pending: ["active", "cancelled", "expired", "payment_failed"],
  active: ["grace_period", "payment_failed", "cancelled", "suspended", "expired"],
  grace_period: ["active", "payment_failed", "cancelled", "suspended", "expired"],
  payment_failed: ["grace_period", "active", "cancelled", "suspended", "expired"],
  suspended: ["active", "cancelled", "expired"],
  expired: ["active", "cancelled"],
  cancelled: ["pending", "active"],
};

export function assertSubscriptionTransition(
  from: SubscriptionLifecycleState | null | undefined,
  to: SubscriptionLifecycleState
) {
  if (!from || from === to) return;

  if (!allowedTransitions[from]?.includes(to)) {
    throw new AppError(
      `Invalid subscription transition from ${from} to ${to}`,
      409,
      "INVALID_SUBSCRIPTION_TRANSITION",
      { from, to }
    );
  }
}

export function mapStripeStatusToLifecycle(status: string): SubscriptionLifecycleState {
  const statusMap: Record<string, SubscriptionLifecycleState> = {
    active: "active",
    trialing: "pending",
    incomplete: "pending",
    incomplete_expired: "expired",
    past_due: "grace_period",
    unpaid: "payment_failed",
    canceled: "cancelled",
    paused: "suspended",
  };

  return statusMap[status] ?? "pending";
}

