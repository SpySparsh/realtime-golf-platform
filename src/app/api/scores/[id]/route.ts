import type { NextRequest } from "next/server";
import { getAuthenticatedContext } from "@/middlewares/auth";
import { withApiHandler } from "@/middlewares/api-handler";
import { createScoresService } from "@/modules/scores.module";
import { ok } from "@/utils/api-response";
import { validateUpdateScoreInput } from "@/validators/scores.validator";

export const PATCH = withApiHandler(async (
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) => {
  const { id } = await props.params;
  const { supabase, user } = await getAuthenticatedContext();
  const input = validateUpdateScoreInput(await request.json());
  const scoresService = createScoresService(supabase);
  const score = await scoresService.updateUserScore(id, user.id, input);
  return ok(score);
});

export const DELETE = withApiHandler(async (
  _request: NextRequest,
  props: { params: Promise<{ id: string }> }
) => {
  const { id } = await props.params;
  const { supabase, user } = await getAuthenticatedContext();
  const scoresService = createScoresService(supabase);
  const result = await scoresService.deleteUserScore(id, user.id);
  return ok(result);
});
