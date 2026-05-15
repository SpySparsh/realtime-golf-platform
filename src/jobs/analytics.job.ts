import type { Job } from "bullmq";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAnalyticsService } from "@/modules/analytics.module";
import { logger } from "@/observability/logger";
import type { AnalyticsJobData } from "@/queues/job-types";
import { rangeForAnalyticsJob } from "@/services/analytics.service";

export async function processAnalyticsJob(job: Job<AnalyticsJobData>) {
  const range = rangeForAnalyticsJob(job.data.period, job.data.date);

  logger.info("analytics.aggregation.started", {
    jobId: job.id,
    period: job.data.period,
    date: job.data.date,
    from: range.from,
    to: range.to,
  });

  const analytics = createAnalyticsService(createAdminClient());
  const dashboard = await analytics.warmDashboardCache(range);

  logger.info("analytics.aggregation.completed", {
    jobId: job.id,
    period: job.data.period,
    date: job.data.date,
    activeSubscriptions: dashboard.summary.activeSubscriptions,
    mrrPence: dashboard.summary.monthlyRecurringRevenuePence,
    paymentFailures: dashboard.summary.paymentFailures,
    generatedAt: dashboard.generatedAt,
  });

  return {
    success: true,
    aggregated: true,
    range,
    summary: dashboard.summary,
  };
}
