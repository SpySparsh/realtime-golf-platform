import Link from "next/link";
import type { ReactNode } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatPence } from "@/lib/utils";
import { createAnalyticsService } from "@/modules/analytics.module";
import type {
  ChartCountPoint,
  ChartValuePoint,
  LeaderboardActivityPoint,
  UserGrowthPoint,
} from "@/services/analytics.service";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  CreditCard,
  LineChart,
  RefreshCw,
  Target,
  Trophy,
  Users,
} from "lucide-react";

type PageProps = {
  searchParams?: Promise<{
    from?: string;
    to?: string;
    page?: string;
  }>;
};

type ChartRow = {
  label: string;
  primary: number;
  primaryLabel: string;
  secondaryLabel: string;
};

type StatCardProps = {
  icon: ReactNode;
  title: string;
  value: string;
  subtitle: string;
  trend: "up" | "down";
};

type ChartPanelProps = {
  title: string;
  icon: ReactNode;
  rows: ChartRow[];
};

export default async function AdminAnalyticsPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const supabase = createAdminClient();
  const analytics = createAnalyticsService(supabase);
  const [dashboard, activity] = await Promise.all([
    analytics.getDashboard({ from: params.from, to: params.to }),
    analytics.getActivityPage({
      from: params.from,
      to: params.to,
      page: Number(params.page ?? 1),
      pageSize: 8,
    }),
  ]);

  const fromDate = dashboard.range.from.slice(0, 10);
  const toDate = dashboard.range.to.slice(0, 10);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1">
            Revenue, retention, participation, and payment health for the selected period.
          </p>
        </div>

        <form className="flex flex-col sm:flex-row gap-2">
          <input
            type="date"
            name="from"
            defaultValue={fromDate}
            className="rounded-lg border border-[#2a2d3d] bg-[#161924] px-3 py-2 text-sm text-white"
          />
          <input
            type="date"
            name="to"
            defaultValue={toDate}
            className="rounded-lg border border-[#2a2d3d] bg-[#161924] px-3 py-2 text-sm text-white"
          />
          <button className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-black">
            Apply
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={<CreditCard className="w-5 h-5 text-emerald-400" />}
          title="MRR"
          value={formatPence(dashboard.summary.monthlyRecurringRevenuePence)}
          subtitle={`${dashboard.summary.activeSubscriptions} active subscriptions`}
          trend="up"
        />
        <StatCard
          icon={<RefreshCw className="w-5 h-5 text-rose-400" />}
          title="Churn Rate"
          value={formatPercent(dashboard.summary.churnRate)}
          subtitle={`${dashboard.summary.paymentFailures} failed payments`}
          trend={dashboard.summary.churnRate > 0.05 ? "down" : "up"}
        />
        <StatCard
          icon={<Trophy className="w-5 h-5 text-amber-400" />}
          title="Tournament Participation"
          value={dashboard.summary.tournamentParticipants.toString()}
          subtitle="Unique draw entrants"
          trend="up"
        />
        <StatCard
          icon={<Users className="w-5 h-5 text-blue-400" />}
          title="Retention"
          value={formatPercent(dashboard.summary.retentionRate)}
          subtitle={`${dashboard.summary.totalUsers} total users`}
          trend="up"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ChartPanel
          title="Revenue And Subscriptions"
          icon={<LineChart className="w-4 h-4 text-emerald-400" />}
          rows={dashboard.charts.mrr.map((point: ChartValuePoint, index: number) => ({
            label: point.month,
            primary: point.value,
            primaryLabel: formatPence(point.value),
            secondaryLabel: `${dashboard.charts.activeSubscriptions[index]?.count ?? 0} active`,
          }))}
        />
        <ChartPanel
          title="Payment Failure Trends"
          icon={<Activity className="w-4 h-4 text-rose-400" />}
          rows={dashboard.charts.paymentFailures.map((point: ChartCountPoint) => ({
            label: point.month,
            primary: point.count,
            primaryLabel: `${point.count}`,
            secondaryLabel: "failures",
          }))}
        />
        <ChartPanel
          title="Leaderboard Activity"
          icon={<Target className="w-4 h-4 text-blue-400" />}
          rows={dashboard.charts.leaderboardActivity.map((point: LeaderboardActivityPoint) => ({
            label: point.month,
            primary: point.count,
            primaryLabel: `${point.count} scores`,
            secondaryLabel: `${point.activeUsers} users`,
          }))}
        />
        <ChartPanel
          title="User Growth And Retention"
          icon={<Users className="w-4 h-4 text-amber-400" />}
          rows={dashboard.charts.userGrowth.map((point: UserGrowthPoint, index: number) => ({
            label: point.month,
            primary: point.count,
            primaryLabel: `${point.count} users`,
            secondaryLabel: `${formatPercent(dashboard.charts.retention[index]?.value ?? 0)} retained`,
          }))}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Breakdown title="Subscription Status" rows={dashboard.tables.subscriptionStatus} />
        <Breakdown title="Payment Status" rows={dashboard.tables.paymentStatus} />
        <Breakdown title="Draw Status" rows={dashboard.tables.drawStatus} />
      </div>

      <section className="card p-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Payment Activity</h2>
            <p className="text-sm text-slate-500">Paginated reconciliation feed</p>
          </div>
          <span className="text-xs text-slate-500">
            Page {activity.pagination.page} of {activity.pagination.totalPages}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2d3d] text-left text-slate-500">
                <th className="py-2 pr-4 font-medium">Date</th>
                <th className="py-2 pr-4 font-medium">Provider</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pr-4 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {activity.rows.map((row) => (
                <tr key={row.id} className="border-b border-[#2a2d3d]/60 text-slate-300">
                  <td className="py-3 pr-4">{new Date(row.occurredAt).toLocaleDateString("en-GB")}</td>
                  <td className="py-3 pr-4 capitalize">{row.provider}</td>
                  <td className="py-3 pr-4">
                    <span className="rounded-full bg-white/5 px-2 py-1 text-xs capitalize">
                      {row.status}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-right">{formatPence(row.amount ?? 0)}</td>
                </tr>
              ))}
              {activity.rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500">
                    No payment activity in this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          {activity.pagination.page > 1 && (
            <Link className="rounded-lg border border-[#2a2d3d] px-3 py-2 text-sm text-slate-300" href={pageHref(params, activity.pagination.page - 1)}>
              Previous
            </Link>
          )}
          {activity.pagination.page < activity.pagination.totalPages && (
            <Link className="rounded-lg border border-[#2a2d3d] px-3 py-2 text-sm text-slate-300" href={pageHref(params, activity.pagination.page + 1)}>
              Next
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({ icon, title, value, subtitle, trend }: StatCardProps) {
  const TrendIcon = trend === "down" ? ArrowDownRight : ArrowUpRight;
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 rounded-lg bg-white/5 border border-white/10">{icon}</div>
        <TrendIcon className={trend === "down" ? "w-4 h-4 text-rose-400" : "w-4 h-4 text-emerald-400"} />
      </div>
      <p className="text-sm text-slate-400">{title}</p>
      <p className="text-3xl font-bold text-white mt-1">{value}</p>
      <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
    </div>
  );
}

function ChartPanel({ title, icon, rows }: ChartPanelProps) {
  const max = Math.max(...rows.map((row) => Number(row.primary)), 1);
  return (
    <section className="card p-6">
      <div className="flex items-center gap-2 mb-5">
        {icon}
        <h2 className="text-lg font-semibold text-white">{title}</h2>
      </div>
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-[72px_1fr_120px] items-center gap-3">
            <span className="text-xs text-slate-500">{row.label}</span>
            <div className="h-2 rounded-full bg-[#252938] overflow-hidden">
              <div
                className="h-full rounded-full bg-amber-400"
                style={{ width: `${Math.max((Number(row.primary) / max) * 100, row.primary ? 4 : 0)}%` }}
              />
            </div>
            <span className="text-right text-xs text-slate-400">
              {row.primaryLabel}
              <span className="block text-slate-600">{row.secondaryLabel}</span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function Breakdown({ title, rows }: { title: string; rows: Record<string, number> }) {
  const entries = Object.entries(rows);
  return (
    <section className="card p-6">
      <h2 className="text-lg font-semibold text-white mb-4">{title}</h2>
      <div className="space-y-3">
        {entries.map(([label, count]) => (
          <div key={label} className="flex items-center justify-between border-b border-[#2a2d3d] pb-2">
            <span className="text-sm text-slate-400 capitalize">{label.replaceAll("_", " ")}</span>
            <span className="font-semibold text-white">{count}</span>
          </div>
        ))}
        {entries.length === 0 && <p className="text-sm text-slate-500">No data in range.</p>}
      </div>
    </section>
  );
}

function formatPercent(value: number) {
  return `${Math.round(value * 1000) / 10}%`;
}

function pageHref(params: Record<string, string | undefined>, page: number) {
  const search = new URLSearchParams();
  if (params.from) search.set("from", params.from);
  if (params.to) search.set("to", params.to);
  search.set("page", String(page));
  return `/admin?${search.toString()}`;
}
