"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatPence } from "@/lib/utils";
import { CheckCircle, XCircle, Search, ExternalLink, Loader2 } from "lucide-react";

export default function AdminWinnersPage() {
  const [winners, setWinners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const supabase = createClient();

  useEffect(() => { fetchWinners(); }, []);

  async function fetchWinners() {
    setLoading(true);
    const { data } = await supabase
      .from("winners")
      .select(`
        *,
        profile:profiles(email, full_name),
        draw:draws(draw_month, drawn_numbers)
      `)
      .order("created_at", { ascending: false });
    
    setWinners(data ?? []);
    setLoading(false);
  }

  async function updateStatus(id: string, field: "verification_status" | "payout_status", value: string) {
    if (!confirm(`Change ${field} to ${value}?`)) return;
    
    await supabase.from("winners").update({ [field]: value }).eq("id", id);
    fetchWinners();
    
    // In a production app, approving verification might trigger a Resend email to the user
    // confirming their win has been verified and payout is processing.
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Winners & Payouts</h1>
          <p className="text-sm text-slate-400 mt-1">Verify user proofs and mark prizes as paid.</p>
        </div>
        
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search by email..." 
            className="input pl-10 w-full md:w-64"
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
           <div className="p-12 text-center text-slate-500"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
        ) : (
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-black/20 border-b border-[#2a2d3d] text-slate-400 uppercase text-xs">
              <tr>
                <th className="px-6 py-4">Winner</th>
                <th className="px-6 py-4">Draw</th>
                <th className="px-6 py-4">Prize</th>
                <th className="px-6 py-4">Proof</th>
                <th className="px-6 py-4">Verification</th>
                <th className="px-6 py-4 text-right">Payout</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2d3d]">
              {winners.map((w) => (
                <tr key={w.id} className="hover:bg-white/5">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-white">{w.profile?.full_name ?? "Unknown"}</div>
                    <div className="text-slate-500 text-xs">{w.profile?.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="badge badge-blue capitalize mb-1">{w.match_tier.replace("_", " ")}</span>
                    <div className="text-slate-500 text-xs">{w.draw?.draw_month.slice(0, 7)}</div>
                  </td>
                  <td className="px-6 py-4 font-bold text-emerald-400">
                    {formatPence(w.prize_amount_pence)}
                  </td>
                  <td className="px-6 py-4">
                    {w.proof_url ? (
                      <a href={w.proof_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-brand-400 hover:underline text-xs">
                        View Proof <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-slate-500 text-xs italic">Missing</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-2">
                      <span className={`badge ${
                        w.verification_status === 'approved' ? 'badge-green' :
                        w.verification_status === 'rejected' ? 'badge-red' : 'badge-yellow'
                      } self-start`}>
                        {w.verification_status}
                      </span>
                      {w.verification_status === "pending" && w.proof_url && (
                        <div className="flex gap-1">
                           <button onClick={() => updateStatus(w.id, "verification_status", "approved")} className="p-1 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/40"><CheckCircle className="w-4 h-4" /></button>
                           <button onClick={() => updateStatus(w.id, "verification_status", "rejected")} className="p-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/40"><XCircle className="w-4 h-4" /></button>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex flex-col items-end gap-2">
                       <span className={`badge ${w.payout_status === 'paid' ? 'badge-green' : 'badge-yellow'}`}>
                         {w.payout_status}
                       </span>
                       {w.payout_status === "pending" && w.verification_status === "approved" && (
                         <button onClick={() => updateStatus(w.id, "payout_status", "paid")} className="text-xs bg-white text-black px-2 py-1 rounded font-semibold hover:bg-slate-200">
                           Mark Paid
                         </button>
                       )}
                    </div>
                  </td>
                </tr>
              ))}
              {winners.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-slate-500">No winners calculated yet.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
