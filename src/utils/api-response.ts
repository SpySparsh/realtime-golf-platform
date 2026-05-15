import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "@/utils/app-error";
import { logger } from "@/observability/logger";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function created<T>(data: T) {
  return ok(data, { status: 201 });
}

export function errorResponse(error: unknown, init?: { correlationId?: string }) {
  if (error instanceof AppError) {
    logger.warn("api.error", {
      code: error.code,
      statusCode: error.statusCode,
      details: error.details,
    });
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        details: error.details,
        correlationId: init?.correlationId,
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof ZodError) {
    logger.warn("api.validation_error", {
      issues: error.issues.length,
    });
    return NextResponse.json(
      {
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: error.flatten(),
        correlationId: init?.correlationId,
      },
      { status: 400 }
    );
  }

  const message = error instanceof Error ? error.message : "Unexpected server error";
  logger.error("api.unhandled_error", {
    error: message,
    stack: error instanceof Error ? error.stack : undefined,
  });
  return NextResponse.json(
    { error: message, code: "INTERNAL_ERROR", correlationId: init?.correlationId },
    { status: 500 }
  );
}
