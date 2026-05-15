import { getCached } from "@/lib/cache/ttl-cache";
import {
  AnalyticsRepository,
  type AnalyticsDateRange,
} from "@/repositories/analytics.repository";

type MonthPoint = {
  month: string;
  value: number;
};

type CountPoint = {
  month: string;
  count: number;
};

const CACHE_TTL_MS = 60_000;

export type AnalyticsFilters = {
  from?: string | null;
  to?: string | null;
};

export class AnalyticsService {
  constructor(private readonly repository: AnalyticsRepository) {}

  async getDashboard(filters: AnalyticsFilters = {}) {
    const range = normalizeRange(filters);
    return getCached(`analytics:dashboard:${range.from}:${range.to}`, CACHE_TTL_MS, async () => {
      const data = await this.repository.fetchOverviewInputs(range);
      return buildDashboard(range, data);
    });
  }

  async getActivityPage(input: AnalyticsFilters & { page?: number; pageSize?: number }) {
    const range = normalizeRange(input);
    const page = clampInteger(input.page, 1, 10_000, 1);
    const pageSize = clampInteger(input.pageSize, 1, 100, 25);
    const cacheKey = `analytics:activity:${range.from}:${range.to}:${page}:${pageSize}`;

    return getCached(cacheKey, CACHE_TTL_MS, async () => {
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
        rows: rows.map((row: any) => ({
          id: row.id,
          provider: row.provider,
          eventId: row.provider_event_id,
          paymentId: row.provider_payment_id,
          status: row.status,
          amount: row.amount ?? 0,
          currency: row.currency ?? "gbp",
          userId: row.user_id,
          subscriptionId: row.subscription_id,
          occurredAt: row.reconciled_at,
        })),
      };
    });
  }
}

function buildDashboard(range: AnalyticsDateRange, data: any) {
  const months = enumerateMonths(range.from, range.to);
  const activeSubscriptions = data.subscriptions.filter((sub: any) => sub.status === "active");
  const cancelledInRange = data.subscriptions.filter((sub: any) =>
    isWithinRange(sub.cancelled_at, range)
  );
  const paymentFailures = data.payments.filter((payment: any) => payment.status === "failed");
  const activeUsersByMonth = new Map<string, Set<string>>();

  for (const score of data.scores) {
    addSetValue(activeUsersByMonth, monthKey(score.created_at), score.user_id);
  }
  for (const entry of data.drawEntries) {
    addSetValue(activeUsersByMonth, monthKey(entry.created_at), entry.user_id);
  }

  const mrrPence = activeSubscriptions.reduce(
    (sum: number, sub: any) => sum + monthlyEquivalentPence(sub),
    0
  );
  const churnRate = activeSubscriptions.length + cancelledInRange.length === 0
    ? 0
    : cancelledInRange.length / (activeSubscriptions.length + cancelledInRange.length);

  const userGrowth = runningTotal(
    months.map((month) => ({
      month,
      count: data.profiles.filter((profile: any) => monthKey(profile.created_at) === month).length,
    }))
  );

  return {
    range,
    summary: {
      monthlyRecurringRevenuePence: mrrPence,
      activeSubscriptions: activeSubscriptions.length,
      churnRate,
      paymentFailures: paymentFailures.length,
      tournamentParticipants: uniqueCount(data.drawEntries.map((entry: any) => entry.user_id)),
      leaderboardActiveUsers: uniqueCount(data.scores.map((score: any) => score.user_id)),
      totalUsers: data.profiles.length,
      retentionRate: calculateRetention(months, activeUsersByMonth),
    },
    charts: {
      mrr: months.map((month) => ({
        month,
        value: data.subscriptions
          .filter((sub: any) => sub.status === "active" && monthKey(sub.created_at) <= month)
          .reduce((sum: number, sub: any) => sum + monthlyEquivalentPence(sub), 0),
      })) satisfies MonthPoint[],
      activeSubscriptions: months.map((month) => ({
        month,
        count: data.subscriptions.filter(
          (sub: any) => monthKey(sub.created_at) <= month && !cancelledBeforeOrInMonth(sub, month)
        ).length,
      })) satisfies CountPoint[],
      churn: months.map((month) => {
        const cancelled = data.subscriptions.filter((sub: any) => monthKey(sub.cancelled_at) === month).length;
        const base = Math.max(
          data.subscriptions.filter((sub: any) => monthKey(sub.created_at) <= month).length,
          1
        );
        return { month, value: cancelled / base };
      }),
      paymentFailures: months.map((month) => ({
        month,
        count: paymentFailures.filter((payment: any) => monthKey(payment.reconciled_at) === month).length,
      })),
      tournamentParticipation: months.map((month) => ({
        month,
        count: uniqueCount(
          data.drawEntries
            .filter((entry: any) => monthKey(entry.created_at) === month)
            .map((entry: any) => entry.user_id)
        ),
      })),
      leaderboardActivity: months.map((month) => ({
        month,
        count: data.scores.filter((score: any) => monthKey(score.created_at) === month).length,
        activeUsers: uniqueCount(
          data.scores
            .filter((score: any) => monthKey(score.created_at) === month)
            .map((score: any) => score.user_id)
        ),
      })),
      userGrowth,
      retention: months.map((month, index) => ({
        month,
        value: retentionForMonth(months, activeUsersByMonth, index),
      })),
    },
    tables: {
      subscriptionStatus: countBy(data.subscriptions, "status"),
      paymentStatus: countBy(data.payments, "status"),
      drawStatus: countBy(data.draws, "status"),
    },
    generatedAt: new Date().toISOString(),
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

function monthlyEquivalentPence(subscription: any) {
  const amount = Number(subscription.amount_pence ?? 0);
  return subscription.plan === "yearly" ? Math.round(amount / 12) : amount;
}

function cancelledBeforeOrInMonth(subscription: any, month: string) {
  return subscription.cancelled_at && monthKey(subscription.cancelled_at) <= month;
}

function isWithinRange(value: string | null | undefined, range: AnalyticsDateRange) {
  return Boolean(value && value >= range.from && value <= range.to);
}

function uniqueCount(values: string[]) {
  return new Set(values.filter(Boolean)).size;
}

function countBy(rows: any[], key: string) {
  return rows.reduce((acc: Record<string, number>, row) => {
    const value = row[key] ?? "unknown";
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
}

function addSetValue(map: Map<string, Set<string>>, key: string, value: string) {
  if (!key || !value) return;
  if (!map.has(key)) map.set(key, new Set());
  map.get(key)!.add(value);
}

function runningTotal(points: CountPoint[]) {
  let total = 0;
  return points.map((point) => {
    total += point.count;
    return { month: point.month, count: total, newUsers: point.count };
  });
}

function calculateRetention(months: string[], activeUsersByMonth: Map<string, Set<string>>) {
  if (months.length < 2) return 0;
  return retentionForMonth(months, activeUsersByMonth, months.length - 1);
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
