import { NextRequest } from "next/server";
import { AppError, badRequest } from "@/utils/app-error";
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
import { assertCsrf } from "@/security/csrf";
import { validateEnvironmentSecrets } from "@/security/env-validation";
import { applySecurityHeaders } from "@/security/headers";
import { isJsonContentType, sanitizeJsonValue } from "@/security/sanitize";
import { errorResponse } from "@/utils/api-response";
import { enforceRateLimit } from "@/utils/rate-limit";
import { getClientIp } from "@/utils/security";

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
        validateEnvironmentSecrets();
        enforceRateLimit(`api:${getClientIp(request)}:${route}`, { limit: 300, windowMs: 5 * 60 * 1000 });
        assertCsrf(request);

        logger.info("api.request.started", { method, route });
        const handledRequest = await sanitizeRequest(request);
        const response = await handler(handledRequest, ...args);
        statusCode = response.status;
        response.headers.set("x-correlation-id", correlationId);
        return applySecurityHeaders(response);
      } catch (error) {
        statusCode = error instanceof AppError ? error.statusCode : 500;
        if (statusCode >= 500) {
          errorsTotal.inc({ source: "api", code: error instanceof AppError ? error.code : "INTERNAL_ERROR" });
        }

        const response = errorResponse(error, { correlationId });
        response.headers.set("x-correlation-id", correlationId);
        return applySecurityHeaders(response);
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

async function sanitizeRequest(request: NextRequest) {
  if (isRawBodySensitiveRoute(request.nextUrl.pathname)) return request;
  if (!["POST", "PUT", "PATCH"].includes(request.method)) return request;
  if (!isJsonContentType(request.headers.get("content-type"))) return request;

  const rawBody = await request.text();
  if (!rawBody) return request;

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    throw badRequest("Invalid JSON request body");
  }
  const sanitized = sanitizeJsonValue(parsed);
  return new NextRequest(request.url, {
    method: request.method,
    headers: request.headers,
    body: JSON.stringify(sanitized),
  });
}

function isRawBodySensitiveRoute(pathname: string) {
  return pathname.startsWith("/api/stripe/webhook") || pathname.startsWith("/api/razorpay/webhook");
}
