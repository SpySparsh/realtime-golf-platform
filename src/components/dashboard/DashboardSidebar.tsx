"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Target,
  Heart,
  Trophy,
  Settings,
  ShieldCheck,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Profile } from "@/types/database";

interface SidebarProps {
  profile: Profile | null;
  isAdmin: boolean;
}

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/scores", label: "My Scores", icon: Target },
  { href: "/dashboard/charity", label: "My Charity", icon: Heart },
  { href: "/dashboard/draws", label: "Draws & Wins", icon: Trophy },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export default function DashboardSidebar({ profile, isAdmin }: SidebarProps) {
  const pathname = usePathname();

  async function handleSignOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    window.location.href = "/";
  }

  return (
    <aside className="hidden md:flex flex-col w-64 bg-[#1a1d2b] border-r border-[#2a2d3d] min-h-screen">
      {/* Logo */}
      <div className="p-6 border-b border-[#2a2d3d]">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold text-white">
            ⛳ Golf<span className="text-brand-400">Charity</span>
          </span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group",
                active
                  ? "bg-brand-500/15 text-brand-400 border border-brand-500/20"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              )}
            >
              <item.icon className={cn("w-4 h-4 flex-shrink-0", active ? "text-brand-400" : "")} />
              {item.label}
              {active && <ChevronRight className="w-3 h-3 ml-auto text-brand-400" />}
            </Link>
          );
        })}

        {/* Admin link */}
        {isAdmin && (
          <div className="pt-4 mt-4 border-t border-[#2a2d3d]">
            <Link
              href="/admin"
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                pathname.startsWith("/admin")
                  ? "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                  : "text-slate-400 hover:text-amber-400 hover:bg-amber-500/5"
              )}
            >
              <ShieldCheck className="w-4 h-4" />
              Admin Panel
            </Link>
          </div>
        )}
      </nav>

      {/* User + Sign out */}
      <div className="p-4 border-t border-[#2a2d3d]">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center flex-shrink-0">
            <span className="text-brand-400 text-xs font-bold">
              {(profile?.full_name ?? profile?.email ?? "U").charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {profile?.full_name ?? "Golfer"}
            </p>
            <p className="text-xs text-slate-500 truncate">{profile?.email ?? ""}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/5 transition-all duration-150"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
