"use client";

import { useState, useEffect } from "react";
import { Loader2, Heart, CheckCircle, AlertCircle } from "lucide-react";
import type { Charity, Subscription } from "@/types/database";

export default function CharityPage() {
  const [charities, setCharities] = useState<Charity[]>([]);
  const [subscription, setSubscription] = useState<(Subscription & { charity: Charity | null }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedCharityId, setSelectedCharityId] = useState<string | null>(null);
  const [charityPercentage, setCharityPercentage] = useState(10);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/charities").then((r) => r.json()),
      fetch("/api/subscription").then((r) => r.json()),
    ]).then(([charityData, subData]) => {
      setCharities(Array.isArray(charityData) ? charityData : []);
      setSubscription(subData);
      setSelectedCharityId(subData?.charity_id ?? null);
      setCharityPercentage(subData?.charity_percentage ?? 10);
      setLoading(false);
    });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const res = await fetch("/api/subscription", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        charity_id: selectedCharityId,
        charity_percentage: charityPercentage,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      setError(err.error ?? "Failed to save");
      setSaving(false);
      return;
    }

    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
      </div>
    );
  }

  const subscriptionAmountPence = subscription?.amount_pence ?? 999;
  const charityAmountPence = Math.round(subscriptionAmountPence * (charityPercentage / 100));
  const prizeAmountPence = subscriptionAmountPence - charityAmountPence;

  return (
    <div className="max-w-2xl space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">My Charity</h1>
        <p className="text-slate-400 text-sm mt-1">
          Choose your supported charity and set how much of your subscription goes to them.
          Minimum 10% is mandatory.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Charity selector */}
        <div className="card p-6">
          <h2 className="text-base font-semibold text-white mb-4">Select a Charity</h2>
          <div className="space-y-3">
            {(charities || []).map((c) => (
              <label
                key={c.id}
                className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all duration-150 ${
                  selectedCharityId === c.id
                    ? "border-brand-500 bg-brand-500/10"
                    : "border-[#2a2d3d] hover:border-slate-500"
                }`}
              >
                <input
                  type="radio"
                  name="charity"
                  value={c.id}
                  checked={selectedCharityId === c.id}
                  onChange={() => setSelectedCharityId(c.id)}
                  className="sr-only"
                />
                <div className="w-10 h-10 rounded-xl bg-pink-500/20 flex items-center justify-center flex-shrink-0">
                  <Heart className={`w-5 h-5 ${selectedCharityId === c.id ? "text-brand-400" : "text-pink-400"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{c.name}</p>
                  <p className="text-xs text-slate-400 truncate">{c.description}</p>
                  {c.is_featured && <span className="badge badge-green mt-1">Featured</span>}
                </div>
                {selectedCharityId === c.id && (
                  <CheckCircle className="w-5 h-5 text-brand-400 flex-shrink-0" />
                )}
              </label>
            ))}
          </div>
        </div>

        {/* Contribution slider */}
        <div className="card p-6">
          <h2 className="text-base font-semibold text-white mb-1">Contribution Percentage</h2>
          <p className="text-xs text-slate-400 mb-4">
            Drag to increase your charity contribution. Minimum is 10%.
          </p>

          <div className="flex items-center gap-4 mb-4">
            <input
              type="range"
              min={10}
              max={100}
              step={5}
              value={charityPercentage}
              onChange={(e) => setCharityPercentage(Number(e.target.value))}
              className="flex-1 accent-brand-500"
            />
            <span className="text-2xl font-bold text-brand-400 w-16 text-right">
              {charityPercentage}%
            </span>
          </div>

          {/* Breakdown */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-pink-500/10 border border-pink-500/20">
              <p className="text-xs text-pink-400 mb-1">Charity gets</p>
              <p className="text-xl font-bold text-white">£{(charityAmountPence / 100).toFixed(2)}</p>
              <p className="text-xs text-slate-500">per billing cycle</p>
            </div>
            <div className="p-3 rounded-xl bg-brand-500/10 border border-brand-500/20">
              <p className="text-xs text-brand-400 mb-1">Prize pool gets</p>
              <p className="text-xl font-bold text-white">£{(prizeAmountPence / 100).toFixed(2)}</p>
              <p className="text-xs text-slate-500">per billing cycle</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 text-sm">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            Preferences saved!
          </div>
        )}

        <button type="submit" disabled={saving || !selectedCharityId} className="btn-primary">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Save Preferences
        </button>
      </form>
    </div>
  );
}
