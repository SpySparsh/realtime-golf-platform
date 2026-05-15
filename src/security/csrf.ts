import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";
import { env, requireEnv } from "@/infrastructure/config/env";
import { forbidden } from "@/utils/app-error";

export const CSRF_COOKIE_NAME = "__Host-golf_csrf";
export const CSRF_HEADER_NAME = "x-csrf-token";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const CSRF_EXEMPT_PATHS = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/stripe/webhook",
  "/api/razorpay/webhook",
  "/api/health",
  "/api/metrics",
];

function csrfSecret() {
  return env.csrfSecret || env.supabaseServiceRoleKey || requireEnv("supabaseAnonKey");
}

function signToken(nonce: string) {
  return createHmac("sha256", csrfSecret()).update(nonce).digest("base64url");
}

function buildToken(nonce: string) {
  return `${nonce}.${signToken(nonce)}`;
}

export function createCsrfToken() {
  return buildToken(randomBytes(32).toString("base64url"));
}

export function verifyCsrfToken(token?: string | null) {
  if (!token) return false;
  const [nonce, signature] = token.split(".");
  if (!nonce || !signature) return false;

  const expected = signToken(nonce);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

export function shouldCheckCsrf(request: NextRequest) {
  if (SAFE_METHODS.has(request.method)) return false;
  return !CSRF_EXEMPT_PATHS.some((path) => request.nextUrl.pathname.startsWith(path));
}

export function assertCsrf(request: NextRequest) {
  if (!shouldCheckCsrf(request)) return;

  const origin = request.headers.get("origin");
  if (origin && origin === request.nextUrl.origin) return;

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "same-origin" || fetchSite === "same-site") return;

  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  const headerToken = request.headers.get(CSRF_HEADER_NAME);
  if (cookieToken && headerToken && cookieToken === headerToken && verifyCsrfToken(headerToken)) return;

  throw forbidden("CSRF validation failed");
}
