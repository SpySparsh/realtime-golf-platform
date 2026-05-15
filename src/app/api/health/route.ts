import { ok } from "@/utils/api-response";

export const dynamic = "force-dynamic";

export async function GET() {
  return ok({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
  });
}
