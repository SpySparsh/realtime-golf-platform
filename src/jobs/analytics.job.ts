import type { Job } from "bullmq";
import { logger } from "@/observability/logger";
import type { AnalyticsJobData } from "@/queues/job-types";

export async function processAnalyticsJob(job: Job<AnalyticsJobData>) {
  logger.info("analytics.aggregation.placeholder", {
    period: job.data.period,
    date: job.data.date,
  });

  return { success: true, aggregated: false };
}

