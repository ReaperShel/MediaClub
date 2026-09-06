/**
 * Simple in-memory rate limiter for server-side endpoints.
 *
 * - Public endpoints: per-IP limits.
 * - Authenticated endpoints: per-user limits.
 */

type RateLimitRecord = {
  count: number;
  resetAt: number;
};

type RateLimitRule = {
  windowMs: number;
  max: number;
};

const store = new Map<string, RateLimitRecord>();

const DEFAULT_PUBLIC_RULE: RateLimitRule = { windowMs: 60_000, max: 10 };
const DEFAULT_AUTH_RULE: RateLimitRule = { windowMs: 60_000, max: 30 };

function getIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || "unknown";
  const cf = request.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  return "unknown";
}

export function checkRateLimit(
  request: Request,
  userId?: string,
  rule?: RateLimitRule
): { ok: true } | { ok: false; retryAfterMs: number } {
  const limiter = rule ?? (userId ? DEFAULT_AUTH_RULE : DEFAULT_PUBLIC_RULE);
  const key = userId ? `user:${userId}` : `ip:${getIp(request)}`;
  const now = Date.now();

  const existing = store.get(key);
  if (existing && existing.resetAt > now) {
    const remaining = existing.resetAt - now;
    if (existing.count >= limiter.max) {
      return { ok: false, retryAfterMs: remaining };
    }
    existing.count += 1;
    return { ok: true };
  }

  store.set(key, { count: 1, resetAt: now + limiter.windowMs });
  return { ok: true };
}

export function rateLimit(rule?: RateLimitRule) {
  return async (request: Request, userId?: string) => {
    return checkRateLimit(request, userId, rule);
  };
}
