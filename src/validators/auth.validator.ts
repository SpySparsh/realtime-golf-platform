import { z } from "zod";

const email = z.string().trim().email().max(254).toLowerCase();
const password = z.string().min(8).max(128);

export const loginSchema = z.object({
  email,
  password,
  redirectTo: z.string().optional(),
});

export const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email,
  password,
});

export const forgotPasswordSchema = z.object({
  email,
});

export const resetPasswordSchema = z.object({
  password,
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export function validateLoginInput(body: unknown) {
  return loginSchema.parse(body);
}

export function validateRegisterInput(body: unknown) {
  return registerSchema.parse(body);
}

export function validateForgotPasswordInput(body: unknown) {
  return forgotPasswordSchema.parse(body);
}

export function validateResetPasswordInput(body: unknown) {
  return resetPasswordSchema.parse(body);
}

