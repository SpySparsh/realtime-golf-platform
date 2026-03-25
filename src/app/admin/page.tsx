import { createClient } from "@/lib/supabase/server";
import { formatPence } from "@/lib/utils";
import { Users, CreditCard, Gift, Trophy } from "lucide-react";

export default async function AdminAnalyticsPage() {
  const supabase = await createClient();

  // Run aggregate queries concurrently
  const [profilesRes, subsRes, charityRes, drawsRes, winnersRes] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("subscriptions").select("status, amount_pence, prize_pool_contribution_pence, charity_percentage"),
    supabase.from("charities").select("*", { count: "exact", head: true }),
    supabase.from("draws").select("status"),
    supabase.from("winners").select("payout_status, prize_amount_pence")
  ]);

  const totalUsers = profilesRes.count ?? 0;
  const subscriptions = subsRes.data ?? [];
  const activeSubs = subscriptions.filter(s => s.status === "active");
  
  // Calculations
  const mrrPence = activeSubs.reduce((sum, s) => sum + s.amount_pence, 0);
  const monthlyPrizePoolContribPence = activeSubs.reduce((sum, s) => sum + s.prize_pool_contribution_pence, 0);
  const monthlyCharityContribPence = mrrPence - monthlyPrizePoolContribPence;

  const totalCharities = charityRes.count ?? 0;
  
  const draws = drawsRes.data ?? [];
  const publishedDraws = draws.filter(d => d.status === "published").length;

  const winners = winnersRes.data ?? [];
  const totalPaidOutPence = winners
    .filter(w => w.payout_status === "paid")
    .reduce((sum, w) => sum + w.prize_amount_pence, 0);

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Platform Analytics</h1>
        <p className="text-sm text-slate-400 mt-1">Real-time overview of platform health and financials.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="w-5 h-5 text-blue-400" />}
          title="Total Users"
          value={totalUsers.toString()}
          subtitle={`${activeSubs.length} Active Subscribers`}
        />
        <StatCard
          icon={<CreditCard className="w-5 h-5 text-emerald-400" />}
          title="Revenue (MRR)"
          value={formatPence(mrrPence)}
          subtitle="Total active monthly equivalent"
        />
        <StatCard
          icon={<Gift className="w-5 h-5 text-pink-400" />}
          title="Monthly Charity Split"
          value={formatPence(monthlyCharityContribPence)}
          subtitle={`Across ${totalCharities} active charities`}
        />
        <StatCard
          icon={<Trophy className="w-5 h-5 text-amber-400" />}
          title="Monthly Prize Split"
          value={formatPence(monthlyPrizePoolContribPence)}
          subtitle={`Total Paid Out: ${formatPence(totalPaidOutPence)}`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6 border-t-2 border-emerald-500">
          <h2 className="text-lg font-semibold text-white mb-4">Subscription Breakdown</h2>
          <div className="space-y-4">
             <div className="flex justify-between items-center pb-3 border-b border-[#2a2d3d]">
                <span className="text-slate-400 text-sm">Active</span>
                <span className="text-white font-bold">{activeSubs.length}</span>
             </div>
             <div className="flex justify-between items-center pb-3 border-b border-[#2a2d3d]">
                <span className="text-slate-400 text-sm">Past Due</span>
                <span className="text-white font-bold">{subscriptions.filter(s => s.status === "past_due").length}</span>
             </div>
             <div className="flex justify-between items-center pb-3 border-b border-[#2a2d3d]">
                <span className="text-slate-400 text-sm">Cancelled</span>
                <span className="text-white font-bold">{subscriptions.filter(s => s.status === "cancelled").length}</span>
             </div>
          </div>
        </div>

        <div className="card p-6 border-t-2 border-amber-500">
          <h2 className="text-lg font-semibold text-white mb-4">Draw System Health</h2>
          <div className="space-y-4">
             <div className="flex justify-between items-center pb-3 border-b border-[#2a2d3d]">
                <span className="text-slate-400 text-sm">Draws Published</span>
                <span className="text-white font-bold">{publishedDraws}</span>
             </div>
             <div className="flex justify-between items-center pb-3 border-b border-[#2a2d3d]">
                <span className="text-slate-400 text-sm">Total Winners All-Time</span>
                <span className="text-white font-bold">{winners.length}</span>
             </div>
             <div className="flex justify-between items-center pb-3 border-b border-[#2a2d3d]">
                <span className="text-slate-400 text-sm">Pending Payouts ⚠️</span>
                <span className="text-amber-400 font-bold">{winners.filter(w => w.payout_status === "pending").length}</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, title, value, subtitle }: any) {
  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-xl bg-white/5 border border-white/10">
          {icon}
        </div>
        <h3 className="text-sm font-medium text-slate-400">{title}</h3>
      </div>
      <p className="text-3xl font-bold text-white mb-1">{value}</p>
      <p className="text-xs text-slate-500">{subtitle}</p>
    </div>
  );
}
