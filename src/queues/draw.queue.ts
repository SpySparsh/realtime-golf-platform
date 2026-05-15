import { QUEUE_NAMES } from "@/queues/queue-names";
import { getQueue } from "@/queues/queue-factory";
import type { PrizeDrawJobData } from "@/queues/job-types";

export async function enqueuePrizeDrawProcessing(data: PrizeDrawJobData) {
  const queue = getQueue<PrizeDrawJobData>(QUEUE_NAMES.draw);
  return queue.add("execute-prize-draw", data, {
    jobId: `draw:${data.drawMonth}`,
  });
}

