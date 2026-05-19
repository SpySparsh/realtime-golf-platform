import { QUEUE_NAMES } from "@/queues/queue-names";
import { createWorker } from "@/queues/worker-factory";
import { processAnalyticsJob } from "@/jobs/analytics.job";
import { processBillingJob } from "@/jobs/billing.job";
import { processDeadLetterJob } from "@/jobs/dead-letter.job";
import { processPrizeDrawJob } from "@/jobs/draw.job";
import { processEmailJob } from "@/jobs/email.job";
import { processLeaderboardJob } from "@/jobs/leaderboard.job";
import { processPaymentWebhookJob } from "@/jobs/payment-webhook.job";
import type {
  AnalyticsJobData,
  BillingJobData,
  DeadLetterJobData,
  EmailJobData,
  LeaderboardJobData,
  PaymentWebhookJobData,
  PrizeDrawJobData,
} from "@/queues/job-types";
import type {
  FailedPaymentRetryJobData,
  SubscriptionRenewalJobData,
} from "@/queues/subscription.queue";
import { logger } from "@/observability/logger";
import { env } from "@/infrastructure/config/env";
import { startObservabilityHttpServer } from "@/observability/http-server";
import { queueWaitingJobs } from "@/observability/metrics";
import { getQueue } from "@/queues/queue-factory";
import "dotenv/config";

const workers = [
  createWorker<EmailJobData>(QUEUE_NAMES.email, processEmailJob),
  createWorker<LeaderboardJobData>(QUEUE_NAMES.leaderboard, processLeaderboardJob),
  createWorker<BillingJobData | SubscriptionRenewalJobData | FailedPaymentRetryJobData>(
    QUEUE_NAMES.billing,
    processBillingJob
  ),
  createWorker<PrizeDrawJobData>(QUEUE_NAMES.draw, processPrizeDrawJob),
  createWorker<AnalyticsJobData>(QUEUE_NAMES.analytics, processAnalyticsJob),
  createWorker<PaymentWebhookJobData>(QUEUE_NAMES.paymentWebhook, processPaymentWebhookJob),
  createWorker<DeadLetterJobData>(QUEUE_NAMES.deadLetter, processDeadLetterJob),
];

const closeObservabilityServer = startObservabilityHttpServer(env.workerMetricsPort, "worker");
const queueMetricsInterval = setInterval(async () => {
  await Promise.all(
    Object.values(QUEUE_NAMES).map(async (queueName) => {
      const counts = await getQueue(queueName).getJobCounts("waiting", "delayed");
      queueWaitingJobs.set({ queue: queueName }, (counts.waiting ?? 0) + (counts.delayed ?? 0));
    })
  );
}, 15_000);

logger.info("workers.started", { count: workers.length });

async function shutdown() {
  logger.info("workers.shutdown");
  clearInterval(queueMetricsInterval);
  await Promise.all(workers.map((worker) => worker.close()));
  await closeObservabilityServer();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
