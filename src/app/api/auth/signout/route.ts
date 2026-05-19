import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAuthService } from "@/modules/auth.module";
import { getClientIp, getUserAgent } from "@/utils/security";
import { applySecurityHeaders } from "@/security/headers";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const authService = createAuthService(supabase);
  try {
    await authService.logout({
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });
  } catch (error) {
    await supabase.auth.signOut();
    console.error("[auth] signout cleanup failed", error);
  }

  return applySecurityHeaders(NextResponse.json({ success: true, redirectTo: "/" }));
}
