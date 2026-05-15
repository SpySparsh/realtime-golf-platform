import { Queue, QueueEvents } from "bullmq";
import { getRedisConnection } from "@/infrastructure/redis/redis.client";
import { defaultJobOptions } from "@/queues/queue-options";
import type { QueueName } from "@/queues/queue-names";

const queues = new Map<string, Queue>();
const queueEvents = new Map<string, QueueEvents>();

export function getQueue<T = unknown>(name: QueueName) {
  if (!queues.has(name)) {
    queues.set(
      name,
      new Queue<T>(name, {
        connection: getRedisConnection(),
        defaultJobOptions,
      })
    );
  }

  return queues.get(name)! as Queue<T>;
}

export function getQueueEvents(name: QueueName) {
  if (!queueEvents.has(name)) {
    queueEvents.set(name, new QueueEvents(name, { connection: getRedisConnection() }));
  }

  return queueEvents.get(name)!;
}

