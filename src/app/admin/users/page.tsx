import { createClient } from "@/lib/supabase/server";
import { Search, UserCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

export default async function AdminUsersPage() {
  const supabase = await createClient();

  // Fetch profiles with their latest subscription status
  const { data: users } = await supabase
    .from("profiles")
    .select(`
      *,
      subscriptions(status, plan)
    `)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="text-sm text-slate-400 mt-1">Manage user accounts and view their scores.</p>
        </div>
        
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search users..." 
            className="input pl-10 w-full md:w-64"
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-black/20 border-b border-[#2a2d3d] text-slate-400 uppercase text-xs">
              <tr>
                <th className="px-6 py-4 font-medium">User Profile</th>
                <th className="px-6 py-4 font-medium">Role</th>
                <th className="px-6 py-4 font-medium">Subscription</th>
                <th className="px-6 py-4 font-medium">Joined</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2d3d]">
              {users?.map((user: any) => {
                const sub = user.subscriptions?.[0];
                return (
                  <tr key={user.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center font-bold text-sm">
                          {user.full_name ? user.full_name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-white">{user.full_name ?? "Missing Name"}</div>
                          <div className="text-slate-500 text-xs">{user.email}</div>
                          <div className="text-slate-500 text-xs">{user.phone ?? "No phone"}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.is_admin ? (
                        <span className="badge badge-yellow">Admin</span>
                      ) : (
                        <span className="badge badge-blue">Player</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {sub ? (
                        <div>
                           <span className={`badge ${sub.status === 'active' ? 'badge-green' : 'badge-red'}`}>
                             {sub.status}
                           </span>
                           <span className="text-slate-400 text-xs ml-2 capitalize">{sub.plan}</span>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-xs italic">No subscription</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-400 text-sm">
                      {format(new Date(user.created_at), "MMM d, yyyy")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                       <Link href={`/admin/users/${user.id}`} className="p-2 btn-ghost inline-flex hover:text-brand-400">
                          <ArrowRight className="w-4 h-4" />
                       </Link>
                    </td>
                  </tr>
                );
              })}
              {(!users || users.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    <UserCircle className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    No users found.
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
