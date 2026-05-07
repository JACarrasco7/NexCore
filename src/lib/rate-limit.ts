/**
 * In-memory rate limiting utility.
 * Suitable for single-process dev/staging environments.
 * For production multi-process, use Redis or Vercel KV.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const limits = new Map<string, RateLimitEntry>();

// Upstash REST config (optional). If env vars are set, use Upstash HTTP API.
const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

async function upstashFetch(path: string, method: string = "GET") {
  if (!upstashUrl || !upstashToken) throw new Error("Upstash not configured");
  const base = upstashUrl.replace(/\/$/, "");
  const p = path.replace(/^\//, "");
  const url = `${base}/${p}`;
  const res = await fetch(url, { method, headers: { Authorization: `Bearer ${upstashToken}` } });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Upstash request failed ${res.status} ${text}`);
  }
  const json = await res.json().catch(() => ({}));
  return (json && (json.result ?? json)) as any;
}

async function upstashIncr(key: string) {
  return upstashFetch(`incr/${encodeURIComponent(key)}`, "POST");
}

async function upstashTtl(key: string) {
  return upstashFetch(`ttl/${encodeURIComponent(key)}`, "GET");
}

async function upstashExpire(key: string, seconds: number) {
  return upstashFetch(`expire/${encodeURIComponent(key)}/${seconds}`, "POST");
}

/**
 * Generate a unique key for rate limiting (IP + optional userId).
 */
export function getRateLimitKey(ip: string, userId?: string): string {
  return userId ? `${userId}:${ip}` : ip;
}

/**
 * Check if a request exceeds rate limit.
 * If Upstash is configured, use Redis (works in Edge). Otherwise fallback to in-memory Map.
 * @returns Promise resolving to { ok, remaining, resetAt }
 */
export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number
): Promise<{ ok: boolean; remaining: number; resetAt: number }> {
  const now = Date.now();

  if (upstashUrl && upstashToken) {
    try {
      const rKey = `rate:${key}`;
      const countRes = await upstashIncr(rKey);
      const count = Number(countRes ?? 0);
      let ttl = await upstashTtl(rKey);
      ttl = Number(ttl ?? -1);
      if (ttl === -1) {
        await upstashExpire(rKey, windowSeconds);
        ttl = windowSeconds;
      }
      if (ttl < 0) ttl = windowSeconds;

      const ok = count <= maxRequests;
      const remaining = ok ? Math.max(0, maxRequests - count) : 0;
      const resetAt = now + ttl * 1000;
      return { ok, remaining, resetAt };
    } catch (e) {
      console.warn('[rate-limit] Upstash error, falling back to memory', e);
    }
  }

  // In-memory fallback (suitable for single-process dev)
  const entry = limits.get(key);

  // New or expired entry
  if (!entry || now > entry.resetAt) {
    const newEntry = { count: 1, resetAt: now + windowSeconds * 1000 };
    limits.set(key, newEntry);
    return { ok: true, remaining: maxRequests - 1, resetAt: newEntry.resetAt };
  }

  // Exceeds limit
  if (entry.count >= maxRequests) {
    return { ok: false, remaining: 0, resetAt: entry.resetAt };
  }

  // Within limit
  entry.count++;
  return { ok: true, remaining: maxRequests - entry.count, resetAt: entry.resetAt };
}

/**
 * Extract IP from request headers.
 * Handles X-Forwarded-For and CF-Connecting-IP (behind proxies).
 */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return forwarded;

  const cloudflareIp = headers.get("cf-connecting-ip");
  if (cloudflareIp) return cloudflareIp;

  return "unknown";
}

/**
 * Common rate limit presets.
 */
export const LIMITS = {
  AUTH: { maxRequests: 5, windowSeconds: 60 }, // 5 requests per minute
  REGISTER: { maxRequests: 3, windowSeconds: 300 }, // 3 per 5 min
  OTP: { maxRequests: 10, windowSeconds: 60 }, // 10 per minute
  GENERAL: { maxRequests: 60, windowSeconds: 60 }, // 60 per minute
};

/**
 * Cleanup expired entries every hour.
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of limits.entries()) {
    if (now > entry.resetAt) {
      limits.delete(key);
    }
  }
}, 60 * 60 * 1000);
