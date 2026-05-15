import { AnalyticsService } from "@/services/analytics.service";

describe("AnalyticsService", () => {
  it("builds chart-ready revenue, churn, participation, activity, growth, and retention metrics", async () => {
    const repository = {
      fetchOverviewInputs: jest.fn().mockResolvedValue({
        profiles: [
          { id: "user-1", created_at: "2026-01-10T00:00:00.000Z" },
          { id: "user-2", created_at: "2026-02-10T00:00:00.000Z" },
        ],
        subscriptions: [
          {
            id: "sub-1",
            user_id: "user-1",
            plan: "monthly",
            status: "active",
            amount_pence: 1000,
            created_at: "2026-01-10T00:00:00.000Z",
            current_period_start: null,
            current_period_end: null,
            cancelled_at: null,
            last_payment_failed_at: null,
            payment_retry_count: 0,
          },
          {
            id: "sub-2",
            user_id: "user-2",
            plan: "yearly",
            status: "cancelled",
            amount_pence: 12000,
            created_at: "2026-01-15T00:00:00.000Z",
            current_period_start: null,
            current_period_end: null,
            cancelled_at: "2026-02-20T00:00:00.000Z",
            last_payment_failed_at: "2026-02-18T00:00:00.000Z",
            payment_retry_count: 1,
          },
        ],
        payments: [
          {
            id: "pay-1",
            status: "failed",
            amount: 1000,
            currency: "gbp",
            provider: "razorpay",
            provider_event_id: "evt-1",
            provider_payment_id: "pay_1",
            user_id: "user-2",
            subscription_id: "sub-2",
            reconciled_at: "2026-02-18T00:00:00.000Z",
          },
        ],
        scores: [
          { id: "score-1", user_id: "user-1", created_at: "2026-01-12T00:00:00.000Z", played_on: "2026-01-11" },
          { id: "score-2", user_id: "user-1", created_at: "2026-02-12T00:00:00.000Z", played_on: "2026-02-11" },
        ],
        drawEntries: [
          { id: "entry-1", draw_id: "draw-1", user_id: "user-1", created_at: "2026-02-15T00:00:00.000Z" },
        ],
        draws: [
          { id: "draw-1", draw_month: "2026-02-01", status: "published", created_at: "2026-02-01T00:00:00.000Z", published_at: "2026-02-15T00:00:00.000Z" },
        ],
      }),
      fetchActivityPage: jest.fn(),
    };

    const service = new AnalyticsService(repository as any);
    const dashboard = await service.getDashboard({
      from: "2026-01-01",
      to: "2026-02-28",
      refresh: true,
    });

    expect(dashboard.summary.monthlyRecurringRevenuePence).toBe(1000);
    expect(dashboard.summary.activeSubscriptions).toBe(1);
    expect(dashboard.summary.churnRate).toBe(0.5);
    expect(dashboard.summary.paymentFailures).toBe(1);
    expect(dashboard.summary.tournamentParticipants).toBe(1);
    expect(dashboard.summary.leaderboardActiveUsers).toBe(1);
    expect(dashboard.summary.retentionRate).toBe(1);
    expect(dashboard.charts.mrr).toEqual([
      { month: "2026-01", value: 2000 },
      { month: "2026-02", value: 1000 },
    ]);
    expect(dashboard.charts.paymentFailures).toEqual([
      { month: "2026-01", count: 0 },
      { month: "2026-02", count: 1 },
    ]);
  });
});
