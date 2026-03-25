import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { formatPence, formatDrawMonth } from "@/lib/utils";
import { Trophy, Upload } from "lucide-react";
import WinnerUploadForm from "@/components/dashboard/WinnerUploadForm";

export default async function DrawsPage() {
  // @ts-ignore - Bypass Supabase local schema typings mismatch
  const supabase: any = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const [drawEntriesRes, winnersRes, drawsRes] = await Promise.all([
    supabase
      .from("draw_entries")
      .select("*, draw:draws(*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("winners")
      .select("*, draw:draws(draw_month, drawn_numbers)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("draws")
      .select("*")
      .eq("status", "published")
      .order("draw_month", { ascending: false })
      .limit(6),
  ]);

  const entries = drawEntriesRes.data ?? [];
  const winners = winnersRes.data ?? [];
  const draws = drawsRes.data ?? [];

  const totalWon = winners.reduce((s: number, w: any) => s + w.prize_amount_pence, 0);
  const pendingPayouts = winners.filter((w: any) => w.payout_status === "pending");

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Draws & Winnings</h1>
        <p className="text-slate-400 text-sm mt-1">
          Your draw participation history and prize winnings.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5">
          <p className="text-xs text-slate-400 mb-1">Draws Entered</p>
          <p className="text-3xl font-bold text-white">{entries.length}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-slate-400 mb-1">Total Won</p>
          <p className="text-3xl font-bold text-brand-400">{formatPence(totalWon)}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-slate-400 mb-1">Pending Payouts</p>
          <p className="text-3xl font-bold text-amber-400">{pendingPayouts.length}</p>
        </div>
      </div>

      {/* Winnings requiring action */}
      {winners.filter((w: any) => w.verification_status === "pending" && !w.proof_url).length > 0 && (
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Upload className="w-4 h-4 text-amber-400" />
            <h2 className="text-base font-semibold text-white">Action Required — Upload Proof</h2>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            You have winnings pending verification. Upload a screenshot from your golf platform
            to claim your prize.
          </p>
          {winners
            .filter((w: any) => w.verification_status === "pending" && !w.proof_url)
            .map((w: any) => (
              <div key={w.id} className="border border-amber-500/20 rounded-xl p-4 bg-amber-500/5 mb-3">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="badge badge-yellow capitalize">{w.match_tier.replace("_", " ")}</span>
                    <p className="text-sm font-bold text-white mt-1">{formatPence(w.prize_amount_pence)}</p>
                    <p className="text-xs text-slate-400">{formatDrawMonth((w.draw as any).draw_month)}</p>
                  </div>
                </div>
                <WinnerUploadForm winnerId={w.id} />
              </div>
            ))}
        </div>
      )}

      {/* Winnings history */}
      {winners.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-[#2a2d3d]">
            <h2 className="text-base font-semibold text-white">Winnings History</h2>
          </div>
          <div className="divide-y divide-[#2a2d3d]">
            {winners.map((w: any) => (
              <div key={w.id} className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <div>
                    <p className="text-sm font-semibold text-white capitalize">
                      {w.match_tier.replace("_", " ")}
                    </p>
                    <p className="text-xs text-slate-400">{formatDrawMonth((w.draw as any).draw_month)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-white">{formatPence(w.prize_amount_pence)}</p>
                  <div className="flex items-center gap-2 justify-end mt-1">
                    <span className={`badge ${
                      w.verification_status === "approved" ? "badge-green" :
                      w.verification_status === "rejected" ? "badge-red" : "badge-yellow"
                    }`}>
                      {w.verification_status}
                    </span>
                    <span className={`badge ${w.payout_status === "paid" ? "badge-green" : "badge-yellow"}`}>
                      {w.payout_status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Past draws */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-[#2a2d3d]">
          <h2 className="text-base font-semibold text-white">Recent Draws</h2>
        </div>
        {draws.length === 0 ? (
          <p className="p-6 text-slate-500 text-sm">No draws published yet.</p>
        ) : (
          <div className="divide-y divide-[#2a2d3d]">
            {draws.map((draw: any) => {
              const myEntry = entries.find((e: any) => (e.draw as any)?.id === draw.id);
              return (
                <div key={draw.id} className="px-6 py-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-white">{formatDrawMonth(draw.draw_month)}</p>
                    {myEntry && (
                      <span className={`badge ${myEntry.match_count > 0 ? "badge-green" : "badge-blue"}`}>
                        {myEntry.match_count} match{myEntry.match_count !== 1 ? "es" : ""}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {draw.drawn_numbers.map((n: number) => {
                      const matched = myEntry?.entry_numbers?.includes(n) ?? false;
                      return (
                        <span
                          key={n}
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border ${
                            matched
                              ? "bg-brand-500/30 border-brand-500 text-brand-300"
                              : "bg-white/5 border-[#2a2d3d] text-slate-400"
                          }`}
                        >
                          {n}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
