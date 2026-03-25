import Link from "next/link";
import { ArrowRight, Trophy, HeartHandshake, Zap, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: featuredCharities } = await supabase
    .from("charities")
    .select("id, name, description")
    .eq("is_featured", true)
    .limit(3);

  return (
    <div className="flex flex-col min-h-screen bg-[#0f1117] overflow-hidden">
      {/* HERO SECTION */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-hero-gradient pointer-events-none" />
        
        <div className="container relative z-10 text-center animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-sm font-medium mb-8">
            <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
            Join the UK's fastest-growing golf community
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight leading-tight mb-8">
            The game you love.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-emerald-300">
              The impact they need.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Record your Stableford scores. Enter monthly prize draws. Directly support life-changing charities with every drive.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/pricing" className="btn-primary w-full sm:w-auto text-lg px-8 py-4">
              Subscribe & Play
            </Link>
            <Link href="/how-it-works" className="btn-secondary w-full sm:w-auto text-lg px-8 py-4 group">
              How it Works <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* VALUE PROPOSITION */}
      <section className="py-24 bg-[#1a1d2b]/50 border-y border-[#2a2d3d]">
        <div className="container">
          <div className="grid md:grid-cols-3 gap-12">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-brand-500/10 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-brand-400" />
              </div>
              <h3 className="text-xl font-bold text-white">Massive Prize Pools</h3>
              <p className="text-slate-400 leading-relaxed">
                40% of the pool goes to the 5-match jackpot. 35% to 4-matches. 25% to 3-matches. Unclaimed jackpots roll over.
              </p>
            </div>
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-pink-500/10 flex items-center justify-center">
                <HeartHandshake className="w-6 h-6 text-pink-400" />
              </div>
              <h3 className="text-xl font-bold text-white">Direct Charity Impact</h3>
              <p className="text-slate-400 leading-relaxed">
                You choose the charity. You choose the percentage (minimum 10%). Track your lifetime impact direct from your dashboard.
              </p>
            </div>
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                <Zap className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-white">Rolling 5-Score Tech</h3>
              <p className="text-slate-400 leading-relaxed">
                Your entries dynamically update. Only your last 5 Stableford scores at the time of the draw dictate your odds.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURED CHARITIES */}
      <section className="py-32 relative">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Play with Purpose</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Your subscription directly funds our charity partners. Here are a few featured causes you can support right now.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {featuredCharities?.map((charity) => (
              <div key={charity.id} className="card p-8 hover:bg-[#1a1d2b]/80 transition-colors flex flex-col">
                <div className="w-12 h-12 rounded-full bg-pink-500/20 flex items-center justify-center mb-6">
                  <HeartHandshake className="w-6 h-6 text-pink-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{charity.name}</h3>
                <p className="text-slate-400 mb-6 flex-1 line-clamp-3">{charity.description}</p>
                <Link href={`/charities/${charity.id}`} className="text-brand-400 font-medium hover:text-brand-300 transition-colors text-sm">
                  View Profile →
                </Link>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Link href="/charities" className="btn-secondary">
              Explore All Charities
            </Link>
          </div>
        </div>
      </section>

      {/* SECURITY / TRUST BANNER */}
      <section className="py-20 border-t border-[#2a2d3d] bg-black/40">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 bg-gradient-to-r from-[#1a1d2b] to-[#0f1117] p-8 md:p-12 rounded-3xl border border-[#2a2d3d]">
            <div className="flex items-start gap-5">
              <div className="w-12 h-12 rounded-2xl bg-brand-500/20 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-6 h-6 text-brand-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Secure & Transparent</h3>
                <p className="text-slate-400 max-w-md">
                  All draws are verified through our admin engine. Payouts and charity contributions are handled securely via Stripe.
                </p>
              </div>
            </div>
            <Link href="/pricing" className="btn-primary whitespace-nowrap">
              Get Started Today
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
