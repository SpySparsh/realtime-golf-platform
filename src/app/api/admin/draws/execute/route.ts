import type { NextRequest } from "next/server";
import { env } from "@/infrastructure/config/env";
import { withApiHandler } from "@/middlewares/api-handler";
import { requirePermission } from "@/middlewares/auth";
import { createDrawEngineService } from "@/modules/draws.module";
import { logger } from "@/observability/logger";
import { enqueuePrizeDrawProcessing } from "@/queues/draw.queue";
import { ok } from "@/utils/api-response";
import { validateExecuteDrawInput } from "@/validators/draws.validator";

export const POST = withApiHandler(async (request: NextRequest) => {
  const { user } = await requirePermission("draw:execute");
  const { drawMonth } = validateExecuteDrawInput(await request.json());

  if (env.redisUrl) {
    try {
      const job = await enqueuePrizeDrawProcessing({ drawMonth, requestedBy: user.id });
      return ok({ success: true, queued: true, jobId: job.id });
    } catch (error) {
      logger.error("draw.execute.queue_failed", {
        drawMonth,
        requestedBy: user.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const drawEngineService = createDrawEngineService();
  const result = await drawEngineService.executeMonthlyDraw(drawMonth);
  return ok({ ...result, queued: false });
});
