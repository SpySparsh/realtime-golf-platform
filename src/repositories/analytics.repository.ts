export type AnalyticsDateRange = {
  from: string;
  to: string;
};

export class AnalyticsRepository {
  constructor(private readonly supabase: any) {}

  async fetchOverviewInputs(range: AnalyticsDateRange) {
    const [
      profiles,
      subscriptions,
      payments,
      scores,
      drawEntries,
      draws,
    ] = await Promise.all([
      this.supabase
        .from("profiles")
        .select("id, created_at")
        .lte("created_at", range.to),
      this.supabase
        .from("subscriptions")
        .select(
          "id, user_id, plan, status, amount_pence, created_at, current_period_start, current_period_end, cancelled_at, last_payment_failed_at, payment_retry_count"
        )
        .lte("created_at", range.to),
      this.supabase
        .from("payment_reconciliations")
        .select("id, status, amount, currency, provider, provider_event_id, user_id, subscription_id, reconciled_at")
        .gte("reconciled_at", range.from)
        .lte("reconciled_at", range.to),
      this.supabase
        .from("scores")
        .select("id, user_id, created_at, played_on")
        .gte("created_at", range.from)
        .lte("created_at", range.to),
      this.supabase
        .from("draw_entries")
        .select("id, draw_id, user_id, created_at")
        .gte("created_at", range.from)
        .lte("created_at", range.to),
      this.supabase
        .from("draws")
        .select("id, draw_month, status, created_at, published_at")
        .lte("created_at", range.to),
    ]);

    for (const result of [profiles, subscriptions, payments, scores, drawEntries, draws]) {
      if (result.error) throw result.error;
    }

    return {
      profiles: profiles.data ?? [],
      subscriptions: subscriptions.data ?? [],
      payments: payments.data ?? [],
      scores: scores.data ?? [],
      drawEntries: drawEntries.data ?? [],
      draws: draws.data ?? [],
    };
  }

  async fetchActivityPage(input: AnalyticsDateRange & { page: number; pageSize: number }) {
    const from = (input.page - 1) * input.pageSize;
    const to = from + input.pageSize - 1;

    const result = await this.supabase
      .from("payment_reconciliations")
      .select(
        "id, provider, provider_event_id, provider_payment_id, status, amount, currency, user_id, subscription_id, reconciled_at",
        { count: "exact" }
      )
      .gte("reconciled_at", input.from)
      .lte("reconciled_at", input.to)
      .order("reconciled_at", { ascending: false })
      .range(from, to);

    if (result.error) throw result.error;

    return {
      rows: result.data ?? [],
      total: result.count ?? 0,
    };
  }
}
