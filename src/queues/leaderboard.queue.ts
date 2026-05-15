import { QUEUE_NAMES } from "@/queues/queue-names";
import { getQueue } from "@/queues/queue-factory";
import type { LeaderboardJobData } from "@/queues/job-types";

export async function enqueueLeaderboardRecalculation(data: LeaderboardJobData) {
  const queue = getQueue<LeaderboardJobData>(QUEUE_NAMES.leaderboard);
  return queue.add("recalculate-leaderboard", data, {
    jobId: `leaderboard:${data.scope}:${data.month ?? data.userId ?? "current"}`,
  });
}

