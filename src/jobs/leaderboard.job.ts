import type { Job } from "bullmq";
import { logger } from "@/observability/logger";
import type { LeaderboardJobData } from "@/queues/job-types";

export async function processLeaderboardJob(job: Job<LeaderboardJobData>) {
  logger.info("leaderboard.recalculation.placeholder", {
    scope: job.data.scope,
    month: job.data.month,
    userId: job.data.userId,
  });

  return { success: true, recalculated: false };
}

