type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** In-memory rate limit for unauthenticated routes (per key, e.g. IP or email). */
export function checkPublicRateLimit(
  key: string,
  max: number,
  windowMs: number
): { allowed: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (existing.count >= max) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return { allowed: true };
}
