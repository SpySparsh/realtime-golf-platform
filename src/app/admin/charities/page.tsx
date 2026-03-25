"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, Edit2, Trash2, CheckCircle, XCircle, Loader2 } from "lucide-react";
import type { Charity } from "@/types/database";

export default function AdminCharitiesPage() {
  const [charities, setCharities] = useState<Charity[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form state
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  
  const supabase = createClient();

  useEffect(() => { fetchCharities(); }, []);

  async function fetchCharities() {
    setLoading(true);
    const { data } = await supabase.from("charities").select("*").order("name");
    setCharities(data ?? []);
    setLoading(false);
  }

  function resetForm() {
    setName("");
    setSlug("");
    setDescription("");
    setWebsiteUrl("");
    setContactEmail("");
    setIsActive(true);
    setIsFeatured(false);
    setEditingId(null);
    setIsFormOpen(false);
  }

  function startEdit(c: Charity) {
    setEditingId(c.id);
    setName(c.name);
    setSlug(c.slug);
    setDescription(c.description ?? "");
    setWebsiteUrl(c.website_url ?? "");
    setContactEmail(c.contact_email ?? "");
    setIsActive(c.is_active);
    setIsFeatured(c.is_featured);
    setIsFormOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name,
      slug,
      description,
      website_url: websiteUrl,
      contact_email: contactEmail,
      is_active: isActive,
      is_featured: isFeatured,
    };

    if (editingId) {
      await supabase.from("charities").update(payload).eq("id", editingId);
    } else {
      await supabase.from("charities").insert(payload);
    }
    resetForm();
    fetchCharities();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this charity? Caution: active subscriptions may rely on this.")) return;
    await supabase.from("charities").delete().eq("id", id);
    fetchCharities();
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Charity Management</h1>
          <p className="text-sm text-slate-400 mt-1">Add, edit, or deactivate charities on the platform.</p>
        </div>
        <button onClick={() => { resetForm(); setIsFormOpen(true); }} className="btn-primary">
          <Plus className="w-4 h-4" /> Add Charity
        </button>
      </div>

      {isFormOpen && (
        <form onSubmit={handleSubmit} className="card p-6 mb-8 border-t-2 border-brand-500">
          <h2 className="text-lg font-bold text-white mb-4">{editingId ? "Edit Charity" : "New Charity"}</h2>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="label">Name</label>
              <input type="text" required value={name} onChange={(e) => {
                setName(e.target.value);
                if (!editingId) setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''));
              }} className="input" />
            </div>
            <div>
              <label className="label">Slug (URL)</label>
              <input type="text" required value={slug} onChange={(e) => setSlug(e.target.value)} className="input" />
            </div>
          </div>
          <div className="mb-4">
            <label className="label">Description</label>
            <textarea required value={description} onChange={(e) => setDescription(e.target.value)} className="input min-h-[100px]" />
          </div>
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="label">Website URL</label>
              <input type="url" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">Contact Email</label>
              <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="input" />
            </div>
          </div>
          <div className="flex items-center gap-6 mb-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-4 h-4 accent-brand-500" />
              <span className="text-sm text-white">Active</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} className="w-4 h-4 accent-brand-500" />
              <span className="text-sm text-white">Featured (Shows on Homepage)</span>
            </label>
          </div>
          <div className="flex gap-3">
            <button type="submit" className="btn-primary">Save Charity</button>
            <button type="button" onClick={resetForm} className="btn-secondary">Cancel</button>
          </div>
        </form>
      )}

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
        ) : (
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-black/20 border-b border-[#2a2d3d] text-slate-400 uppercase text-xs">
              <tr>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Website</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2d3d]">
              {charities.map((c) => (
                <tr key={c.id} className="hover:bg-white/5">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                       {c.is_active ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
                       {c.is_featured && <span className="badge badge-green ml-2">Featured</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-semibold text-white">{c.name}</td>
                  <td className="px-6 py-4 text-brand-400">{c.website_url ?? "—"}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => startEdit(c)} className="btn-ghost p-2 text-slate-400 hover:text-white"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(c.id)} className="btn-ghost p-2 text-slate-400 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
              {charities.length === 0 && (
                <tr><td colSpan={4} className="p-8 text-center text-slate-500">No charities added yet.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
