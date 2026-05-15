import { Worker, type Job } from "bullmq";
import { env } from "@/infrastructure/config/env";
import { getRedisConnection } from "@/infrastructure/redis/redis.client";
import { createCorrelationId, runWithObservabilityContext } from "@/observability/context";
import { logger } from "@/observability/logger";
import {
  errorsTotal,
  queueJobDurationSeconds,
  queueJobsTotal,
  queueWaitingJobs,
} from "@/observability/metrics";
import { enqueueDeadLetter } from "@/queues/dead-letter.queue";
import type { QueueName } from "@/queues/queue-names";

type JobHandler<T> = (job: Job<T>) => Promise<unknown>;

export function createWorker<T>(queueName: QueueName, handler: JobHandler<T>) {
  const worker = new Worker<T>(
    queueName,
    async (job) => {
      const startedAt = process.hrtime.bigint();
      const correlationId = createCorrelationId(
        typeof (job.data as any)?.correlationId === "string"
          ? (job.data as any).correlationId
          : job.id
      );

      return runWithObservabilityContext(
        { correlationId, requestId: job.id, route: `queue:${queueName}` },
        async () => {
          logger.info("job.started", {
            queue: queueName,
            jobId: job.id,
            jobName: job.name,
            attemptsMade: job.attemptsMade,
          });

          try {
            const result = await handler(job);
            const durationSeconds = Number(process.hrtime.bigint() - startedAt) / 1_000_000_000;
            queueJobsTotal.inc({ queue: queueName, job_name: job.name, status: "completed" });
            queueJobDurationSeconds.observe({ queue: queueName, job_name: job.name }, durationSeconds);
            logger.info("job.completed", {
              queue: queueName,
              jobId: job.id,
              jobName: job.name,
              durationMs: Math.round(durationSeconds * 1000),
            });

            return result;
          } catch (error) {
            const durationSeconds = Number(process.hrtime.bigint() - startedAt) / 1_000_000_000;
            queueJobsTotal.inc({ queue: queueName, job_name: job.name, status: "failed" });
            queueJobDurationSeconds.observe({ queue: queueName, job_name: job.name }, durationSeconds);
            errorsTotal.inc({ source: "queue", code: job.name });
            throw error;
          }
        }
      );
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
    errorsTotal.inc({ source: "queue_worker", code: queueName });
    logger.error("worker.error", { queue: queueName, error: error.message });
  });

  worker.on("drained", async () => {
    queueWaitingJobs.set({ queue: queueName }, 0);
  });

  return worker;
}
