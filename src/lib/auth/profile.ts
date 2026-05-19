import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

export async function ensureUserProfile(user: User) {
  const admin: any = createAdminClient();
  const { data: existing, error: fetchError } = await admin
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (existing) return existing;

  const fullName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : null;

  const { data, error } = await admin
    .from("profiles")
    .insert({
      id: user.id,
      email: user.email ?? "",
      full_name: fullName,
      display_name: null,
      avatar_url: null,
      phone: null,
      is_admin: false,
      country: "GB",
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
