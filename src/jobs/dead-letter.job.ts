import type { Job } from "bullmq";
import { logger } from "@/observability/logger";
import type { DeadLetterJobData } from "@/queues/job-types";

export async function processDeadLetterJob(job: Job<DeadLetterJobData>) {
  logger.error("dead-letter.received", job.data as Record<string, unknown>);
  return { success: true };
}

