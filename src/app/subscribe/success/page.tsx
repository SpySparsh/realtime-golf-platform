import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { createStripeService } from "@/modules/stripe.module";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CheckCircle } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Subscription Confirmed" };

export default async function SubscribeSuccessPage(props: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await props.searchParams;

  if (!session_id) redirect("/pricing");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  let plan = "monthly";
  try {
    const stripeService = createStripeService(createAdminClient());
    const subscription = await stripeService.reconcileCheckoutSession(session_id, user.id);
    plan = subscription?.plan ?? "monthly";
  } catch {
    // Non-fatal: Stripe will retry the webhook if return-page reconciliation fails.
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#0f1117]">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-brand-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative text-center max-w-md animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-brand-400" />
        </div>

        <h1 className="text-3xl font-bold text-white mb-3">You&apos;re in!</h1>
        <p className="text-slate-400 mb-2">
          Your <span className="text-brand-400 font-semibold capitalize">{plan}</span> subscription
          is now active.
        </p>
        <p className="text-slate-500 text-sm mb-8">
          You&apos;re automatically entered into next month&apos;s prize draw. Add your golf
          scores to improve your odds.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/dashboard" className="btn-primary">
            Go to Dashboard
          </Link>
          <Link href="/dashboard/scores" className="btn-secondary">
            Enter Scores
          </Link>
        </div>
      </div>
    </div>
  );
}
