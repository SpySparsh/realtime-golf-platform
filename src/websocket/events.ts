export const SOCKET_REDIS_CHANNEL = "socket-events";

export type SocketUser = {
  id: string;
  email?: string | null;
  isAdmin: boolean;
};

export type SocketBroadcastEvent = {
  event: string;
  room?: string;
  userId?: string;
  payload: Record<string, unknown>;
  emittedAt?: string;
};

export type JoinRoomPayload = {
  room: string;
};

export type TournamentRoomPayload = {
  tournamentId: string;
};
