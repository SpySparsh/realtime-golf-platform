import { QUEUE_NAMES } from "@/queues/queue-names";
import { getQueue } from "@/queues/queue-factory";
import type { EmailJobData } from "@/queues/job-types";

export async function enqueueEmailNotification(data: EmailJobData) {
  const queue = getQueue<EmailJobData>(QUEUE_NAMES.email);
  return queue.add("send-email", data, {
    jobId: data.metadata?.idempotencyKey ? String(data.metadata.idempotencyKey) : undefined,
  });
}

