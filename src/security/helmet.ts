import helmet from "helmet";
import type { IncomingMessage, ServerResponse } from "http";

const helmetMiddleware = helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
});

export function applyHelmet(
  request: IncomingMessage,
  response: ServerResponse
) {
  return new Promise<void>((resolve, reject) => {
    helmetMiddleware(request as any, response as any, (error?: unknown) => {
      if (error) reject(error);
      else resolve();
    });
  });
}
