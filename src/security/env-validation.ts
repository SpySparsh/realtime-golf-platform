import { env } from "@/infrastructure/config/env";

const REQUIRED_PRODUCTION_SECRETS: Array<keyof typeof env> = [
  "supabaseUrl",
  "supabaseAnonKey",
  "supabaseServiceRoleKey",
  "stripeSecretKey",
  "stripeWebhookSecret",
  "razorpayWebhookSecret",
  "redisUrl",
  "csrfSecret",
];

const MIN_SECRET_LENGTH = 24;

export function validateEnvironmentSecrets(options: { strict?: boolean } = {}) {
  const strict = options.strict ?? process.env.NODE_ENV === "production";
  if (!strict) return;

  const failures: string[] = [];

  for (const key of REQUIRED_PRODUCTION_SECRETS) {
    const value = env[key];
    if (!value) {
      failures.push(`${String(key)} is required`);
      continue;
    }

    if (String(value).length < MIN_SECRET_LENGTH && String(key).toLowerCase().includes("secret")) {
      failures.push(`${String(key)} must be at least ${MIN_SECRET_LENGTH} characters`);
    }
  }

  if (env.appUrl.startsWith("http://") && !env.appUrl.includes("localhost")) {
    failures.push("NEXT_PUBLIC_APP_URL must use HTTPS outside localhost");
  }

  if (failures.length) {
    throw new Error(`Environment secret validation failed: ${failures.join("; ")}`);
  }
}
