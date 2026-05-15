type Env = {
  appUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey?: string;
  stripeSecretKey?: string;
  stripeWebhookSecret?: string;
  razorpayWebhookSecret?: string;
  razorpayWebhookToleranceSeconds: number;
  resendApiKey?: string;
  redisUrl?: string;
  queueWorkerConcurrency: number;
  websocketPort: number;
  websocketCorsOrigin: string;
  websocketPingIntervalMs: number;
  websocketPingTimeoutMs: number;
  serviceName: string;
  logLevel: string;
  workerMetricsPort: number;
  mongoUri?: string;
  csrfSecret?: string;
};

function readEnv(): Env {
  return {
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    stripeSecretKey: process.env.STRIPE_SECRET_KEY,
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
    razorpayWebhookToleranceSeconds: Number(
      process.env.RAZORPAY_WEBHOOK_TOLERANCE_SECONDS ?? 60 * 60 * 25
    ),
    resendApiKey: process.env.RESEND_API_KEY,
    redisUrl: process.env.REDIS_URL,
    queueWorkerConcurrency: Number(process.env.QUEUE_WORKER_CONCURRENCY ?? 5),
    websocketPort: Number(process.env.WEBSOCKET_PORT ?? 3001),
    websocketCorsOrigin: process.env.WEBSOCKET_CORS_ORIGIN ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    websocketPingIntervalMs: Number(process.env.WEBSOCKET_PING_INTERVAL_MS ?? 25_000),
    websocketPingTimeoutMs: Number(process.env.WEBSOCKET_PING_TIMEOUT_MS ?? 20_000),
    serviceName: process.env.SERVICE_NAME ?? "golf-charity-platform",
    logLevel: process.env.LOG_LEVEL ?? "info",
    workerMetricsPort: Number(process.env.WORKER_METRICS_PORT ?? 9101),
    mongoUri: process.env.MONGODB_URI,
    csrfSecret: process.env.CSRF_SECRET,
  };
}

export const env = readEnv();

export function requireEnv<K extends keyof Env>(key: K): NonNullable<Env[K]> {
  const value = env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${String(key)}`);
  }
  return value as NonNullable<Env[K]>;
}
