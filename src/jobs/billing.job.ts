import type { Job } from "bullmq";
import { logger } from "@/observability/logger";
import type { BillingJobData } from "@/queues/job-types";

export async function processBillingJob(job: Job<BillingJobData>) {
  logger.info("billing.monthly.placeholder", {
    billingMonth: job.data.billingMonth,
    dryRun: job.data.dryRun ?? false,
  });

  return { success: true, processed: false };
}

