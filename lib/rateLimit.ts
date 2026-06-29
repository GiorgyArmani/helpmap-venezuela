// Lightweight in-memory rate limiter (fixed window per key).
//
// WORKS here because the app runs as a single long-lived Node container (Dokploy/VPS,
// CLAUDE.md §3) — the Map persists across requests in one process. If this is ever
// deployed to serverless / multiple replicas, the counters won't be shared; move to a
// shared store (e.g. Upstash Redis) then. Until then this is the cheapest effective guard.

type Entry = { count: number; resetAt: number };
const buckets = new Map<string, Entry>();

export interface RateLimitResult {
  ok: boolean;
  limit: number;
  remaining: number;
  reset: number; // epoch seconds when the window resets
  retryAfter: number; // seconds until reset
}

// Returns the limit decision for `key`. Counts this call. `limit` requests per `windowMs`.
export function rateLimit(key: string, limit = 60, windowMs = 60_000): RateLimitResult {
  const now = Date.now();
  let e = buckets.get(key);
  if (!e || e.resetAt <= now) {
    e = { count: 0, resetAt: now + windowMs };
    buckets.set(key, e);
  }
  e.count++;

  // Opportunistic prune so the Map can't grow unbounded under many distinct IPs.
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
  }

  return {
    ok: e.count <= limit,
    limit,
    remaining: Math.max(0, limit - e.count),
    reset: Math.ceil(e.resetAt / 1000),
    retryAfter: Math.max(1, Math.ceil((e.resetAt - now) / 1000)),
  };
}

// Best-effort client IP from common proxy headers (Dokploy/Nginx/Vercel set these).
export function clientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

// Standard rate-limit headers for a response.
export function rateLimitHeaders(r: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(r.limit),
    "X-RateLimit-Remaining": String(r.remaining),
    "X-RateLimit-Reset": String(r.reset),
  };
}
