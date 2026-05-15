import { QUEUE_NAMES } from "@/queues/queue-names";
import { getQueue } from "@/queues/queue-factory";
import type { DeadLetterJobData } from "@/queues/job-types";

export async function enqueueDeadLetter(data: DeadLetterJobData) {
  const queue = getQueue<DeadLetterJobData>(QUEUE_NAMES.deadLetter);
  await queue.add("dead-letter", data, {
    attempts: 1,
    removeOnComplete: false,
    removeOnFail: false,
  });
}

