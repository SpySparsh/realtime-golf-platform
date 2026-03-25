"use client";

import { Menu, X, LayoutDashboard, Target, Heart, Trophy, Settings, ShieldCheck, LogOut } from "lucide-react";
import type { Profile, Subscription, Charity } from "@/types/database";
import { formatPence, cn } from "@/lib/utils";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface HeaderProps {
  profile: Profile | null;
  subscription: (Subscription & { charity: Charity | null }) | null;
}

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/scores", label: "My Scores", icon: Target },
  { href: "/dashboard/charity", label: "My Charity", icon: Heart },
  { href: "/dashboard/draws", label: "Draws & Wins", icon: Trophy },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export default function DashboardHeader({ profile, subscription }: HeaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const status = subscription?.status;
  const isActive = status === "active";
  const isAdmin = profile?.is_admin ?? false;

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <>
      <header className="flex items-center justify-between px-6 py-4 border-b border-[#2a2d3d] bg-[#1a1d2b]/50 backdrop-blur-sm relative z-40">
        <div className="flex items-center gap-4">
          <button className="md:hidden text-slate-400 hover:text-white" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <h1 className="text-lg font-semibold text-white">
            Welcome back, {profile?.full_name?.split(" ")[0] ?? "Golfer"} 👋
          </h1>
        </div>

      <div className="flex items-center gap-3">
        {/* Subscription badge */}
        <span
          className={cn(
            "badge",
            isActive
              ? "badge-green"
              : status === "past_due"
              ? "badge-yellow"
              : "badge-red"
          )}
        >
          <span
            className={cn(
              "w-1.5 h-1.5 rounded-full",
              isActive ? "bg-brand-400" : status === "past_due" ? "bg-amber-400" : "bg-red-400"
            )}
          />
          {isActive
            ? "Active"
            : status === "past_due"
            ? "Past Due"
            : status === "cancelled"
            ? "Cancelled"
            : "Inactive"}
        </span>

        {/* Prize pool info */}
        {isActive && subscription && (
          <span className="hidden sm:flex items-center gap-1 text-xs text-slate-400">
            Pool contrib:{" "}
            <span className="text-brand-400 font-semibold">
              {formatPence(subscription.prize_pool_contribution_pence)}/mo
            </span>
          </span>
        )}
      </div>
      </header>

      {/* Mobile Nav Dropdown */}
      {isOpen && (
        <div className="md:hidden absolute top-[73px] left-0 w-full bg-[#1a1d2b] border-b border-[#2a2d3d] z-50 p-4 space-y-1 shadow-2xl">
          {navItems.map((item) => {
            const active = item.href === "/dashboard" 
              ? pathname === item.href 
              : pathname.startsWith(item.href);
              
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-150",
                  active
                    ? "bg-brand-500/15 text-brand-400 border border-brand-500/20"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                )}
              >
                <item.icon className={cn("w-4 h-4", active && "text-brand-400")} />
                {item.label}
              </Link>
            )
          })}
          
          {isAdmin && (
            <div className="pt-2 mt-2 border-t border-[#2a2d3d]">
              <Link
                href="/admin"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-slate-400 hover:text-amber-400 hover:bg-amber-500/5 transition-all duration-150"
              >
                <ShieldCheck className="w-4 h-4" /> Admin Panel
              </Link>
            </div>
          )}

          <div className="pt-2 mt-2 border-t border-[#2a2d3d]">
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/5 transition-all duration-150"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>
      )}
    </>
  );
}
