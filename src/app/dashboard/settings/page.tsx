"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, ExternalLink, CheckCircle, AlertCircle } from "lucide-react";
import type { Profile, Subscription } from "@/types/database";
import Link from "next/link";

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  // @ts-ignore - Bypass Supabase local schema typings mismatch
  const supabase: any = useMemo(() => createClient(), []);

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        const user = sessionData.session?.user;
        if (!user) {
          window.location.href = "/auth/login?redirectTo=/dashboard/settings";
          return;
        }

        const [profRes, subRes] = await Promise.all([
          supabase.from("profiles").select("*").eq("id", user.id).single(),
          supabase.from("subscriptions").select("*").eq("user_id", user.id).maybeSingle(),
        ]);

        if (profRes.error) throw profRes.error;
        if (subRes.error) throw subRes.error;
        if (!mounted) return;

        setProfile(profRes.data);
        setFullName(profRes.data.full_name ?? "");
        setPhone(profRes.data.phone ?? "");
        setSubscription(subRes.data ?? null);
      } catch (err: any) {
        if (mounted) setError(err.message ?? "Unable to load settings");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      mounted = false;
    };
  }, [supabase]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setError(null);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ full_name: fullName, phone: phone || null })
      .eq("id", profile.id);

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
    setSaving(false);
  }

  async function handleBillingPortal() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (res.status === 401) {
        window.location.assign("/auth/login?redirectTo=/dashboard/settings");
        return;
      }
      if (data.url) window.location.href = data.url;
      else throw new Error(data.error ?? "Failed to load portal");
    } catch (err: any) {
      setError(err.message);
      setPortalLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
        {error && <p className="ml-3 text-sm text-red-400">{error}</p>}
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 text-sm mt-1">Manage your account and subscription preferences.</p>
      </div>

      {/* Profile Settings */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Profile Information</h2>
        
        {error && (
          <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 text-sm">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            Profile updated successfully.
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label className="label">Email Address</label>
            <input type="email" disabled value={profile?.email ?? ""} className="input opacity-50 cursor-not-allowed" />
            <p className="text-xs text-slate-500 mt-1">Email cannot be changed directly.</p>
          </div>
          <div>
            <label className="label">Full Name</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="label">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input"
              placeholder="+44 7000 000000"
            />
          </div>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Save Changes
          </button>
        </form>
      </div>

      {/* Subscription Settings */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Subscription & Billing</h2>
        
        <div className="p-4 rounded-xl bg-black/20 border border-[#2a2d3d] mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-300">Current Plan</span>
            <span className={`badge ${subscription?.status === "active" ? "badge-green" : "badge-yellow"}`}>
              {subscription?.status ?? "Inactive"}
            </span>
          </div>
          <p className="text-white font-semibold capitalize">
            {subscription?.plan ? `${subscription.plan} Plan` : "No active plan"}
          </p>
          {subscription?.current_period_end && (
            <p className="text-xs text-slate-400 mt-1">
              Renews on {new Date(subscription.current_period_end).toLocaleDateString("en-GB")}
            </p>
          )}
        </div>

        <div className="space-y-3">
          <p className="text-sm text-slate-400">
            {subscription?.status === "active"
              ? "Use the secure Stripe billing portal to update your payment method, download invoices, or cancel your subscription."
              : "You don't have an active plan. Subscribe to enter monthly draws and support your chosen charity."}
          </p>
          {subscription?.status === "active" ? (
            <button
              onClick={handleBillingPortal}
              disabled={portalLoading || !subscription?.stripe_customer_id}
              className="btn-secondary w-full"
            >
              {portalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
              Open Billing Portal
            </button>
          ) : (
            <Link href="/pricing" className="btn-primary w-full flex items-center justify-center gap-2">
              <ExternalLink className="w-4 h-4" />
              View Pricing Plans
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
