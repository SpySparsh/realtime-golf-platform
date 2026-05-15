import { SubscriptionsRepository } from "@/repositories/subscriptions.repository";
import { SubscriptionAuditRepository } from "@/repositories/subscription-audit.repository";
import { env } from "@/infrastructure/config/env";
import {
  assertSubscriptionTransition,
  type SubscriptionLifecycleState,
  type SubscriptionTransitionReason,
} from "@/services/subscription-state-machine";
import {
  enqueueFailedPaymentRetry,
  enqueueSubscriptionRenewal,
} from "@/queues/subscription.queue";
import type { UpdateSubscriptionInput } from "@/validators/subscriptions.validator";

export class SubscriptionsService {
  constructor(
    private readonly subscriptionsRepository: SubscriptionsRepository,
    private readonly auditRepository?: SubscriptionAuditRepository
  ) {}

  async getUserSubscription(userId: string) {
    const { data, error } = await this.subscriptionsRepository.findByUserId(userId);
    if (error) throw error;
    return data;
  }

  async updateUserSubscription(userId: string, input: UpdateSubscriptionInput) {
    const { data, error } = await this.subscriptionsRepository.updateForUser(userId, input);
    if (error) throw error;
    return data;
  }

  async transitionSubscription(input: {
    subscription: any;
    toStatus: SubscriptionLifecycleState;
    reason: SubscriptionTransitionReason;
    providerEventId?: string;
    metadata?: Record<string, unknown>;
    patch?: Record<string, unknown>;
  }) {
    const fromStatus = input.subscription?.status as SubscriptionLifecycleState | undefined;
    assertSubscriptionTransition(fromStatus, input.toStatus);

    const { data, error } = await this.subscriptionsRepository.updateById(input.subscription.id, {
      ...(input.patch ?? {}),
      status: input.toStatus,
    });
    if (error) throw error;

    await this.auditRepository?.record({
      subscription_id: input.subscription.id,
      user_id: input.subscription.user_id,
      from_status: fromStatus,
      to_status: input.toStatus,
      reason: input.reason,
      provider_event_id: input.providerEventId,
      metadata: input.metadata,
    });

    await this.scheduleLifecycleJobs(data);
    return data;
  }

  async scheduleLifecycleJobs(subscription: any) {
    if (!env.redisUrl || !subscription) return;

    if (subscription.status === "active" && subscription.current_period_end) {
      await enqueueSubscriptionRenewal({
        subscriptionId: subscription.id,
        userId: subscription.user_id,
        runAt: subscription.current_period_end,
      });
    }

    if (subscription.status === "payment_failed" || subscription.status === "grace_period") {
      const runAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      await enqueueFailedPaymentRetry({
        subscriptionId: subscription.id,
        stripeSubscriptionId: subscription.stripe_subscription_id,
        attempt: Number(subscription.payment_retry_count ?? 0) + 1,
        runAt,
      });
    }
  }

  async cancelSubscription(subscriptionId: string, reason: SubscriptionTransitionReason = "user_cancelled") {
    const { data: subscription, error } = await this.subscriptionsRepository.updateById(subscriptionId, {
      cancel_at_period_end: true,
    });
    if (error) throw error;

    return this.transitionSubscription({
      subscription,
      toStatus: "cancelled",
      reason,
      patch: {
        cancelled_at: new Date().toISOString(),
      },
    });
  }
}
