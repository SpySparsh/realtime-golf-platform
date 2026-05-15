import { badRequest } from "@/utils/app-error";
import { assertNumberRange, assertString } from "@/validators/common";

export type CreateScoreInput = {
  score: number;
  played_on: string;
  notes?: string;
};

export type UpdateScoreInput = {
  score?: number;
  played_on?: string;
  notes?: string;
};

export function validateCreateScoreInput(body: any): CreateScoreInput {
  assertNumberRange(body?.score, 1, 45, "Score");
  assertString(body?.played_on, "played_on date");

  return {
    score: body.score,
    played_on: body.played_on,
    notes: body.notes || undefined,
  };
}

export function validateUpdateScoreInput(body: any): UpdateScoreInput {
  if (body?.score !== undefined) assertNumberRange(body.score, 1, 45, "Score");
  if (body?.played_on !== undefined && typeof body.played_on !== "string") {
    throw badRequest("played_on must be a string");
  }

  return {
    score: body?.score,
    played_on: body?.played_on,
    notes: body?.notes,
  };
}

