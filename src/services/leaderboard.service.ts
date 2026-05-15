export type LeaderboardScope = "global" | "monthly" | "user";

export class LeaderboardService {
  constructor(private readonly supabase: any) {}

  async getSnapshot(input: { scope: LeaderboardScope; month?: string; userId?: string }) {
    let query = this.supabase
      .from("scores")
      .select("user_id, score, played_on, created_at, profile:profiles(full_name, display_name)");

    if (input.scope === "monthly" && input.month) {
      const start = new Date(`${input.month}-01T00:00:00.000Z`);
      const end = new Date(start);
      end.setUTCMonth(end.getUTCMonth() + 1);
      query = query.gte("played_on", start.toISOString().slice(0, 10)).lt("played_on", end.toISOString().slice(0, 10));
    }

    if (input.scope === "user" && input.userId) {
      query = query.eq("user_id", input.userId);
    }

    const { data, error } = await query;
    if (error) throw error;

    const grouped = new Map<string, any>();
    for (const score of data ?? []) {
      const existing = grouped.get(score.user_id) ?? {
        userId: score.user_id,
        displayName: score.profile?.display_name ?? score.profile?.full_name ?? "Golfer",
        totalScore: 0,
        rounds: 0,
        bestScore: 0,
        latestPlayedOn: null as string | null,
      };

      existing.totalScore += Number(score.score);
      existing.rounds += 1;
      existing.bestScore = Math.max(existing.bestScore, Number(score.score));
      existing.latestPlayedOn =
        !existing.latestPlayedOn || score.played_on > existing.latestPlayedOn
          ? score.played_on
          : existing.latestPlayedOn;
      grouped.set(score.user_id, existing);
    }

    const entries = [...grouped.values()]
      .map((entry) => ({
        ...entry,
        averageScore: Math.round((entry.totalScore / entry.rounds) * 100) / 100,
      }))
      .sort((a, b) => b.averageScore - a.averageScore || b.bestScore - a.bestScore)
      .map((entry, index) => ({ rank: index + 1, ...entry }));

    return {
      scope: input.scope,
      month: input.month ?? null,
      userId: input.userId ?? null,
      entries,
      generatedAt: new Date().toISOString(),
    };
  }
}
