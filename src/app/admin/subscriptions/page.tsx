import { createClient } from "@/lib/supabase/server";
import { formatPence } from "@/lib/utils";
import { CreditCard, Search, ArrowRight } from "lucide-react";
import Link from "next/link";

export default async function AdminSubscriptionsPage() {
  const supabase = await createClient();

  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select(`
      *,
      profile:profiles(email, full_name),
      charity:charities(name)
    `)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Subscriptions</h1>
          <p className="text-sm text-slate-400 mt-1">Manage and view all platform subscriptions.</p>
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
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-black/20 border-b border-[#2a2d3d] text-slate-400 uppercase text-xs">
              <tr>
                <th className="px-6 py-4 font-medium">User</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Plan</th>
                <th className="px-6 py-4 font-medium">Amount</th>
                <th className="px-6 py-4 font-medium">Charity Split</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2d3d]">
              {subscriptions?.map((sub: any) => (
                <tr key={sub.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-semibold text-white">{sub.profile?.full_name ?? "Unknown"}</div>
                    <div className="text-slate-500 text-xs">{sub.profile?.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`badge ${
                      sub.status === "active" ? "badge-green" : 
                      sub.status === "past_due" ? "badge-yellow" : "badge-red"
                    }`}>
                      {sub.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap capitalize text-slate-300">
                    {sub.plan}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-white">
                    {formatPence(sub.amount_pence)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-brand-400 font-medium">{sub.charity_percentage}%</div>
                    <div className="text-slate-500 text-xs truncate max-w-[150px]" title={sub.charity?.name}>
                      {sub.charity?.name ?? "None"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <Link href={`/admin/users/${sub.user_id}`} className="p-2 btn-ghost inline-flex">
                      <ArrowRight className="w-4 h-4 text-slate-400" />
                    </Link>
                  </td>
                </tr>
              ))}
              {(!subscriptions || subscriptions.length === 0) && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    No subscriptions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
