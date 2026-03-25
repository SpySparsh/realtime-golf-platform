"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Users,
  CreditCard,
  Heart,
  Trophy,
  Award,
  LogOut,
  ChevronRight,
  ArrowLeft
} from "lucide-react";

const navItems = [
  { href: "/admin", label: "Analytics", icon: BarChart3, exact: true },
  { href: "/admin/users", label: "Users & Scores", icon: Users },
  { href: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard },
  { href: "/admin/charities", label: "Charities", icon: Heart },
  { href: "/admin/draws", label: "Draws Engine", icon: Trophy },
  { href: "/admin/winners", label: "Winners & Payouts", icon: Award },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  async function handleSignOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    window.location.href = "/";
  }

  return (
    <aside className="hidden md:flex flex-col w-64 bg-[#1a1d2b] border-r border-[#2a2d3d] min-h-screen">
      <div className="p-6 border-b border-[#2a2d3d]">
        <Link href="/admin" className="flex items-center gap-2">
          <span className="text-xl font-bold text-amber-400">
            GC Admin
          </span>
        </Link>
      </div>

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
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                active
                  ? "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              )}
            >
              <item.icon className={cn("w-4 h-4 flex-shrink-0", active ? "text-amber-400" : "")} />
              {item.label}
              {active && <ChevronRight className="w-3 h-3 ml-auto text-amber-400" />}
            </Link>
          );
        })}

        <div className="pt-4 mt-4 border-t border-[#2a2d3d]">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all duration-150"
          >
            <ArrowLeft className="w-4 h-4" />
            Exit Admin
          </Link>
        </div>
      </nav>

      <div className="p-4 border-t border-[#2a2d3d]">
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
