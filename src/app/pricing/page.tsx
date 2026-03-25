"use client";

import { useState, useEffect } from "react";
import { Check, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Charity } from "@/types/database";

export default function PricingPage() {
  const [isYearly, setIsYearly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [charities, setCharities] = useState<Charity[]>([]);
  const [selectedCharity, setSelectedCharity] = useState<string>("");
  const searchParams = useSearchParams();
  const preselectedCharity = searchParams.get("charity");

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("charities").select("id, name").eq("is_active", true);
      setCharities(data ?? []);
      if (preselectedCharity && data?.find(c => c.id === preselectedCharity)) {
        setSelectedCharity(preselectedCharity);
      } else if (data && data.length > 0) {
        setSelectedCharity(data[0].id);
      }
    }
    load();
  }, [supabase, preselectedCharity]);

  async function handleCheckout(plan: "monthly" | "yearly") {
    setLoading(true);

    // 1. Check auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push(`/auth/login?redirectTo=/pricing`);
      return;
    }

    // 2. Call our API
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          charityId: selectedCharity,
          charityPercentage: 10, // default minimum
        }),
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
    <div className="min-h-screen bg-[#0f1117] pt-32 pb-24">
      <div className="container max-w-5xl animate-fade-in">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-8">
            Access the dashboard, enter your scores, support your charity, and win the monthly draw. One simple subscription.
          </p>

          <div className="flex items-center justify-center gap-3">
            <span className={`text-sm font-medium ${!isYearly ? "text-white" : "text-slate-400"}`}>Monthly</span>
            <button
              onClick={() => setIsYearly(!isYearly)}
              className="relative w-14 h-8 rounded-full bg-brand-600 transition-colors p-1"
            >
              <div className={`w-6 h-6 rounded-full bg-white transition-transform ${isYearly ? "translate-x-6" : "translate-x-0"}`} />
            </button>
            <span className={`text-sm font-medium ${isYearly ? "text-white" : "text-slate-400"}`}>
              Yearly <span className="text-brand-400 ml-1 text-xs px-1.5 py-0.5 rounded bg-brand-500/20">Save 16%</span>
            </span>
          </div>
        </div>

        {/* Charity Selector */}
        <div className="max-w-md mx-auto mb-12 card p-6 text-center border-t-2 border-brand-500">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Who do you want to support?
          </label>
          <select
            value={selectedCharity}
            onChange={(e) => setSelectedCharity(e.target.value)}
            className="input w-full md:text-base cursor-pointer"
          >
            {charities.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <p className="text-xs text-slate-500 mt-3">
            You can change your charity and contribution percentage later in your dashboard.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Monthly */}
          <div className={`card p-8 transition-all duration-300 ${!isYearly ? "border-brand-500 ring-1 ring-brand-500/50 shadow-2xl shadow-brand-500/10 scale-105 z-10" : "opacity-80 scale-100 items-center justify-center"}`}>
            <h3 className="text-xl font-bold text-white mb-2">Monthly Member</h3>
            <p className="text-slate-400 text-sm mb-6">Flexibility and fun, month to month.</p>
            <div className="mb-6 flex items-baseline gap-1">
              <span className="text-5xl font-extrabold text-white">£9.99</span>
              <span className="text-slate-400 font-medium">/mo</span>
            </div>
            
            <button
              onClick={() => handleCheckout("monthly")}
              disabled={loading || !selectedCharity}
              className={`w-full py-4 rounded-xl font-bold text-sm transition-all duration-200 flex justify-center items-center gap-2 ${
                !isYearly 
                  ? "bg-brand-500 hover:bg-brand-400 text-white shadow-xl shadow-brand-500/20" 
                  : "bg-transparent border border-[#2a2d3d] text-white hover:border-brand-500"
              }`}
            >
              {loading && !isYearly ? <Loader2 className="w-5 h-5 animate-spin" /> : "Subscribe Monthly"}
            </button>
            <FeaturesList />
          </div>

          {/* Yearly */}
          <div className={`card p-8 transition-all duration-300 relative overflow-hidden ${isYearly ? "border-brand-500 ring-1 ring-brand-500/50 shadow-2xl shadow-brand-500/10 scale-105 z-10" : "opacity-80 scale-100"}`}>
            {isYearly && <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/20 rounded-full blur-3xl" />}
            <span className="absolute top-0 right-8 px-3 py-1 bg-brand-500 text-white text-xs font-bold rounded-b-lg tracking-wider">
              BEST VALUE
            </span>
            <h3 className="text-xl font-bold text-white mb-2">Annual Member</h3>
            <p className="text-slate-400 text-sm mb-6">Commit to your game and your cause.</p>
            <div className="mb-6 flex items-baseline gap-1">
              <span className="text-5xl font-extrabold text-white">£99.99</span>
              <span className="text-slate-400 font-medium">/yr</span>
            </div>
            
            <button
              onClick={() => handleCheckout("yearly")}
              disabled={loading || !selectedCharity}
              className={`w-full py-4 rounded-xl font-bold text-sm transition-all duration-200 flex justify-center items-center gap-2 ${
                isYearly 
                  ? "bg-brand-500 hover:bg-brand-400 text-white shadow-xl shadow-brand-500/20" 
                  : "bg-transparent border border-[#2a2d3d] text-white hover:border-brand-500"
              }`}
            >
              {loading && isYearly ? <Loader2 className="w-5 h-5 animate-spin" /> : "Subscribe Yearly"}
            </button>
            <FeaturesList />
          </div>
        </div>
      </div>
    </div>
  );
}

function FeaturesList() {
  return (
    <ul className="mt-8 space-y-4">
      {[
        "Full dashboard access",
        "Rolling 5-Score tracker",
        "Automatic monthly draw entry",
        "Minimum 10% charity donation",
        "Adjustable charity slider up to 100%",
        "Cancel anytime online",
      ].map((feature, i) => (
        <li key={i} className="flex items-start gap-3">
          <Check className="w-5 h-5 text-brand-400 flex-shrink-0 mt-0.5" />
          <span className="text-slate-300 text-sm">{feature}</span>
        </li>
      ))}
    </ul>
  );
}
