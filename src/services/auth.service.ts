import { env } from "@/infrastructure/config/env";
import { AuthAuditRepository } from "@/repositories/auth-audit.repository";
import { AppError } from "@/utils/app-error";
import { sanitizeRedirectPath } from "@/utils/security";
import type {
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from "@/validators/auth.validator";

type RequestMeta = {
  ipAddress: string;
  userAgent: string;
};

export class AuthService {
  constructor(
    private readonly supabase: any,
    private readonly auditRepository: AuthAuditRepository
  ) {}

  async login(input: LoginInput, meta: RequestMeta) {
    await this.auditRepository.record({
      event_type: "login_attempt",
      email: input.email,
      ip_address: meta.ipAddress,
      user_agent: meta.userAgent,
      success: true,
    });

    const { data, error } = await this.supabase.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });

    if (error) {
      await this.auditRepository.record({
        event_type: "login_failed",
        email: input.email,
        ip_address: meta.ipAddress,
        user_agent: meta.userAgent,
        success: false,
        metadata: { reason: error.message },
      });
      throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
    }

    await this.auditRepository.record({
      event_type: "login_success",
      user_id: data.user?.id,
      email: input.email,
      ip_address: meta.ipAddress,
      user_agent: meta.userAgent,
      success: true,
    });

    return {
      success: true,
      redirectTo: sanitizeRedirectPath(input.redirectTo),
      user: data.user,
    };
  }

  async register(input: RegisterInput, meta: RequestMeta) {
    await this.auditRepository.record({
      event_type: "register_attempt",
      email: input.email,
      ip_address: meta.ipAddress,
      user_agent: meta.userAgent,
      success: true,
    });

    const { data, error } = await this.supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: { full_name: input.fullName },
        emailRedirectTo: `${env.appUrl}/auth/callback`,
      },
    });

    if (error) {
      await this.auditRepository.record({
        event_type: "register_failed",
        email: input.email,
        ip_address: meta.ipAddress,
        user_agent: meta.userAgent,
        success: false,
        metadata: { reason: error.message },
      });
      throw new AppError(error.message, 400, "REGISTER_FAILED");
    }

    await this.auditRepository.record({
      event_type: "register_success",
      user_id: data.user?.id,
      email: input.email,
      ip_address: meta.ipAddress,
      user_agent: meta.userAgent,
      success: true,
    });

    return { success: true };
  }

  async requestPasswordReset(input: ForgotPasswordInput, meta: RequestMeta) {
    const { error } = await this.supabase.auth.resetPasswordForEmail(input.email, {
      redirectTo: `${env.appUrl}/auth/update-password`,
    });

    await this.auditRepository.record({
      event_type: "forgot_password_requested",
      email: input.email,
      ip_address: meta.ipAddress,
      user_agent: meta.userAgent,
      success: !error,
      metadata: error ? { reason: error.message } : undefined,
    });

    // Keep response generic to avoid user enumeration.
    return { success: true };
  }

  async resetPassword(input: ResetPasswordInput, meta: RequestMeta) {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();

    if (!user) {
      throw new AppError("Password reset session is invalid or expired", 401, "RESET_SESSION_INVALID");
    }

    const { error } = await this.supabase.auth.updateUser({ password: input.password });
    if (error) throw new AppError(error.message, 400, "PASSWORD_RESET_FAILED");

    await this.auditRepository.record({
      event_type: "password_reset_success",
      user_id: user.id,
      email: user.email,
      ip_address: meta.ipAddress,
      user_agent: meta.userAgent,
      success: true,
    });

    return { success: true };
  }

  async logout(meta: RequestMeta) {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();

    await this.supabase.auth.signOut();
    await this.auditRepository.record({
      event_type: "logout",
      user_id: user?.id,
      email: user?.email,
      ip_address: meta.ipAddress,
      user_agent: meta.userAgent,
      success: true,
    });

    return { success: true };
  }

  async refreshSession(meta: RequestMeta) {
    const { data, error } = await this.supabase.auth.refreshSession();
    if (error) throw new AppError("Unable to refresh session", 401, "SESSION_REFRESH_FAILED");

    await this.auditRepository.record({
      event_type: "session_refreshed",
      user_id: data.user?.id,
      email: data.user?.email,
      ip_address: meta.ipAddress,
      user_agent: meta.userAgent,
      success: true,
    });

    return { success: true };
  }

  async invalidateSession(meta: RequestMeta) {
    const result = await this.logout(meta);
    await this.auditRepository.record({
      event_type: "session_invalidated",
      ip_address: meta.ipAddress,
      user_agent: meta.userAgent,
      success: true,
    });
    return result;
  }
}

