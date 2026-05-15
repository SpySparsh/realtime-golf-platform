import { getCached } from "@/lib/cache/ttl-cache";
import {
  AnalyticsRepository,
  type AnalyticsDateRange,
  type AnalyticsOverviewInputs,
  type AnalyticsSubscriptionRow,
} from "@/repositories/analytics.repository";

const CACHE_TTL_MS = 60_000;

const REVENUE_STATUSES = new Set(["active", "grace_period", "past_due"]);
const CHURN_STATUSES = new Set(["cancelled", "expired"]);

export type AnalyticsFilters = {
  from?: string | null;
  to?: string | null;
  refresh?: boolean;
};

export type AnalyticsPaginationInput = AnalyticsFilters & {
  page?: number;
  pageSize?: number;
};

export type ChartValuePoint = {
  month: string;
  value: number;
};

export type ChartCountPoint = {
  month: string;
  count: number;
};

export type LeaderboardActivityPoint = ChartCountPoint & {
  activeUsers: number;
};

export type UserGrowthPoint = ChartCountPoint & {
  newUsers: number;
};

export type AnalyticsDashboard = {
  range: AnalyticsDateRange;
  summary: {
    monthlyRecurringRevenuePence: number;
    activeSubscriptions: number;
    churnRate: number;
    paymentFailures: number;
    tournamentParticipants: number;
    leaderboardActiveUsers: number;
    totalUsers: number;
    retentionRate: number;
  };
  charts: {
    mrr: ChartValuePoint[];
    activeSubscriptions: ChartCountPoint[];
    churn: ChartValuePoint[];
    paymentFailures: ChartCountPoint[];
    tournamentParticipation: ChartCountPoint[];
    leaderboardActivity: LeaderboardActivityPoint[];
    userGrowth: UserGrowthPoint[];
    retention: ChartValuePoint[];
  };
  tables: {
    subscriptionStatus: Record<string, number>;
    paymentStatus: Record<string, number>;
    drawStatus: Record<string, number>;
  };
  meta: {
    cacheTtlMs: number;
    chartInterval: "month";
    currency: "gbp";
    generatedAt: string;
    source: "live_aggregate";
  };
  generatedAt: string;
};

export type AnalyticsActivityPage = {
  range: AnalyticsDateRange;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  rows: Array<{
    id: string;
    provider: string;
    eventId: string;
    paymentId: string | null;
    status: string;
    amount: number;
    currency: string;
    userId: string | null;
    subscriptionId: string | null;
    occurredAt: string;
  }>;
};

export class AnalyticsService {
  constructor(private readonly repository: AnalyticsRepository) {}

  async getDashboard(filters: AnalyticsFilters = {}): Promise<AnalyticsDashboard> {
    const range = normalizeRange(filters);
    return getCached(
      `analytics:dashboard:${range.from}:${range.to}`,
      CACHE_TTL_MS,
      async () => {
        const data = await this.repository.fetchOverviewInputs(range);
        return buildDashboard(range, data);
      },
      { refresh: filters.refresh }
    );
  }

  async getActivityPage(input: AnalyticsPaginationInput): Promise<AnalyticsActivityPage> {
    const range = normalizeRange(input);
    const page = clampInteger(input.page, 1, 10_000, 1);
    const pageSize = clampInteger(input.pageSize, 1, 100, 25);
    const cacheKey = `analytics:activity:${range.from}:${range.to}:${page}:${pageSize}`;

    return getCached(
      cacheKey,
      CACHE_TTL_MS,
      async () => {
        const { rows, total } = await this.repository.fetchActivityPage({
          ...range,
          page,
          pageSize,
        });

        return {
          range,
          pagination: {
            page,
            pageSize,
            total,
            totalPages: Math.max(Math.ceil(total / pageSize), 1),
          },
          rows: rows.map((row) => ({
            id: row.id,
            provider: row.provider,
            eventId: row.provider_event_id,
            paymentId: row.provider_payment_id ?? null,
            status: row.status,
            amount: row.amount ?? 0,
            currency: row.currency ?? "gbp",
            userId: row.user_id,
            subscriptionId: row.subscription_id,
            occurredAt: row.reconciled_at,
          })),
        };
      },
      { refresh: input.refresh }
    );
  }

  async warmDashboardCache(filters: AnalyticsFilters = {}) {
    return this.getDashboard({ ...filters, refresh: true });
  }
}

function buildDashboard(range: AnalyticsDateRange, data: AnalyticsOverviewInputs): AnalyticsDashboard {
  const months = enumerateMonths(range.from, range.to);
  const monthIndex = new Map(months.map((month, index) => [month, index]));
  const activeUsersByMonth = new Map<string, Set<string>>();

  const userGrowthNew = zeroCountPoints(months);
  const paymentFailures = zeroCountPoints(months);
  const tournamentParticipationUsers = new Map<string, Set<string>>();
  const leaderboardScoreCounts = zeroCountPoints(months);
  const leaderboardUsers = new Map<string, Set<string>>();
  const churnCounts = zeroCountPoints(months);

  for (const profile of data.profiles) {
    incrementMonth(userGrowthNew, monthIndex, profile.created_at);
  }

  for (const payment of data.payments) {
    if (payment.status === "failed") incrementMonth(paymentFailures, monthIndex, payment.reconciled_at);
  }

  for (const score of data.scores) {
    const month = monthKey(score.created_at);
    incrementMonth(leaderboardScoreCounts, monthIndex, score.created_at);
    addSetValue(leaderboardUsers, month, score.user_id);
    addSetValue(activeUsersByMonth, month, score.user_id);
  }

  for (const entry of data.drawEntries) {
    const month = monthKey(entry.created_at);
    addSetValue(tournamentParticipationUsers, month, entry.user_id);
    addSetValue(activeUsersByMonth, month, entry.user_id);
  }

  for (const subscription of data.subscriptions) {
    if (subscription.cancelled_at) incrementMonth(churnCounts, monthIndex, subscription.cancelled_at);
  }

  const mrr = months.map((month) => ({
    month,
    value: data.subscriptions
      .filter((subscription) => isRevenueActiveInMonth(subscription, month))
      .reduce((sum, subscription) => sum + monthlyEquivalentPence(subscription), 0),
  }));

  const activeSubscriptions = months.map((month) => ({
    month,
    count: data.subscriptions.filter((subscription) => isRevenueActiveInMonth(subscription, month)).length,
  }));

  const churn = months.map((month, index) => {
    const startBase = Math.max(activeSubscriptions[Math.max(index - 1, 0)]?.count ?? 0, 1);
    return {
      month,
      value: (churnCounts[index]?.count ?? 0) / startBase,
    };
  });

  const leaderboardActivity = months.map((month, index) => ({
    month,
    count: leaderboardScoreCounts[index]?.count ?? 0,
    activeUsers: leaderboardUsers.get(month)?.size ?? 0,
  }));

  const tournamentParticipation = months.map((month) => ({
    month,
    count: tournamentParticipationUsers.get(month)?.size ?? 0,
  }));

  const userGrowth = runningTotal(userGrowthNew);
  const retention = months.map((month, index) => ({
    month,
    value: retentionForMonth(months, activeUsersByMonth, index),
  }));

  const activeNow = data.subscriptions.filter(isCurrentActiveSubscription);
  const cancelledInRange = data.subscriptions.filter(
    (subscription) => subscription.cancelled_at && isWithinRange(subscription.cancelled_at, range)
  );
  const mrrPence = activeNow.reduce((sum, subscription) => sum + monthlyEquivalentPence(subscription), 0);
  const churnRate =
    activeNow.length + cancelledInRange.length === 0
      ? 0
      : cancelledInRange.length / (activeNow.length + cancelledInRange.length);

  const generatedAt = new Date().toISOString();
  return {
    range,
    summary: {
      monthlyRecurringRevenuePence: mrrPence,
      activeSubscriptions: activeNow.length,
      churnRate,
      paymentFailures: data.payments.filter((payment) => payment.status === "failed").length,
      tournamentParticipants: uniqueCount(data.drawEntries.map((entry) => entry.user_id)),
      leaderboardActiveUsers: uniqueCount(data.scores.map((score) => score.user_id)),
      totalUsers: data.profiles.length,
      retentionRate: retention.at(-1)?.value ?? 0,
    },
    charts: {
      mrr,
      activeSubscriptions,
      churn,
      paymentFailures,
      tournamentParticipation,
      leaderboardActivity,
      userGrowth,
      retention,
    },
    tables: {
      subscriptionStatus: countBy(data.subscriptions, "status"),
      paymentStatus: countBy(data.payments, "status"),
      drawStatus: countBy(data.draws, "status"),
    },
    meta: {
      cacheTtlMs: CACHE_TTL_MS,
      chartInterval: "month",
      currency: "gbp",
      generatedAt,
      source: "live_aggregate",
    },
    generatedAt,
  };
}

export function normalizeRange(filters: AnalyticsFilters): AnalyticsDateRange {
  const now = new Date();
  const defaultFrom = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));
  const from = parseDate(filters.from) ?? defaultFrom;
  const to = parseDate(filters.to) ?? now;
  from.setUTCHours(0, 0, 0, 0);
  to.setUTCHours(23, 59, 59, 999);

  return {
    from: from <= to ? from.toISOString() : to.toISOString(),
    to: from <= to ? to.toISOString() : from.toISOString(),
  };
}

export function rangeForAnalyticsJob(period: "daily" | "monthly", date: string): AnalyticsDateRange {
  const parsed = parseDate(date) ?? new Date();
  const from =
    period === "monthly"
      ? new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), 1))
      : new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
  const to = new Date(from);

  if (period === "monthly") to.setUTCMonth(to.getUTCMonth() + 1);
  else to.setUTCDate(to.getUTCDate() + 1);

  to.setUTCMilliseconds(to.getUTCMilliseconds() - 1);
  return { from: from.toISOString(), to: to.toISOString() };
}

function parseDate(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function enumerateMonths(from: string, to: string) {
  const start = new Date(from);
  const end = new Date(to);
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  const months: string[] = [];

  while (cursor <= end) {
    months.push(monthKey(cursor.toISOString()));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return months;
}

function monthKey(value?: string | null) {
  if (!value) return "";
  return value.slice(0, 7);
}

function monthlyEquivalentPence(subscription: AnalyticsSubscriptionRow) {
  const amount = Number(subscription.amount_pence ?? 0);
  return subscription.plan === "yearly" ? Math.round(amount / 12) : amount;
}

function isCurrentActiveSubscription(subscription: AnalyticsSubscriptionRow) {
  return REVENUE_STATUSES.has(subscription.status);
}

function isRevenueActiveInMonth(subscription: AnalyticsSubscriptionRow, month: string) {
  if (monthKey(subscription.created_at) > month) return false;
  if (subscription.cancelled_at && monthKey(subscription.cancelled_at) <= month) return false;
  if (CHURN_STATUSES.has(subscription.status) && !subscription.cancelled_at) return false;
  return true;
}

function isWithinRange(value: string, range: AnalyticsDateRange) {
  return value >= range.from && value <= range.to;
}

function uniqueCount(values: string[]) {
  return new Set(values.filter(Boolean)).size;
}

function countBy<T extends Record<string, unknown>>(rows: T[], key: keyof T) {
  return rows.reduce((acc: Record<string, number>, row) => {
    const value = String(row[key] ?? "unknown");
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
}

function addSetValue(map: Map<string, Set<string>>, key: string, value: string) {
  if (!key || !value) return;
  if (!map.has(key)) map.set(key, new Set());
  map.get(key)!.add(value);
}

function zeroCountPoints(months: string[]): ChartCountPoint[] {
  return months.map((month) => ({ month, count: 0 }));
}

function incrementMonth(points: ChartCountPoint[], monthIndex: Map<string, number>, date: string | null) {
  const index = monthIndex.get(monthKey(date));
  if (index === undefined) return;
  points[index].count += 1;
}

function runningTotal(points: ChartCountPoint[]): UserGrowthPoint[] {
  let total = 0;
  return points.map((point) => {
    total += point.count;
    return { month: point.month, count: total, newUsers: point.count };
  });
}

function retentionForMonth(months: string[], activeUsersByMonth: Map<string, Set<string>>, index: number) {
  if (index <= 0) return 0;
  const previous = activeUsersByMonth.get(months[index - 1]) ?? new Set<string>();
  const current = activeUsersByMonth.get(months[index]) ?? new Set<string>();
  if (previous.size === 0) return 0;

  let retained = 0;
  for (const userId of previous) {
    if (current.has(userId)) retained += 1;
  }

  return retained / previous.size;
}

function clampInteger(value: unknown, min: number, max: number, fallback: number) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}
