const ROOM_PREFIX = {
  leaderboard: "leaderboard",
  tournament: "tournament",
  user: "user",
  admin: "admin",
} as const;

function normalizeRoomId(value: string) {
  return value.replace(/[^a-zA-Z0-9:_-]/g, "").slice(0, 128);
}

export const socketRooms = {
  leaderboardGlobal() {
    return `${ROOM_PREFIX.leaderboard}:global`;
  },
  leaderboardMonth(month: string) {
    return `${ROOM_PREFIX.leaderboard}:month:${normalizeRoomId(month)}`;
  },
  tournament(tournamentId: string) {
    return `${ROOM_PREFIX.tournament}:${normalizeRoomId(tournamentId)}`;
  },
  user(userId: string) {
    return `${ROOM_PREFIX.user}:${normalizeRoomId(userId)}`;
  },
  admin() {
    return ROOM_PREFIX.admin;
  },
};

export function canJoinManagedRoom(room: string, user: { id: string; isAdmin: boolean }) {
  if (room === socketRooms.leaderboardGlobal()) return true;
  if (room.startsWith(`${ROOM_PREFIX.leaderboard}:month:`)) return true;
  if (room.startsWith(`${ROOM_PREFIX.tournament}:`)) return true;
  if (room === socketRooms.user(user.id)) return true;
  if (room === socketRooms.admin()) return user.isAdmin;
  return false;
}
