import { createClient } from "@/lib/supabase/server";
import { unauthorized, forbidden } from "@/utils/app-error";

export type Role = "admin" | "subscriber" | "user";
export type Permission =
  | "admin:read"
  | "admin:write"
  | "draw:execute"
  | "score:write"
  | "subscription:manage";

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

export async function requireRole(role: Role) {
  const context = await getAuthenticatedContext();
  const { data: profile } = await context.supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", context.user.id)
    .single();

  if (role === "admin" && !profile?.is_admin) {
    throw forbidden("Admin access required");
  }

  if (role === "subscriber") {
    const { data: subscription } = await context.supabase
      .from("subscriptions")
      .select("status")
      .eq("user_id", context.user.id)
      .maybeSingle();

    if (subscription?.status !== "active") {
      throw forbidden("Active subscription required");
    }
  }

  return context;
}

export async function requirePermission(permission: Permission) {
  if (permission.startsWith("admin:") || permission === "draw:execute") {
    return getAdminContext();
  }

  if (permission === "score:write" || permission === "subscription:manage") {
    return getAuthenticatedContext();
  }

  throw forbidden("Permission denied");
}
