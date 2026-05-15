import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { withApiHandler } from "@/middlewares/api-handler";
import { requirePermission } from "@/middlewares/auth";
import { createAnalyticsService } from "@/modules/analytics.module";
import { ok } from "@/utils/api-response";

export const GET = withApiHandler(async (request: NextRequest) => {
  await requirePermission("admin:read");

  const analytics = createAnalyticsService(createAdminClient());
  const dashboard = await analytics.getDashboard({
    from: request.nextUrl.searchParams.get("from"),
    to: request.nextUrl.searchParams.get("to"),
    refresh: request.nextUrl.searchParams.get("refresh") === "true",
  });

  return ok(dashboard, {
    headers: {
      "Cache-Control": "private, max-age=60, stale-while-revalidate=120",
    },
  });
});
