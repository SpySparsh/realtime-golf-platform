import { env } from "@/infrastructure/config/env";

const REQUIRED_PRODUCTION_SECRETS: Array<keyof typeof env> = [
  "supabaseUrl",
  "supabaseAnonKey",
  "supabaseServiceRoleKey",
  "csrfSecret",
];

const MIN_SECRET_LENGTH = 24;

export function validateEnvironmentSecrets(options: { strict?: boolean; route?: string } = {}) {
  const strict = options.strict ?? process.env.NODE_ENV === "production";
  if (!strict) return;

  const failures: string[] = [];
  const requiredSecrets = new Set<keyof typeof env>(REQUIRED_PRODUCTION_SECRETS);

  if (options.route?.startsWith("/api/stripe")) {
    requiredSecrets.add("stripeSecretKey");
    if (options.route.startsWith("/api/stripe/webhook")) {
      requiredSecrets.add("stripeWebhookSecret");
    }
  }

  if (options.route?.startsWith("/api/razorpay")) {
    requiredSecrets.add("razorpayWebhookSecret");
  }

  if (
    options.route?.startsWith("/api/queues") ||
    options.route?.startsWith("/api/admin/draws/execute")
  ) {
    requiredSecrets.add("redisUrl");
  }

  for (const key of requiredSecrets) {
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
