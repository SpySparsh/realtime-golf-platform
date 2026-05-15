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

logger.info("workers.started", { count: workers.length });

async function shutdown() {
  logger.info("workers.shutdown");
  await Promise.all(workers.map((worker) => worker.close()));
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
