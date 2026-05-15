import { AuthService } from "@/services/auth.service";
import { createTestDatabase } from "../setup/test-database";

describe("AuthService", () => {
  it("logs in a user and records audit events", async () => {
    const supabase = createTestDatabase();
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: { id: "user-1", email: "golfer@example.com" } },
      error: null,
    });

    const service = new AuthService(supabase, { record: jest.fn().mockResolvedValue(undefined) } as any);

    const result = await service.login(
      { email: "golfer@example.com", password: "password123", redirectTo: "/dashboard" },
      { ipAddress: "127.0.0.1", userAgent: "jest" }
    );

    expect(result).toMatchObject({ success: true, redirectTo: "/dashboard" });
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "golfer@example.com",
      password: "password123",
    });
  });

  it("maps provider login errors to INVALID_CREDENTIALS", async () => {
    const supabase = createTestDatabase();
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: {},
      error: { message: "bad credentials" },
    });

    const service = new AuthService(supabase, { record: jest.fn().mockResolvedValue(undefined) } as any);

    await expect(
      service.login(
        { email: "golfer@example.com", password: "password123" },
        { ipAddress: "127.0.0.1", userAgent: "jest" }
      )
    ).rejects.toMatchObject({ code: "INVALID_CREDENTIALS", statusCode: 401 });
  });
});
