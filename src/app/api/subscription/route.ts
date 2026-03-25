import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * GET /api/subscription
 * Returns the current user's subscription with charity details.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("subscriptions")
    .select(`*, charity:charities(*)`)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

/**
 * PATCH /api/subscription
 * Allows users to update their charity selection and contribution percentage.
 */
export async function PATCH(request: NextRequest) {
  // @ts-ignore - Bypass Supabase local schema typings mismatch
  const supabase: any = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { charity_id, charity_percentage } = body as {
    charity_id?: string;
    charity_percentage?: number;
  };

  if (
    charity_percentage !== undefined &&
    (charity_percentage < 10 || charity_percentage > 100)
  ) {
    return NextResponse.json({ error: "Charity percentage must be 10–100" }, { status: 400 });
  }

  const updatePayload: Record<string, unknown> = {};
  if (charity_id !== undefined) updatePayload.charity_id = charity_id;
  if (charity_percentage !== undefined) updatePayload.charity_percentage = charity_percentage;

  const { data, error } = await supabase
    .from("subscriptions")
    .update(updatePayload)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
