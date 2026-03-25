import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User, CreditCard, Target, History } from "lucide-react";
import { format } from "date-fns";
import { formatPence } from "@/lib/utils";

export default async function AdminUserProfilePage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const supabase = await createClient();

  const [profileRes, subsRes, scoresRes, winnersRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", id).single(),
    supabase.from("subscriptions").select("*, charity:charities(name)").eq("user_id", id).maybeSingle(),
    supabase.from("scores").select("*").eq("user_id", id).order("played_on", { ascending: false }),
    supabase.from("winners").select("*, draw:draws(draw_month)").eq("user_id", id).order("created_at", { ascending: false }),
  ]);

  const profile = profileRes.data;
  if (!profile) notFound();

  const sub = subsRes.data;
  const scores = scoresRes.data ?? [];
  const winners = winnersRes.data ?? [];

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl">
      <Link href="/admin/users" className="inline-flex items-center gap-2 text-sm text-brand-400 hover:text-brand-300">
        <ArrowLeft className="w-4 h-4" /> Back to Users
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <User className="w-6 h-6 text-brand-400" />
          {profile.full_name ?? "User Profile"}
        </h1>
        {profile.is_admin && <span className="badge badge-yellow">Admin Account</span>}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Profile Card */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-white mb-4 border-b border-[#2a2d3d] pb-2">Profile Details</h2>
          <dl className="space-y-3 text-sm">
            <div className="grid grid-cols-3">
              <dt className="text-slate-400">ID</dt>
              <dd className="col-span-2 text-white font-mono text-xs">{profile.id}</dd>
            </div>
            <div className="grid grid-cols-3">
              <dt className="text-slate-400">Email</dt>
              <dd className="col-span-2 text-white">{profile.email}</dd>
            </div>
            <div className="grid grid-cols-3">
              <dt className="text-slate-400">Phone</dt>
              <dd className="col-span-2 text-white">{profile.phone ?? "—"}</dd>
            </div>
            <div className="grid grid-cols-3">
              <dt className="text-slate-400">Joined</dt>
              <dd className="col-span-2 text-white">{format(new Date(profile.created_at), "PPP p")}</dd>
            </div>
          </dl>
        </div>

        {/* Subscription Card */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2 border-b border-[#2a2d3d] pb-2">
            <CreditCard className="w-5 h-5 text-emerald-400" /> Subscription
          </h2>
          {sub ? (
            <dl className="space-y-3 text-sm">
              <div className="grid grid-cols-3">
                <dt className="text-slate-400">Status</dt>
                <dd className="col-span-2">
                  <span className={`badge ${sub.status === 'active' ? 'badge-green' : 'badge-red'}`}>{sub.status}</span>
                </dd>
              </div>
              <div className="grid grid-cols-3">
                <dt className="text-slate-400">Plan</dt>
                <dd className="col-span-2 text-white capitalize">{sub.plan}</dd>
              </div>
              <div className="grid grid-cols-3">
                <dt className="text-slate-400">Charity Split</dt>
                <dd className="col-span-2 text-white">
                  {sub.charity_percentage}% to <span className="text-brand-400 font-medium">{(sub.charity as any)?.name ?? "Unknown"}</span>
                </dd>
              </div>
              <div className="grid grid-cols-3">
                <dt className="text-slate-400">Stripe ID</dt>
                <dd className="col-span-2 text-white font-mono text-xs truncate" title={sub.stripe_customer_id ?? ""}>
                  {sub.stripe_customer_id}
                </dd>
              </div>
            </dl>
          ) : (
             <p className="text-slate-500 text-sm">No active subscription found.</p>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Scores */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2 border-b border-[#2a2d3d] pb-2">
            <Target className="w-5 h-5 text-brand-400" /> Recent Scores
          </h2>
          {scores.length === 0 ? (
            <p className="text-slate-500 text-sm">No scores submitted.</p>
          ) : (
            <div className="space-y-3">
               {scores.map((s, i) => (
                 <div key={s.id} className="flex items-center justify-between text-sm py-1">
                   <span className="text-slate-400 w-6">{i + 1}.</span>
                   <span className="text-white flex-1">{format(new Date(s.played_on), "MMM d, yyyy")}</span>
                   <span className="font-bold text-brand-400">{s.score} pts</span>
                 </div>
               ))}
            </div>
          )}
        </div>

        {/* Winnings */}
        <div className="card p-6">
           <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2 border-b border-[#2a2d3d] pb-2">
             <History className="w-5 h-5 text-amber-400" /> Total Winnings
           </h2>
           {winners.length === 0 ? (
             <p className="text-slate-500 text-sm">No wins recorded.</p>
           ) : (
             <div className="space-y-3">
                {winners.map(w => (
                  <div key={w.id} className="flex items-center justify-between text-sm py-2 border-b border-[#2a2d3d] last:border-0">
                    <div>
                      <span className="badge badge-yellow capitalize mb-1 inline-block">{w.match_tier.replace("_", " ")}</span>
                      <p className="text-xs text-slate-400">Draw: {new Date((w.draw as any).draw_month).toLocaleDateString("en-GB", { month: "short", year: "numeric"})}</p>
                    </div>
                    <div className="text-right">
                       <p className="font-bold text-white mb-1">{formatPence(w.prize_amount_pence)}</p>
                       <span className={`badge ${w.payout_status === 'paid' ? 'badge-green' : 'badge-red'}`}>{w.payout_status}</span>
                    </div>
                  </div>
                ))}
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
