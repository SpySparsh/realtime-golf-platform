import { Worker, type Job } from "bullmq";
import { env } from "@/infrastructure/config/env";
import { getRedisConnection } from "@/infrastructure/redis/redis.client";
import { logger } from "@/observability/logger";
import { enqueueDeadLetter } from "@/queues/dead-letter.queue";
import type { QueueName } from "@/queues/queue-names";

type JobHandler<T> = (job: Job<T>) => Promise<unknown>;

export function createWorker<T>(queueName: QueueName, handler: JobHandler<T>) {
  const worker = new Worker<T>(
    queueName,
    async (job) => {
      logger.info("job.started", {
        queue: queueName,
        jobId: job.id,
        jobName: job.name,
        attemptsMade: job.attemptsMade,
      });

      const result = await handler(job);

      logger.info("job.completed", {
        queue: queueName,
        jobId: job.id,
        jobName: job.name,
      });

      return result;
    },
    {
      connection: getRedisConnection(),
      concurrency: env.queueWorkerConcurrency,
    }
  );

  worker.on("failed", async (job, error) => {
    logger.error("job.failed", {
      queue: queueName,
      jobId: job?.id,
      jobName: job?.name,
      attemptsMade: job?.attemptsMade,
      failedReason: error.message,
    });

    if (!job || job.attemptsMade < (job.opts.attempts ?? 1)) return;

    await enqueueDeadLetter({
      sourceQueue: queueName,
      sourceJobName: job.name,
      sourceJobId: job.id,
      attemptsMade: job.attemptsMade,
      failedReason: error.message,
      payload: job.data,
      failedAt: new Date().toISOString(),
    });
  });

  worker.on("error", (error) => {
    logger.error("worker.error", { queue: queueName, error: error.message });
  });

  return worker;
}

