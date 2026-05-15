import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/infrastructure/config/env";
import { getRedisConnection } from "@/infrastructure/redis/redis.client";

export const dynamic = "force-dynamic";

async function checkRedis() {
  if (!env.redisUrl) return { status: "skipped", reason: "REDIS_URL not configured" };
  await getRedisConnection().ping();
  return { status: "ok" };
}

async function checkSupabase() {
  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
    return { status: "skipped", reason: "Supabase admin environment not configured" };
  }

  const { error } = await createAdminClient()
    .from("profiles")
    .select("id", { count: "exact", head: true });

  if (error) throw error;
  return { status: "ok" };
}

export async function GET() {
  const checks = await Promise.allSettled([checkRedis(), checkSupabase()]);
  const [redis, supabase] = checks.map((check) =>
    check.status === "fulfilled"
      ? check.value
      : { status: "error", error: check.reason instanceof Error ? check.reason.message : "Unknown error" }
  );
  const ready = [redis, supabase].every((check) => check.status === "ok" || check.status === "skipped");

  return Response.json(
    {
      status: ready ? "ready" : "not_ready",
      checks: { redis, supabase },
      timestamp: new Date().toISOString(),
    },
    { status: ready ? 200 : 503 }
  );
}
