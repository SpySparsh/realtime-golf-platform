"use client";

import { useState } from "react";
import { Loader2, Heart } from "lucide-react";

export default function DonatePage() {
  const [amount, setAmount] = useState<number>(10);
  const [loading, setLoading] = useState(false);

  async function handleDonate(e: React.FormEvent) {
    e.preventDefault();
    if (amount < 1) return;
    setLoading(true);

    try {
      const res = await fetch("/api/stripe/donate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error ?? "Failed to initiate checkout");
      }
    } catch (err: any) {
      alert(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0f1117] pt-32 pb-24 text-slate-300">
      <div className="container max-w-xl animate-fade-in">
        <div className="text-center mb-12">
          <div className="w-16 h-16 rounded-full bg-pink-500/20 flex items-center justify-center mx-auto mb-6">
            <Heart className="w-8 h-8 text-pink-400" />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4">Make a Donation</h1>
          <p className="text-slate-400 text-lg">Support our charity partners directly with a one-off independent donation.</p>
        </div>

        <form onSubmit={handleDonate} className="card p-8 text-left border-t-2 border-pink-500 shadow-xl shadow-pink-500/10">
          <div className="mb-8">
            <label className="block text-sm font-medium text-slate-300 mb-4 text-center">Select Donation Amount</label>
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[5, 10, 25, 50, 100].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(preset)}
                  className={`py-3 rounded-xl border font-bold text-center transition-all ${
                    amount === preset
                      ? "bg-pink-500 border-pink-500 text-white"
                      : "bg-[#0f1117] border-[#2a2d3d] text-slate-400 hover:border-pink-500 hover:text-pink-400"
                  }`}
                >
                  £{preset}
                </button>
              ))}
            </div>
            
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">£</span>
              <input
                type="number"
                min="1"
                step="1"
                required
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full bg-[#0f1117] border border-[#2a2d3d] rounded-xl pl-8 pr-4 py-4 text-white text-lg font-bold focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-colors"
                placeholder="Custom Amount"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || amount < 1}
            className="w-full py-4 rounded-xl font-bold transition-all duration-200 flex justify-center items-center gap-2 bg-pink-500 hover:bg-pink-400 text-white shadow-xl shadow-pink-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Donate Securely"}
          </button>
          
          <p className="text-center text-xs text-slate-500 mt-4">Safe and secure payments processed by Stripe.</p>
        </form>
      </div>
    </div>
  );
}
