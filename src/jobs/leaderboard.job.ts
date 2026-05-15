import type { Job } from "bullmq";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/observability/logger";
import type { LeaderboardJobData } from "@/queues/job-types";
import { LeaderboardService } from "@/services/leaderboard.service";
import { publishLeaderboardUpdate } from "@/websocket/publisher";

export async function processLeaderboardJob(job: Job<LeaderboardJobData>) {
  logger.info("leaderboard.recalculation.started", {
    scope: job.data.scope,
    month: job.data.month,
    userId: job.data.userId,
  });

  const leaderboardService = new LeaderboardService(createAdminClient());
  const snapshot = await leaderboardService.getSnapshot(job.data);
  await publishLeaderboardUpdate(snapshot, job.data.scope === "monthly" ? job.data.month : undefined);

  if (job.data.userId) {
    await publishLeaderboardUpdate(
      { ...snapshot, userId: job.data.userId },
      job.data.scope === "monthly" ? job.data.month : undefined
    );
  }

  return { success: true, recalculated: true, entries: snapshot.entries.length };
}
