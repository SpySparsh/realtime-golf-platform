import { io as createClient, type Socket as ClientSocket } from "socket.io-client";
import { createSocketServer, type SocketServerRuntime } from "@/websocket/server";
import { socketRooms } from "@/websocket/rooms";

jest.mock("@/websocket/auth", () => ({
  authenticateSocket: jest.fn(async () => ({
    id: "user-1",
    email: "golfer@example.com",
    isAdmin: false,
  })),
}));

function once<T>(socket: ClientSocket, event: string) {
  return new Promise<T>((resolve) => socket.once(event, resolve));
}

describe("websocket server", () => {
  let runtime: SocketServerRuntime;
  let port: number;

  beforeEach(async () => {
    runtime = await createSocketServer();
    await new Promise<void>((resolve) => {
      runtime.httpServer.listen(0, () => {
        const address = runtime.httpServer.address();
        port = typeof address === "object" && address ? address.port : 0;
        resolve();
      });
    });
  });

  afterEach(async () => {
    await runtime.close();
  });

  it("authenticates sockets and joins leaderboard rooms", async () => {
    const client = createClient(`http://localhost:${port}`, {
      auth: { token: "test-token" },
      transports: ["websocket"],
    });

    await once(client, "connect");

    const ack = await new Promise<any>((resolve) => {
      client.emit("leaderboard:subscribe", { month: "2026-05" }, resolve);
    });

    expect(ack).toEqual({ ok: true, room: socketRooms.leaderboardMonth("2026-05") });
    client.disconnect();
  });
});
