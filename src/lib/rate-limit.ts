/**
 * Rate limiting con @upstash/ratelimit (sliding window).
 *
 * Si las variables de Upstash no estan configuradas (dev local), cae
 * silenciosamente a un Map en memoria de proceso unico.
 *
 * Compatibilidad Edge Runtime OK - usa fetch interno del SDK.
 */

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Fallback en memoria
interface MemEntry {
  count: number
  resetAt: number
}
const memStore = new Map<string, MemEntry>()

setInterval(
  () => {
    const now = Date.now()
    for (const [key, entry] of memStore) {
      if (now > entry.resetAt) memStore.delete(key)
    }
  },
  60 * 60 * 1000
)

async function memCheckLimit(
  key: string,
  max: number,
  windowMs: number
): Promise<{ ok: boolean; remaining: number; resetAt: number }> {
  const now = Date.now()
  const entry = memStore.get(key)

  if (!entry || now > entry.resetAt) {
    const newEntry: MemEntry = { count: 1, resetAt: now + windowMs }
    memStore.set(key, newEntry)
    return { ok: true, remaining: max - 1, resetAt: newEntry.resetAt }
  }

  if (entry.count >= max) {
    return { ok: false, remaining: 0, resetAt: entry.resetAt }
  }

  entry.count++
  return { ok: true, remaining: max - entry.count, resetAt: entry.resetAt }
}

// Cliente Upstash
function buildRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
}

const redisClient = buildRedis()

function buildLimiter(max: number, windowSeconds: number): Ratelimit | null {
  if (!redisClient) return null
  return new Ratelimit({
    redis: redisClient,
    limiter: Ratelimit.slidingWindow(max, `${windowSeconds} s`),
    analytics: false,
  })
}

export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number
): Promise<{ ok: boolean; remaining: number; resetAt: number }> {
  if (redisClient) {
    try {
      const limiter = buildLimiter(maxRequests, windowSeconds)
      if (limiter) {
        const result = await limiter.limit(`rate:${key}`)
        return {
          ok: result.success,
          remaining: result.remaining,
          resetAt: result.reset,
        }
      }
    } catch {
      // Degradar a memoria si Upstash falla
    }
  }

  return memCheckLimit(key, maxRequests, windowSeconds * 1000)
}

export function getRateLimitKey(ip: string, userId?: string): string {
  return userId ? `${userId}:${ip}` : ip
}

export function getClientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  if (forwarded) return forwarded

  const cfIp = headers.get('cf-connecting-ip')
  if (cfIp) return cfIp

  return 'unknown'
}

export const LIMITS = {
  AUTH: { maxRequests: 5, windowSeconds: 60 },
  REGISTER: { maxRequests: 3, windowSeconds: 300 },
  OTP: { maxRequests: 10, windowSeconds: 60 },
  GENERAL: { maxRequests: 60, windowSeconds: 60 },
} as const
