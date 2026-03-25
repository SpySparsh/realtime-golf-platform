"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Menu, X, LogOut, ShieldCheck } from "lucide-react";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function Navbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const u = data?.user ?? null;
      setUser(u);
      if (u) {
        supabase.from('profiles').select('is_admin').eq('id', u.id).single()
          .then(({ data: profile }) => setIsAdmin(profile?.is_admin ?? false));
      }
    });
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(false);
    window.location.href = "/";
  }

  // Don't show public navbar on dashboard pages
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/admin")) return null;

  const links = [
    { href: "/charities", label: "Charities" },
    { href: "/how-it-works", label: "How it Works" },
    { href: "/pricing", label: "Pricing" },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#0f1117]/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-2xl font-bold text-white tracking-tight">
              Golf<span className="text-brand-400">Charity</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <div className="flex gap-6">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-white",
                    pathname.startsWith(l.href) ? "text-white" : "text-slate-400"
                  )}
                >
                  {l.label}
                </Link>
              ))}
            </div>
            <div className="flex items-center gap-4 border-l border-white/10 pl-8">
              {user ? (
                <>
                  {isAdmin && (
                    <Link href="/admin" className="text-sm font-medium text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1">
                      <ShieldCheck className="w-4 h-4" /> Admin
                    </Link>
                  )}
                  <Link href="/dashboard" className="text-sm font-medium text-brand-400 hover:text-brand-300 transition-colors">
                    Dashboard
                  </Link>
                  <button onClick={handleSignOut} className="text-sm font-medium text-slate-400 hover:text-red-400 transition-colors flex items-center gap-1">
                    <LogOut className="w-4 h-4" /> Log Out
                  </button>
                </>
              ) : (
                <>
                  <Link href="/auth/login" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
                    Sign In
                  </Link>
                  <Link href="/auth/register" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
                    Sign Up
                  </Link>
                </>
              )}
              <Link href="/donate" className="text-sm font-medium text-pink-400 hover:text-pink-300 transition-colors">
                Donate Once
              </Link>
              <Link href="/pricing" className="btn-primary py-2.5 px-5">
                Start Playing
              </Link>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-slate-400 hover:text-white"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {isOpen && (
        <div className="md:hidden border-t border-white/5 bg-[#0f1117] px-4 py-6 space-y-4">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setIsOpen(false)}
              className="block text-lg font-medium text-slate-300 hover:text-white"
            >
              {l.label}
            </Link>
          ))}
          <div className="pt-4 mt-4 border-t border-white/10 flex flex-col gap-3">
            {user ? (
               <>
                 {isAdmin && (
                   <Link onClick={() => setIsOpen(false)} href="/admin" className="btn-secondary w-full text-amber-400">
                     Admin Panel
                   </Link>
                 )}
                 <Link onClick={() => setIsOpen(false)} href="/dashboard" className="btn-secondary w-full text-brand-400">
                   Dashboard
                 </Link>
                 <button onClick={() => { setIsOpen(false); handleSignOut(); }} className="btn-secondary w-full text-red-400">
                   Log Out
                 </button>
               </>
            ) : (
               <>
                 <Link onClick={() => setIsOpen(false)} href="/auth/login" className="btn-secondary w-full">
                   Sign In
                 </Link>
                 <Link onClick={() => setIsOpen(false)} href="/auth/register" className="btn-secondary w-full">
                   Sign Up
                 </Link>
               </>
            )}
            <Link onClick={() => setIsOpen(false)} href="/donate" className="btn-secondary w-full text-pink-400">
              Donate Once
            </Link>
            <Link onClick={() => setIsOpen(false)} href="/pricing" className="btn-primary w-full">
              Start Playing
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
