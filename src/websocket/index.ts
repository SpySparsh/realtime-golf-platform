import { env } from "@/infrastructure/config/env";
import { logger } from "@/observability/logger";
import { createSocketServer } from "@/websocket/server";

async function main() {
  const runtime = await createSocketServer();

  runtime.httpServer.listen(env.websocketPort, () => {
    logger.info("socket.server.started", {
      port: env.websocketPort,
      corsOrigin: env.websocketCorsOrigin,
    });
  });

  async function shutdown() {
    logger.info("socket.server.shutdown");
    await runtime.close();
    process.exit(0);
  }

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((error) => {
  logger.error("socket.server.failed", {
    error: error instanceof Error ? error.message : "Unknown websocket startup error",
  });
  process.exit(1);
});
