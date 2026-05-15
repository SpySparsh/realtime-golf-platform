import { createServer, type Server } from "http";
import { logger } from "@/observability/logger";
import { metricsContentType, renderMetrics } from "@/observability/metrics";

export function startObservabilityHttpServer(port: number, name: string) {
  const server = createServer(async (request, response) => {
    if (request.url === "/health") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ status: "ok", name, timestamp: new Date().toISOString() }));
      return;
    }

    if (request.url === "/metrics") {
      response.writeHead(200, { "content-type": metricsContentType() });
      response.end(await renderMetrics());
      return;
    }

    response.writeHead(404, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "Not found" }));
  });

  server.listen(port, () => {
    logger.info("observability.http.started", { name, port });
  });

  return closeServer(server);
}

function closeServer(server: Server) {
  return () =>
    new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
}
