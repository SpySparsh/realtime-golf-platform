"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/admin")) return null;

  return (
    <footer className="border-t border-[#2a2d3d] bg-[#0f1117] py-12 text-slate-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="inline-block text-xl font-bold text-white mb-4">
              Golf<span className="text-brand-400">Charity</span>
            </Link>
            <p className="text-sm max-w-sm">
              The platform combining golf performance tracking, massive monthly prize draws, and direct charitable giving. Play. Win. Give.
            </p>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-4">Platform</h3>
            <ul className="space-y-3 text-sm">
              <li><Link href="/how-it-works" className="hover:text-brand-400 transition-colors">How it Works</Link></li>
              <li><Link href="/charities" className="hover:text-brand-400 transition-colors">Charity Directory</Link></li>
              <li><Link href="/pricing" className="hover:text-brand-400 transition-colors">Pricing & Plans</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-4">Support</h3>
            <ul className="space-y-3 text-sm">
              <li><Link href="/auth/login" className="hover:text-brand-400 transition-colors">Sign In</Link></li>
              <li><Link href="/faq" className="hover:text-brand-400 transition-colors">FAQ</Link></li>
              <li><Link href="/contact" className="hover:text-brand-400 transition-colors">Contact / Support</Link></li>
              <li><Link href="/terms" className="hover:text-brand-400 transition-colors">Terms of Service</Link></li>
              <li><Link href="/privacy" className="hover:text-brand-400 transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>
        <div className="pt-8 mt-8 border-t border-[#2a2d3d] text-sm flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>© {new Date().getFullYear()} Golf Charity. All rights reserved.</p>
          <p>Built for the Digital Heroes Trainee Assignment.</p>
        </div>
      </div>
    </footer>
  );
}
