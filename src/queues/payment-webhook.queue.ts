import { QUEUE_NAMES } from "@/queues/queue-names";
import { getQueue } from "@/queues/queue-factory";
import type { PaymentWebhookJobData } from "@/queues/job-types";

export async function enqueuePaymentWebhook(data: PaymentWebhookJobData) {
  const queue = getQueue<PaymentWebhookJobData>(QUEUE_NAMES.paymentWebhook);
  return queue.add("payment-webhook", data, {
    jobId: `payment-webhook:${data.provider}:${data.providerEventId}`,
  });
}
