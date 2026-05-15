import { createServer, type Server as HttpServer } from "http";
import { createAdapter } from "@socket.io/redis-adapter";
import IORedis from "ioredis";
import { Server, type Socket } from "socket.io";
import { env, requireEnv } from "@/infrastructure/config/env";
import { logger } from "@/observability/logger";
import {
  errorsTotal,
  metricsContentType,
  renderMetrics,
  websocketEventsTotal,
} from "@/observability/metrics";
import { applyHelmet } from "@/security/helmet";
import { securityHeaders } from "@/security/headers";
import { authenticateSocket } from "@/websocket/auth";
import { SocketConnectionRegistry } from "@/websocket/connection-registry";
import {
  SOCKET_REDIS_CHANNEL,
  type JoinRoomPayload,
  type SocketBroadcastEvent,
  type TournamentRoomPayload,
} from "@/websocket/events";
import { canJoinManagedRoom, socketRooms } from "@/websocket/rooms";

export type SocketServerRuntime = {
  httpServer: HttpServer;
  io: Server;
  close: () => Promise<void>;
};

export async function createSocketServer(): Promise<SocketServerRuntime> {
  const httpServer = createServer(async (request, response) => {
    if (request.url?.startsWith("/socket.io/")) return;
    await applyHelmet(request, response);
    for (const [name, value] of Object.entries(securityHeaders)) {
      response.setHeader(name, value);
    }

    if (request.url === "/health") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }));
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
  const io = new Server(httpServer, {
    cors: {
      origin: env.websocketCorsOrigin,
      credentials: true,
    },
    pingInterval: env.websocketPingIntervalMs,
    pingTimeout: env.websocketPingTimeoutMs,
    transports: ["websocket", "polling"],
  });

  const pubClient = new IORedis(requireEnv("redisUrl"), {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
  const subClient = pubClient.duplicate();
  const broadcastSubClient = pubClient.duplicate();

  io.adapter(createAdapter(pubClient, subClient));

  const registry = new SocketConnectionRegistry(io);
  const stopHeartbeat = registry.startHeartbeat();

  io.use(async (socket, next) => {
    try {
      socket.data.user = await authenticateSocket(socket);
      next();
    } catch (error) {
      errorsTotal.inc({ source: "websocket", code: "AUTH_FAILED" });
      websocketEventsTotal.inc({ event: "connection", direction: "inbound", status: "auth_failed" });
      next(error instanceof Error ? error : new Error("Socket authentication failed"));
    }
  });

  io.on("connection", async (socket) => {
    await registry.register(socket, socket.data.user);
    bindSocketHandlers(socket, registry);
  });

  await broadcastSubClient.subscribe(SOCKET_REDIS_CHANNEL);
  broadcastSubClient.on("message", (_channel, message) => {
    const event = parseBroadcast(message);
    if (!event) return;
    broadcast(io, event);
  });

  return {
    httpServer,
    io,
    async close() {
      stopHeartbeat();
      await io.close();
      await Promise.all([
        pubClient.quit(),
        subClient.quit(),
        broadcastSubClient.quit(),
      ]);
      httpServer.close();
    },
  };
}

function bindSocketHandlers(socket: Socket, registry: SocketConnectionRegistry) {
  socket.on("room:join", async (payload: JoinRoomPayload, ack?: (response: unknown) => void) => {
    try {
      const room = payload?.room;
      if (!room || !canJoinManagedRoom(room, socket.data.user)) {
        throw new Error("Room access denied");
      }

      await registry.join(socket, room);
      ack?.({ ok: true, room });
    } catch (error) {
      ack?.({ ok: false, error: error instanceof Error ? error.message : "Unable to join room" });
    }
  });

  socket.on("room:leave", async (payload: JoinRoomPayload, ack?: (response: unknown) => void) => {
    const room = payload?.room;
    if (room) await registry.leave(socket, room);
    ack?.({ ok: true, room });
  });

  socket.on(
    "tournament:join",
    async (payload: TournamentRoomPayload, ack?: (response: unknown) => void) => {
      try {
        const room = socketRooms.tournament(payload?.tournamentId ?? "");
        await registry.join(socket, room);
        ack?.({ ok: true, room });
      } catch (error) {
        ack?.({ ok: false, error: error instanceof Error ? error.message : "Unable to join tournament" });
      }
    }
  );

  socket.on(
    "leaderboard:subscribe",
    async (payload: { month?: string } | undefined, ack?: (response: unknown) => void) => {
      const room = payload?.month
        ? socketRooms.leaderboardMonth(payload.month)
        : socketRooms.leaderboardGlobal();
      await registry.join(socket, room);
      ack?.({ ok: true, room });
    }
  );

  socket.on("heartbeat:pong", async () => {
    await registry.touch(socket);
  });

  socket.on("disconnect", async (reason) => {
    await registry.cleanup(socket, reason);
  });
}

function parseBroadcast(message: string): SocketBroadcastEvent | null {
    try {
      const parsed = JSON.parse(message) as SocketBroadcastEvent;
      if (!parsed.event || !parsed.payload) return null;
    return parsed;
  } catch (error) {
    logger.warn("socket.broadcast.invalid_payload", {
      error: error instanceof Error ? error.message : "Invalid JSON",
    });
    return null;
  }
}

function broadcast(io: Server, event: SocketBroadcastEvent) {
  const payload = {
    ...event.payload,
    emittedAt: event.emittedAt ?? new Date().toISOString(),
  };

  if (event.userId) {
    io.to(socketRooms.user(event.userId)).emit(event.event, payload);
    websocketEventsTotal.inc({ event: event.event, direction: "outbound", status: "ok" });
    return;
  }

  if (event.room) {
    io.to(event.room).emit(event.event, payload);
    websocketEventsTotal.inc({ event: event.event, direction: "outbound", status: "ok" });
    return;
  }

  io.emit(event.event, payload);
  websocketEventsTotal.inc({ event: event.event, direction: "outbound", status: "ok" });
}
