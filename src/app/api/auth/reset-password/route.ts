import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withApiHandler } from "@/middlewares/api-handler";
import { createAuthService } from "@/modules/auth.module";
import { ok } from "@/utils/api-response";
import { getClientIp, getUserAgent } from "@/utils/security";
import { validateResetPasswordInput } from "@/validators/auth.validator";

export const POST = withApiHandler(async (request: NextRequest) => {
  const supabase = await createClient();
  const input = validateResetPasswordInput(await request.json());
  const authService = createAuthService(supabase);
  const result = await authService.resetPassword(input, {
    ipAddress: getClientIp(request),
    userAgent: getUserAgent(request),
  });

  return ok(result);
});

