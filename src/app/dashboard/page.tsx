import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatPence, formatDrawMonth } from "@/lib/utils";
import { Target, Trophy, Heart, TrendingUp, AlertCircle, ArrowRight } from "lucide-react";

export default async function DashboardPage() {
  // @ts-ignore - Bypass Supabase local schema typings mismatch
  const supabase: any = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Fetch all user data in parallel
  const [scoresRes, subscriptionRes, winnersRes, latestDrawRes] = await Promise.all([
    supabase
      .from("scores")
      .select("*")
      .eq("user_id", user.id)
      .order("played_on", { ascending: false })
      .limit(5),
    supabase
      .from("subscriptions")
      .select("*, charity:charities(*)")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("winners")
      .select("*, draw:draws(draw_month,drawn_numbers)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("draws")
      .select("*")
      .eq("status", "published")
      .order("draw_month", { ascending: false })
      .limit(1),
  ]);

  const scores = scoresRes.data ?? [];
  const subscription = subscriptionRes.data;
  const winners = winnersRes.data ?? [];
  const latestDraw = latestDrawRes.data?.[0];

  const totalWon = winners.reduce((sum: number, w: any) => sum + w.prize_amount_pence, 0);
  const isActive = subscription?.status === "active";

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Subscription warning */}
      {!isActive && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-400">No active subscription</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Subscribe to enter monthly draws and support your charity.{" "}
              <Link href="/pricing" className="text-brand-400 hover:underline">
                View plans →
              </Link>
            </p>
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Target className="w-5 h-5 text-brand-400" />}
          label="Scores Entered"
          value={`${scores.length}/5`}
          sub="rolling window"
        />
        <StatCard
          icon={<Trophy className="w-5 h-5 text-amber-400" />}
          label="Total Won"
          value={formatPence(totalWon)}
          sub={`${winners.length} prize${winners.length !== 1 ? "s" : ""}`}
        />
        <StatCard
          icon={<Heart className="w-5 h-5 text-pink-400" />}
          label="Charity Contribution"
          value={subscription ? `${subscription.charity_percentage}%` : "—"}
          sub={subscription?.charity ? (subscription.charity as any).name : "Not selected"}
          subTruncate
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5 text-blue-400" />}
          label="Pool Contribution"
          value={isActive ? formatPence(subscription!.prize_pool_contribution_pence) : "—"}
          sub="per billing cycle"
        />
      </div>

      {/* Two-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Scores */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white">My Scores</h2>
            <Link href="/dashboard/scores" className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
              Manage <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {scores.length === 0 ? (
            <p className="text-slate-500 text-sm">No scores yet. Add your first round!</p>
          ) : (
            <div className="space-y-2">
              {scores.map((s: any) => (
                <div key={s.id} className="flex items-center justify-between py-2 border-b border-[#2a2d3d] last:border-0">
                  <span className="text-sm text-slate-400">
                    {new Date(s.played_on).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                  <span className="text-sm font-bold text-white">{s.score} pts</span>
                </div>
              ))}
            </div>
          )}
          {scores.length < 5 && isActive && (
            <Link href="/dashboard/scores" className="btn-primary mt-4 text-xs px-4 py-2 inline-flex">
              + Add Score
            </Link>
          )}
        </div>

        {/* Latest Draw / Winners */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white">Draws & Winnings</h2>
            <Link href="/dashboard/draws" className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {latestDraw ? (
            <div className="mb-4">
              <p className="text-xs text-slate-500 mb-1">Latest draw — {formatDrawMonth(latestDraw.draw_month)}</p>
              <div className="flex gap-2 flex-wrap">
                {latestDraw.drawn_numbers.map((n: number) => (
                  <span key={n} className="w-8 h-8 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-xs font-bold text-brand-400">
                    {n}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-slate-500 text-sm mb-4">No draws published yet.</p>
          )}
          {winners.length > 0 ? (
            <div className="space-y-2">
              {winners.slice(0, 3).map((w: any) => (
                <div key={w.id} className="flex items-center justify-between">
                  <div>
                    <span className="badge badge-green capitalize">{w.match_tier.replace("_", " ")}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-white">{formatPence(w.prize_amount_pence)}</p>
                    <p className={`text-xs ${w.payout_status === "paid" ? "text-brand-400" : "text-amber-400"}`}>
                      {w.payout_status === "paid" ? "Paid" : "Pending payout"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm">No winnings yet — keep playing!</p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon, label, value, sub, subTruncate,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  subTruncate?: boolean;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
          {icon}
        </div>
        <span className="text-xs text-slate-400 font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className={`text-xs text-slate-500 mt-1 ${subTruncate ? "truncate" : ""}`}>{sub}</p>
    </div>
  );
}
