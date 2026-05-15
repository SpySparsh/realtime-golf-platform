import { QUEUE_NAMES } from "@/queues/queue-names";
import { getQueue } from "@/queues/queue-factory";

export type SubscriptionRenewalJobData = {
  subscriptionId: string;
  userId: string;
  runAt: string;
};

export type FailedPaymentRetryJobData = {
  subscriptionId: string;
  stripeSubscriptionId?: string | null;
  attempt: number;
  runAt: string;
};

export async function enqueueSubscriptionRenewal(data: SubscriptionRenewalJobData) {
  const queue = getQueue<SubscriptionRenewalJobData>(QUEUE_NAMES.billing);
  return queue.add("subscription-renewal", data, {
    jobId: `subscription-renewal:${data.subscriptionId}:${data.runAt}`,
    delay: Math.max(new Date(data.runAt).getTime() - Date.now(), 0),
  });
}

export async function enqueueFailedPaymentRetry(data: FailedPaymentRetryJobData) {
  const queue = getQueue<FailedPaymentRetryJobData>(QUEUE_NAMES.billing);
  return queue.add("failed-payment-retry", data, {
    jobId: `payment-retry:${data.subscriptionId}:${data.attempt}`,
    delay: Math.max(new Date(data.runAt).getTime() - Date.now(), 0),
  });
}

