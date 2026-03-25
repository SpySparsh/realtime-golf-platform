import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Heart, Globe, Calendar, ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await props.params;
  const supabase = await createClient();
  const { data: charity } = await supabase.from("charities").select("name, description").eq("slug", slug).single();
  
  if (!charity) return {};
  return {
    title: `${charity.name} | Charity Partner`,
    description: charity.description?.substring(0, 160) ?? "",
  };
}

export default async function CharityProfilePage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const supabase = await createClient();
  
  const { data: charity } = await supabase
    .from("charities")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!charity) notFound();

  const events = (charity.upcoming_events as any[]) ?? [];

  return (
    <div className="min-h-screen bg-[#0f1117] pt-24 pb-24">
      <div className="container max-w-4xl animate-fade-in">
        <Link href="/charities" className="inline-flex items-center gap-2 text-sm text-brand-400 hover:text-brand-300 font-medium mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to Directory
        </Link>
        
        <div className="card p-8 md:p-12 border-t-4 border-t-pink-500 mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-8">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-3xl bg-pink-500/10 flex items-center justify-center flex-shrink-0">
                <Heart className="w-10 h-10 text-pink-400" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-2">
                  {charity.name}
                </h1>
                {charity.is_featured && <span className="badge badge-green">Featured Partner</span>}
              </div>
            </div>
            
            <Link href={`/pricing?charity=${charity.id}`} className="btn-primary flex-shrink-0 self-start md:self-auto">
              Support this Charity
            </Link>
          </div>

          <div className="prose prose-invert max-w-none text-slate-300">
            <p className="text-lg leading-relaxed">{charity.description}</p>
          </div>

          {charity.website_url && (
            <div className="mt-8 pt-8 border-t border-[#2a2d3d]">
              <a href={charity.website_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-brand-400 hover:text-brand-300">
                <Globe className="w-4 h-4" /> Visit official website
              </a>
            </div>
          )}
        </div>

        {events.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white mb-6">Upcoming Charity Events</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {events.map((event: any, i: number) => (
                <div key={i} className="card p-6 border-l-4 border-l-brand-500">
                  <div className="flex items-center gap-2 text-xs font-semibold text-brand-400 mb-2">
                    <Calendar className="w-4 h-4" />
                    {new Date(event.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{event.title}</h3>
                  <p className="text-sm text-slate-400 mb-3">{event.description}</p>
                  <p className="text-xs font-medium px-2.5 py-1 rounded bg-[#0f1117] border border-[#2a2d3d] inline-block text-slate-300">
                    📍 {event.location}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
