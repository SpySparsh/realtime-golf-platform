import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Heart, Globe, CalendarDays } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Charity Directory",
  description: "Browse our partner charities. Find a cause to support with your golf subscription.",
};

export default async function CharitiesPage() {
  const supabase = await createClient();
  const { data: charities } = await supabase
    .from("charities")
    .select("*")
    .eq("is_active", true)
    .order("is_featured", { ascending: false })
    .order("name", { ascending: true });

  return (
    <div className="min-h-screen bg-[#0f1117] pt-32 pb-24">
      <div className="container max-w-5xl animate-fade-in">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-4">
            Our Charity Partners
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Choose exactly where your contribution goes. A minimum of 10% of every subscription goes directly to the causes below.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {charities?.map((charity) => (
            <Link
              href={`/charities/${charity.slug}`}
              key={charity.id}
              className="group block card p-6 hover:border-brand-500/50 transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-16 h-16 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center group-hover:bg-pink-500/20 transition-colors">
                  <Heart className="w-8 h-8 text-pink-400" />
                </div>
                {charity.is_featured && (
                  <span className="badge badge-green">Featured</span>
                )}
              </div>
              
              <h2 className="text-xl font-bold text-white mb-2 group-hover:text-brand-400 transition-colors">
                {charity.name}
              </h2>
              <p className="text-slate-400 text-sm line-clamp-3 mb-6">
                {charity.description}
              </p>

              <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
                {charity.website_url && (
                  <span className="flex items-center gap-1.5">
                    <Globe className="w-4 h-4" /> Website
                  </span>
                )}
                {charity.upcoming_events && (charity.upcoming_events as any[]).length > 0 && (
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="w-4 h-4" /> {(charity.upcoming_events as any[]).length} Events
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
