import { createClient } from "@/lib/supabase/server";
import { AuthAuditRepository } from "@/repositories/auth-audit.repository";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getClientIp, getUserAgent, sanitizeRedirectPath } from "@/utils/security";

/**
 * Auth callback route — Supabase redirects here after email confirmation.
 * Exchanges the one-time code for a session and redirects to the dashboard.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = sanitizeRedirectPath(searchParams.get("next") ?? "/dashboard");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const auditRepository = new AuthAuditRepository(supabase);
      await auditRepository.record({
        event_type: "email_verified",
        user_id: user?.id,
        email: user?.email,
        ip_address: getClientIp(request),
        user_agent: getUserAgent(request),
        success: true,
      });
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Something went wrong — redirect to login with error
  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`);
}
