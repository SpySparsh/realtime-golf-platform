import type { Job } from "bullmq";
import { logger } from "@/observability/logger";
import type { BillingJobData } from "@/queues/job-types";
import type {
  FailedPaymentRetryJobData,
  SubscriptionRenewalJobData,
} from "@/queues/subscription.queue";

export async function processBillingJob(
  job: Job<BillingJobData | SubscriptionRenewalJobData | FailedPaymentRetryJobData>
) {
  if (job.name === "subscription-renewal") {
    const data = job.data as SubscriptionRenewalJobData;
    logger.info("subscription.renewal.due", {
      subscriptionId: data.subscriptionId,
      userId: data.userId,
      runAt: data.runAt,
    });
    return { success: true, action: "renewal_due_logged" };
  }

  if (job.name === "failed-payment-retry") {
    const data = job.data as FailedPaymentRetryJobData;
    logger.warn("subscription.payment_retry.due", {
      subscriptionId: data.subscriptionId,
      stripeSubscriptionId: data.stripeSubscriptionId,
      attempt: data.attempt,
      runAt: data.runAt,
    });
    return { success: true, action: "payment_retry_due_logged" };
  }

  const data = job.data as BillingJobData;
  logger.info("billing.monthly.placeholder", {
    billingMonth: data.billingMonth,
    dryRun: data.dryRun ?? false,
  });

  return { success: true, processed: false };
}
