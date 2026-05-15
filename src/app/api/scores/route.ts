import type { NextRequest } from "next/server";
import { getAuthenticatedContext } from "@/middlewares/auth";
import { withApiHandler } from "@/middlewares/api-handler";
import { createScoresService } from "@/modules/scores.module";
import { created, ok } from "@/utils/api-response";
import { validateCreateScoreInput } from "@/validators/scores.validator";

/**
 * GET  /api/scores - Returns the authenticated user's scores.
 * POST /api/scores - Inserts a new score. DB trigger handles rolling-5 enforcement.
 */

export const GET = withApiHandler(async () => {
  const { supabase, user } = await getAuthenticatedContext();
  const scoresService = createScoresService(supabase);
  const scores = await scoresService.listUserScores(user.id);
  return ok(scores);
});

export const POST = withApiHandler(async (request: NextRequest) => {
  const { supabase, user } = await getAuthenticatedContext();
  const input = validateCreateScoreInput(await request.json());
  const scoresService = createScoresService(supabase);
  const score = await scoresService.createUserScore(user.id, input);
  return created(score);
});
