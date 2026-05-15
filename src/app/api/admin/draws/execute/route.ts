import type { NextRequest } from "next/server";
import { env } from "@/infrastructure/config/env";
import { withApiHandler } from "@/middlewares/api-handler";
import { requirePermission } from "@/middlewares/auth";
import { createDrawEngineService } from "@/modules/draws.module";
import { enqueuePrizeDrawProcessing } from "@/queues/draw.queue";
import { ok } from "@/utils/api-response";
import { validateExecuteDrawInput } from "@/validators/draws.validator";

export const POST = withApiHandler(async (request: NextRequest) => {
  const { user } = await requirePermission("draw:execute");
  const { drawMonth } = validateExecuteDrawInput(await request.json());

  if (env.redisUrl) {
    const job = await enqueuePrizeDrawProcessing({ drawMonth, requestedBy: user.id });
    return ok({ success: true, queued: true, jobId: job.id });
  }

  const drawEngineService = createDrawEngineService();
  const result = await drawEngineService.executeMonthlyDraw(drawMonth);
  return ok(result);
});
