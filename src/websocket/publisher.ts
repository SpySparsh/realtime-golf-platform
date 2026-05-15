import { getRedisConnection } from "@/infrastructure/redis/redis.client";
import { logger } from "@/observability/logger";
import { SOCKET_REDIS_CHANNEL, type SocketBroadcastEvent } from "@/websocket/events";
import { socketRooms } from "@/websocket/rooms";

export async function publishSocketEvent(event: SocketBroadcastEvent) {
  const payload: SocketBroadcastEvent = {
    ...event,
    emittedAt: event.emittedAt ?? new Date().toISOString(),
  };

  await getRedisConnection().publish(SOCKET_REDIS_CHANNEL, JSON.stringify(payload));
  logger.info("socket.event.published", {
    event: payload.event,
    room: payload.room,
    userId: payload.userId,
  });
}

export async function publishLeaderboardUpdate(payload: Record<string, unknown>, month?: string) {
  await publishSocketEvent({
    event: "leaderboard.updated",
    room: month ? socketRooms.leaderboardMonth(month) : socketRooms.leaderboardGlobal(),
    payload,
  });
}

export async function publishTournamentEvent(
  tournamentId: string,
  event: string,
  payload: Record<string, unknown>
) {
  await publishSocketEvent({
    event,
    room: socketRooms.tournament(tournamentId),
    payload,
  });
}
