"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Plus, Trash2, Edit2, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import type { Score } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function ScoresPage() {
  const [scores, setScores] = useState<Score[]>([]);
  const [loading, setLoading] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [scoreVal, setScoreVal] = useState("");
  const [playedOn, setPlayedOn] = useState(format(new Date(), "yyyy-MM-dd"));
  const [notes, setNotes] = useState("");

  async function fetchScores() {
    const res = await fetch("/api/scores");
    const data = await res.json();
    setScores(Array.isArray(data) ? data : []);
    
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: sub } = await supabase.from("subscriptions").select("status").eq("user_id", user.id).single();
      setIsActive(sub?.status === "active");
    }
    
    setLoading(false);
  }

  useEffect(() => { fetchScores(); }, []);

  function startEdit(score: Score) {
    setEditingId(score.id);
    setScoreVal(String(score.score));
    setPlayedOn(score.played_on);
    setNotes(score.notes ?? "");
  }

  function cancelEdit() {
    setEditingId(null);
    setScoreVal("");
    setPlayedOn(format(new Date(), "yyyy-MM-dd"));
    setNotes("");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const body = { score: Number(scoreVal), played_on: playedOn, notes: notes || undefined };
    const url = editingId ? `/api/scores/${editingId}` : "/api/scores";
    const method = editingId ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json();
      setError(err.error ?? "Something went wrong");
      setSubmitting(false);
      return;
    }

    setSuccess(editingId ? "Score updated!" : "Score added!");
    setTimeout(() => setSuccess(null), 3000);
    cancelEdit();
    fetchScores();
    setSubmitting(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this score?")) return;
    await fetch(`/api/scores/${id}`, { method: "DELETE" });
    fetchScores();
  }

  return (
    <div className="max-w-2xl space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">My Golf Scores</h1>
        <p className="text-slate-400 text-sm mt-1">
          Enter your Stableford scores (1–45). Only your latest 5 are kept — the oldest is
          replaced automatically when you add a 6th.
        </p>
      </div>

      {/* Subscriber Lockout Banner */}
      {!loading && !isActive && (
        <div className="card p-6 border-t-2 border-amber-500 bg-amber-500/5">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold text-white">Active Subscription Required</h2>
          </div>
          <p className="text-sm text-slate-300 mb-4">
            You must have an active subscription to submit scores and enter the monthly draw.
          </p>
          <Link href="/pricing" className="btn-primary inline-flex py-2 px-4 text-sm">
            View Plans
          </Link>
        </div>
      )}

      {/* Score form */}
      <div className={`card p-6 ${!isActive ? "opacity-50 pointer-events-none" : ""}`}>
        <h2 className="text-base font-semibold text-white mb-4">
          {editingId ? "Edit Score" : "Add New Score"}
        </h2>

        {error && (
          <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 text-sm">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Stableford Score (1–45)</label>
              <input
                type="number"
                min={1}
                max={45}
                required
                value={scoreVal}
                onChange={(e) => setScoreVal(e.target.value)}
                className="input"
                placeholder="e.g. 32"
              />
            </div>
            <div>
              <label className="label">Date Played</label>
              <input
                type="date"
                required
                value={playedOn}
                onChange={(e) => setPlayedOn(e.target.value)}
                className="input"
                max={format(new Date(), "yyyy-MM-dd")}
              />
            </div>
          </div>
          <div>
            <label className="label">Notes (optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input"
              placeholder="Course name, conditions, etc."
            />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={submitting || !scoreVal} className="btn-primary">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {editingId ? "Update Score" : "Add Score"}
            </button>
            {editingId && (
              <button type="button" onClick={cancelEdit} className="btn-secondary">
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Scores list */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-[#2a2d3d] flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">Score History</h2>
          <span className="badge badge-green">{scores.length}/5 scores</span>
        </div>
        {loading ? (
          <div className="p-8 text-center text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
            Loading scores…
          </div>
        ) : (scores || []).length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No scores yet. Add your first round above!
          </div>
        ) : (
          <div className="divide-y divide-[#2a2d3d]">
            {(scores || []).map((s, i) => (
              <div key={s.id} className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center text-xs font-bold text-brand-400">
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{s.score} pts</p>
                    <p className="text-xs text-slate-400">
                      {new Date(s.played_on).toLocaleDateString("en-GB", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                    {s.notes && <p className="text-xs text-slate-500 mt-0.5">{s.notes}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => startEdit(s)}
                    className="btn-ghost p-2"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="btn-ghost p-2 hover:text-red-400"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
