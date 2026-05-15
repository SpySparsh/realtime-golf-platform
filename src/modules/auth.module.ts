import { AuthAuditRepository } from "@/repositories/auth-audit.repository";
import { AuthService } from "@/services/auth.service";

export function createAuthService(supabase: any) {
  return new AuthService(supabase, new AuthAuditRepository(supabase));
}

