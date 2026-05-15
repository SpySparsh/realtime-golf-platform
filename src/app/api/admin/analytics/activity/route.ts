import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { withApiHandler } from "@/middlewares/api-handler";
import { requirePermission } from "@/middlewares/auth";
import { createAnalyticsService } from "@/modules/analytics.module";
import { ok } from "@/utils/api-response";

export const GET = withApiHandler(async (request: NextRequest) => {
  await requirePermission("admin:read");

  const analytics = createAnalyticsService(createAdminClient());
  const activity = await analytics.getActivityPage({
    from: request.nextUrl.searchParams.get("from"),
    to: request.nextUrl.searchParams.get("to"),
    page: Number(request.nextUrl.searchParams.get("page") ?? 1),
    pageSize: Number(request.nextUrl.searchParams.get("pageSize") ?? 25),
    refresh: request.nextUrl.searchParams.get("refresh") === "true",
  });

  return ok(activity, {
    headers: {
      "Cache-Control": "private, max-age=60, stale-while-revalidate=120",
    },
  });
});
