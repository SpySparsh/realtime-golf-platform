import type { Server, Socket } from "socket.io";
import { getRedisConnection } from "@/infrastructure/redis/redis.client";
import { logger } from "@/observability/logger";
import type { SocketUser } from "@/websocket/events";
import { socketRooms } from "@/websocket/rooms";

const CONNECTION_TTL_SECONDS = 90;

export class SocketConnectionRegistry {
  constructor(private readonly io: Server) {}

  async register(socket: Socket, user: SocketUser) {
    socket.data.user = user;
    socket.data.joinedRooms = new Set<string>();
    socket.data.lastPongAt = Date.now();

    await socket.join(socketRooms.user(user.id));
    await this.trackRoom(socket, socketRooms.user(user.id));
    if (user.isAdmin) {
      await socket.join(socketRooms.admin());
      await this.trackRoom(socket, socketRooms.admin());
    }

    await this.persistConnection(socket, user);
    logger.info("socket.connected", {
      socketId: socket.id,
      userId: user.id,
      transport: socket.conn.transport.name,
    });
  }

  async join(socket: Socket, room: string) {
    await socket.join(room);
    await this.trackRoom(socket, room);
    await this.persistConnection(socket, socket.data.user);
  }

  async leave(socket: Socket, room: string) {
    await socket.leave(room);
    socket.data.joinedRooms?.delete(room);
    await getRedisConnection().srem(this.roomsKey(socket.id), room);
  }

  async touch(socket: Socket) {
    socket.data.lastPongAt = Date.now();
    await getRedisConnection().expire(this.connectionKey(socket.id), CONNECTION_TTL_SECONDS);
  }

  async cleanup(socket: Socket, reason: string) {
    const redis = getRedisConnection();
    await redis.del(this.connectionKey(socket.id));
    await redis.del(this.roomsKey(socket.id));
    logger.info("socket.disconnected", {
      socketId: socket.id,
      userId: socket.data.user?.id,
      reason,
    });
  }

  startHeartbeat() {
    const interval = setInterval(() => {
      for (const socket of this.io.sockets.sockets.values()) {
        const lastPongAt = Number(socket.data.lastPongAt ?? 0);
        if (Date.now() - lastPongAt > 60_000) {
          socket.disconnect(true);
          continue;
        }

        socket.emit("heartbeat:ping", { ts: Date.now() });
      }
    }, 30_000);

    return () => clearInterval(interval);
  }

  private async trackRoom(socket: Socket, room: string) {
    socket.data.joinedRooms?.add(room);
    await getRedisConnection().sadd(this.roomsKey(socket.id), room);
  }

  private async persistConnection(socket: Socket, user: SocketUser) {
    await getRedisConnection().set(
      this.connectionKey(socket.id),
      JSON.stringify({
        socketId: socket.id,
        userId: user.id,
        isAdmin: user.isAdmin,
        rooms: [...(socket.data.joinedRooms ?? [])],
        connectedAt: socket.handshake.time,
        lastSeenAt: new Date().toISOString(),
      }),
      "EX",
      CONNECTION_TTL_SECONDS
    );
  }

  private connectionKey(socketId: string) {
    return `socket:connection:${socketId}`;
  }

  private roomsKey(socketId: string) {
    return `socket:rooms:${socketId}`;
  }
}
