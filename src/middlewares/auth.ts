import { createClient } from "@/lib/supabase/server";
import { unauthorized, forbidden } from "@/utils/app-error";

export async function getAuthenticatedContext() {
  const supabase: any = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw unauthorized();
  return { supabase, user };
}

export async function getAdminContext() {
  const context = await getAuthenticatedContext();
  const { data: profile } = await context.supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", context.user.id)
    .single();

  if (!profile?.is_admin) throw forbidden("Admin access required");
  return context;
}

