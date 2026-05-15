import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withApiHandler } from "@/middlewares/api-handler";
import { createAuthService } from "@/modules/auth.module";
import { ok } from "@/utils/api-response";
import { enforceRateLimit } from "@/utils/rate-limit";
import { getClientIp, getUserAgent } from "@/utils/security";
import { validateForgotPasswordInput } from "@/validators/auth.validator";

export const POST = withApiHandler(async (request: NextRequest) => {
  const ipAddress = getClientIp(request);
  enforceRateLimit(`auth:forgot:${ipAddress}`, { limit: 3, windowMs: 60 * 60 * 1000 });

  const supabase = await createClient();
  const input = validateForgotPasswordInput(await request.json());
  const authService = createAuthService(supabase);
  const result = await authService.requestPasswordReset(input, {
    ipAddress,
    userAgent: getUserAgent(request),
  });

  return ok(result);
});

