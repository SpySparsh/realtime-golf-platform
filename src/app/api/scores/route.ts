import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * GET  /api/scores       — Returns the authenticated user's scores (ordered newest first).
 * POST /api/scores       — Inserts a new score. DB trigger handles rolling-5 enforcement.
 * DELETE /api/scores/[id] — Deletes a specific score. Handled in /api/scores/[id]/route.ts
 */

export async function GET() {
  // @ts-ignore - Bypass Supabase local schema typings mismatch
  const supabase: any = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("scores")
    .select("*")
    .eq("user_id", user.id)
    .order("played_on", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  // @ts-ignore - Bypass Supabase local schema typings mismatch
  const supabase: any = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { score, played_on, notes } = body as {
    score: number;
    played_on: string;
    notes?: string;
  };

  if (!score || score < 1 || score > 45) {
    return NextResponse.json({ error: "Score must be between 1 and 45" }, { status: 400 });
  }

  if (!played_on) {
    return NextResponse.json({ error: "played_on date is required" }, { status: 400 });
  }

  // Insert — the DB trigger enforce_rolling_5_scores_trigger handles rolling-5 logic
  const { data, error } = await supabase
    .from("scores")
    .insert({ user_id: user.id, score, played_on, notes: notes ?? null })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
