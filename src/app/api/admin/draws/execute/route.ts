import type { NextRequest } from "next/server";
import { withApiHandler } from "@/middlewares/api-handler";
import { createDrawEngineService } from "@/modules/draws.module";
import { ok } from "@/utils/api-response";
import { validateExecuteDrawInput } from "@/validators/draws.validator";

export const POST = withApiHandler(async (request: NextRequest) => {
  const { drawMonth } = validateExecuteDrawInput(await request.json());
  const drawEngineService = createDrawEngineService();
  const result = await drawEngineService.executeMonthlyDraw(drawMonth);
  return ok(result);
});
