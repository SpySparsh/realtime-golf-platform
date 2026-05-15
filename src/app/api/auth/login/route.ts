import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withApiHandler } from "@/middlewares/api-handler";
import { createAuthService } from "@/modules/auth.module";
import { ok } from "@/utils/api-response";
import { enforceRateLimit } from "@/utils/rate-limit";
import { getClientIp, getUserAgent } from "@/utils/security";
import { validateLoginInput } from "@/validators/auth.validator";

export const POST = withApiHandler(async (request: NextRequest) => {
  const ipAddress = getClientIp(request);
  enforceRateLimit(`auth:login:${ipAddress}`, { limit: 5, windowMs: 15 * 60 * 1000 });

  const supabase = await createClient();
  const input = validateLoginInput(await request.json());
  const authService = createAuthService(supabase);
  const result = await authService.login(input, {
    ipAddress,
    userAgent: getUserAgent(request),
  });

  return ok(result);
});

