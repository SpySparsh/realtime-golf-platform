import { metricsContentType, renderMetrics } from "@/observability/metrics";

export const dynamic = "force-dynamic";

export async function GET() {
  return new Response(await renderMetrics(), {
    headers: {
      "content-type": metricsContentType(),
    },
  });
}
