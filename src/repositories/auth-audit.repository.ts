export type AuthAuditEvent =
  | "login_attempt"
  | "login_success"
  | "login_failed"
  | "register_attempt"
  | "register_success"
  | "register_failed"
  | "forgot_password_requested"
  | "password_reset_success"
  | "logout"
  | "email_verified"
  | "session_refreshed"
  | "session_invalidated";

export class AuthAuditRepository {
  constructor(private readonly supabase: any) {}

  async record(event: {
    event_type: AuthAuditEvent;
    user_id?: string | null;
    email?: string | null;
    ip_address?: string | null;
    user_agent?: string | null;
    success: boolean;
    metadata?: Record<string, unknown>;
  }) {
    try {
      await this.supabase.from("auth_audit_logs").insert({
        event_type: event.event_type,
        user_id: event.user_id ?? null,
        email: event.email ?? null,
        ip_address: event.ip_address ?? null,
        user_agent: event.user_agent ?? null,
        success: event.success,
        metadata: event.metadata ?? {},
      });
    } catch (error) {
      console.error("[auth-audit] failed to record event", error);
    }
  }
}

