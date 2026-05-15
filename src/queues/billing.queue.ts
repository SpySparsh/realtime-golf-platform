import { QUEUE_NAMES } from "@/queues/queue-names";
import { getQueue } from "@/queues/queue-factory";
import type { BillingJobData } from "@/queues/job-types";

export async function enqueueMonthlyBilling(data: BillingJobData) {
  const queue = getQueue<BillingJobData>(QUEUE_NAMES.billing);
  return queue.add("process-monthly-billing", data, {
    jobId: `billing:${data.billingMonth}:${data.dryRun ? "dry" : "live"}`,
  });
}

