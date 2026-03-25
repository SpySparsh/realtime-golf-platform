"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatPence, formatDrawMonth } from "@/lib/utils";
import { Play, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import type { Draw } from "@/types/database";

export default function AdminDrawsPage() {
  const [draws, setDraws] = useState<Draw[]>([]);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const supabase = createClient();

  async function fetchDraws() {
    setLoading(true);
    const { data } = await supabase.from("draws").select("*").order("draw_month", { ascending: false });
    setDraws(data ?? []);
    setLoading(false);
  }

  useEffect(() => { fetchDraws(); }, []);

  async function executeDraw(drawMonth: string) {
    if (!confirm(`Are you sure you want to execute the draw for ${formatDrawMonth(drawMonth)}? This will calculate winners and cannot be undone.`)) return;
    
    setExecuting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/admin/draws/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ drawMonth }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to execute draw.");
      }

      const { draw, winnersCount } = await res.json();
      setSuccess(`Draw executed! Numbers: ${draw.drawn_numbers.join(", ")}. ${winnersCount} winners found.`);
      fetchDraws();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setExecuting(false);
    }
  }

  // Helper to get next month string YYYY-MM-01
  function getNextMonthString() {
    const d = new Date();
    if (draws.length > 0) {
      const last = draws[0].draw_month;
      const parsed = new Date(last);
      parsed.setMonth(parsed.getMonth() + 1);
      return parsed.toISOString().slice(0, 10);
    }
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Draw Engine</h1>
        <p className="text-sm text-slate-400 mt-1">Execute monthly draws, generate numbers using the algorithm, and calculate winners.</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" /> {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400">
          <CheckCircle className="w-5 h-5 flex-shrink-0" /> {success}
        </div>
      )}

      <div className="card p-6 border-l-4 border-l-amber-500 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <h2 className="text-lg font-bold text-white mb-2">Execute Next Draw</h2>
           <p className="text-slate-400 text-sm">Next scheduled draw is for <strong>{formatDrawMonth(getNextMonthString())}</strong>. Executing this will lock current subscriber 5-scores, run the algorithmic generator, calculate the prize pool distributions, and generate winners.</p>
        </div>
        <button 
          onClick={() => executeDraw(getNextMonthString())} 
          disabled={executing}
          className="btn-primary whitespace-nowrap !bg-amber-500 hover:!bg-amber-400 !text-black flex items-center gap-2"
        >
          {executing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          Execute Draw
        </button>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
           <div className="p-12 text-center text-slate-500"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
        ) : (
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-black/20 border-b border-[#2a2d3d] text-slate-400 uppercase text-xs">
              <tr>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Draw Month</th>
                <th className="px-6 py-4">Total Pool</th>
                <th className="px-6 py-4">Drawn Numbers</th>
                <th className="px-6 py-4">Executed At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2d3d]">
              {draws.map((d) => (
                <tr key={d.id} className="hover:bg-white/5">
                  <td className="px-6 py-4">
                    <span className={`badge ${d.status === 'published' ? 'badge-green' : 'badge-yellow'}`}>{d.status}</span>
                  </td>
                  <td className="px-6 py-4 font-bold text-white">{formatDrawMonth(d.draw_month)}</td>
                  <td className="...px-6 py-4 font-semibold text-amber-400">
                    {d.total_pool_pence > 0 ? formatPence(d.total_pool_pence) : "£0.00"}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-1.5">
                      {d.drawn_numbers.map((n: number) => (
                         <span key={n} className="w-7 h-7 rounded-sm bg-brand-500/20 text-brand-400 flex items-center justify-center font-bold text-xs">{n}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-500">{new Date(d.created_at).toLocaleString("en-GB")}</td>
                </tr>
              ))}
              {draws.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-slate-500">No draws executed yet.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
