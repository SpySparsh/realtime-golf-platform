import request from "supertest";
import { createTestDatabase } from "../setup/test-database";
import { createRouteHandlerServer } from "../utils/route-handler";

const supabase = createTestDatabase();

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(async () => supabase),
}));

describe("auth API integration", () => {
  beforeEach(() => {
    supabase.auth.signInWithPassword.mockReset();
  });

  it("logs in through the route handler and returns a correlation id", async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: { id: "user-1", email: "golfer@example.com" } },
      error: null,
    });

    const { POST } = await import("@/app/api/auth/login/route");
    const server = createRouteHandlerServer(POST);

    const response = await request(server)
      .post("/api/auth/login")
      .set("x-correlation-id", "test-correlation")
      .send({ email: "golfer@example.com", password: "password123" })
      .expect(200);

    expect(response.headers["x-correlation-id"]).toBe("test-correlation");
    expect(response.body).toMatchObject({ success: true });
  });

  it("returns 400 for invalid login payloads", async () => {
    const { POST } = await import("@/app/api/auth/login/route");
    const server = createRouteHandlerServer(POST);

    const response = await request(server)
      .post("/api/auth/login")
      .send({ email: "not-an-email", password: "short" })
      .expect(400);

    expect(response.body.code).toBe("VALIDATION_ERROR");
  });
});
