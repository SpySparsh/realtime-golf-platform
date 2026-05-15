import { QUEUE_NAMES } from "@/queues/queue-names";
import { getQueue } from "@/queues/queue-factory";
import type { AnalyticsJobData } from "@/queues/job-types";

export async function enqueueAnalyticsAggregation(data: AnalyticsJobData) {
  const queue = getQueue<AnalyticsJobData>(QUEUE_NAMES.analytics);
  return queue.add("aggregate-analytics", data, {
    jobId: `analytics:${data.period}:${data.date}`,
  });
}

