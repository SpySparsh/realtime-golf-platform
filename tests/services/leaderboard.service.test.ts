import { LeaderboardService } from "@/services/leaderboard.service";
import { createTestDatabase } from "../setup/test-database";

describe("LeaderboardService", () => {
  it("builds ranked snapshots from score rows", async () => {
    const supabase = createTestDatabase({
      "scores.select": {
        data: [
          {
            user_id: "user-1",
            score: 30,
            played_on: "2026-05-01",
            profile: { display_name: "A Golfer" },
          },
          {
            user_id: "user-1",
            score: 34,
            played_on: "2026-05-02",
            profile: { display_name: "A Golfer" },
          },
          {
            user_id: "user-2",
            score: 40,
            played_on: "2026-05-03",
            profile: { display_name: "B Golfer" },
          },
        ],
        error: null,
      },
    });

    const service = new LeaderboardService(supabase);
    const snapshot = await service.getSnapshot({ scope: "global" });

    expect(snapshot.entries).toEqual([
      expect.objectContaining({ rank: 1, userId: "user-2", averageScore: 40 }),
      expect.objectContaining({ rank: 2, userId: "user-1", averageScore: 32 }),
    ]);
  });
});
