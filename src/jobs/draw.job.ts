import type { Job } from "bullmq";
import { createDrawEngineService } from "@/modules/draws.module";
import type { PrizeDrawJobData } from "@/queues/job-types";

export async function processPrizeDrawJob(job: Job<PrizeDrawJobData>) {
  const drawEngineService = createDrawEngineService();
  return drawEngineService.executeMonthlyDraw(job.data.drawMonth);
}

