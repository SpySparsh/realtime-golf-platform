import Link from "next/link";
import { CheckCircle2, Trophy, Target, HeartHandshake } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How It Works",
  description: "Learn how the Golf Charity Platform works: scoring, draws, and charity donations.",
};

export default function HowItWorksPage() {
  const steps = [
    {
      icon: <Target className="w-6 h-6 text-brand-400" />,
      title: "1. Play & Record Your Scores",
      desc: "Every time you play, log your Stableford score (1–45 pts). We keep your last 5 scores on a rolling basis. These 5 numbers form your unique entry into the monthly draw.",
    },
    {
      icon: <HeartHandshake className="w-6 h-6 text-pink-400" />,
      title: "2. Support Your Charity",
      desc: "A minimum of 10% of your subscription goes directly to your chosen charity. You can increase this percentage anytime from your dashboard. The rest funds the prize pool.",
    },
    {
      icon: <Trophy className="w-6 h-6 text-amber-400" />,
      title: "3. Win the Monthly Draw",
      desc: "On the 1st of every month, 5 numbers are drawn. Match your rolling 5 scores against the draw. 3 matches wins 25% of the pool. 4 matches wins 35%. Match all 5 to hit the 40% jackpot!",
    },
  ];

  return (
    <div className="min-h-screen bg-[#0f1117] pt-32 pb-24">
      <div className="container max-w-4xl animate-fade-in">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-4">
            How it Works
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            The platform is simple. Play golf, enter your scores, support amazing charities, and win real cash prizes every month.
          </p>
        </div>

        <div className="space-y-8 mb-20">
          {steps.map((step, i) => (
            <div key={i} className="flex flex-col md:flex-row gap-6 p-8 rounded-3xl bg-[#1a1d2b] border border-[#2a2d3d]">
              <div className="w-16 h-16 rounded-2xl bg-[#0f1117] flex items-center justify-center flex-shrink-0 border border-[#2a2d3d]">
                {step.icon}
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white mb-3">{step.title}</h3>
                <p className="text-slate-400 leading-relaxed text-lg">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <div className="card p-8 border-t-4 border-t-amber-500">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              Prize Pool Breakdown
            </h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-ambeer-400 flex-shrink-0 text-amber-500 mt-0.5" />
                <div>
                  <strong className="text-white block">5-Match Jackpot (40%)</strong>
                  <span className="text-slate-400 text-sm">If not won, the 40% rolls over to next month's jackpot!</span>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-brand-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block">4-Match Tier (35%)</strong>
                  <span className="text-slate-400 text-sm">Split equally among all 4-match winners. Guaranteed payout.</span>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block">3-Match Tier (25%)</strong>
                  <span className="text-slate-400 text-sm">Split equally among all 3-match winners. Guaranteed payout.</span>
                </div>
              </li>
            </ul>
          </div>

          <div className="card p-8 border-t-4 border-t-pink-500">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <HeartHandshake className="w-5 h-5 text-pink-400" />
              Charity Impact
            </h3>
            <div className="space-y-4 text-slate-400">
              <p>
                Traditional lotteries give around 20-25% to charity. <strong className="text-white">Our players dictate the impact.</strong>
              </p>
              <p>
                By default, 10% of your subscription goes directly to your selected charity. But you can use the slider in your dashboard to give up to 100% of your fee to charity (excluding yourself from the prize pool entirely).
              </p>
              <p className="p-4 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-100 text-sm">
                Every month, funds are transferred securely to the charities. You can track your lifetime contribution directly in your dashboard.
              </p>
            </div>
          </div>
        </div>

        <div className="text-center">
          <Link href="/pricing" className="btn-primary text-lg px-10 py-4 shadow-xl shadow-brand-500/20">
            Start Your Subscription
          </Link>
        </div>
      </div>
    </div>
  );
}
