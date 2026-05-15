import { AppError } from "@/utils/app-error";

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export function enforceRateLimit(
  key: string,
  options: { limit: number; windowMs: number }
) {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs });
    return;
  }

  bucket.count += 1;

  if (bucket.count > options.limit) {
    throw new AppError("Too many attempts. Please try again later.", 429, "RATE_LIMITED", {
      retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
    });
  }
}

export function rateLimitHeaders(key: string) {
  const bucket = buckets.get(key);
  if (!bucket) return {};

  return {
    "X-RateLimit-Reset": String(Math.ceil(bucket.resetAt / 1000)),
    "Retry-After": String(Math.max(Math.ceil((bucket.resetAt - Date.now()) / 1000), 0)),
  };
}
