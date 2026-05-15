import type { NextRequest } from "next/server";
import { AppError } from "@/utils/app-error";
import {
  createCorrelationId,
  runWithObservabilityContext,
} from "@/observability/context";
import { logger } from "@/observability/logger";
import {
  errorsTotal,
  httpRequestDurationSeconds,
  httpRequestsTotal,
} from "@/observability/metrics";
import { errorResponse } from "@/utils/api-response";

type Handler<TArgs extends unknown[] = []> = (
  request: NextRequest,
  ...args: TArgs
) => Promise<Response>;

export function withApiHandler<TArgs extends unknown[]>(handler: Handler<TArgs>) {
  return async (request: NextRequest, ...args: TArgs) => {
    const startedAt = process.hrtime.bigint();
    const correlationId = createCorrelationId(
      request.headers.get("x-correlation-id") ?? request.headers.get("x-request-id")
    );
    const route = request.nextUrl.pathname;
    const method = request.method;

    return runWithObservabilityContext({ correlationId, route }, async () => {
      let statusCode = 500;

      try {
        logger.info("api.request.started", { method, route });
        const response = await handler(request, ...args);
        statusCode = response.status;
        response.headers.set("x-correlation-id", correlationId);
        return response;
      } catch (error) {
        statusCode = error instanceof AppError ? error.statusCode : 500;
        if (statusCode >= 500) {
          errorsTotal.inc({ source: "api", code: error instanceof AppError ? error.code : "INTERNAL_ERROR" });
        }

        const response = errorResponse(error, { correlationId });
        response.headers.set("x-correlation-id", correlationId);
        return response;
      } finally {
        const durationSeconds = Number(process.hrtime.bigint() - startedAt) / 1_000_000_000;
        httpRequestsTotal.inc({ method, route, status_code: String(statusCode) });
        httpRequestDurationSeconds.observe({ method, route, status_code: String(statusCode) }, durationSeconds);
        logger.info("api.request.completed", {
          method,
          route,
          statusCode,
          durationMs: Math.round(durationSeconds * 1000),
        });
      }
    });
  };
}
