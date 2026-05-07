/**
 * Capa de caché con Upstash Redis.
 *
 * En desarrollo sin UPSTASH_REDIS_REST_URL se usa un Map en memoria
 * para no bloquear el flujo local — se degrada gracefully.
 *
 * Uso:
 *   import { cache } from '@/lib/cache'
 *
 *   const data = await cache.getOrSet(
 *     'wger:exercises:en',
 *     60 * 60,           // TTL en segundos
 *     () => fetchWgerExercises(),
 *   )
 */

import { Redis } from '@upstash/redis'
import { createLogger } from './logger'

const log = createLogger('cache')

// ─── Cliente Redis ────────────────────────────────────────────────────────────

function buildRedisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) {
    log.warn('UPSTASH_REDIS_REST_URL/TOKEN not set — using in-memory fallback')
    return null
  }

  return new Redis({ url, token })
}

const redis = buildRedisClient()

// ─── Fallback en memoria (solo dev/test sin Redis) ────────────────────────────

const memoryStore = new Map<string, { value: unknown; expiresAt: number }>()

function memGet<T>(key: string): T | null {
  const entry = memoryStore.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    memoryStore.delete(key)
    return null
  }
  return entry.value as T
}

function memSet<T>(key: string, value: T, ttlSeconds: number): void {
  memoryStore.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 })
}

// ─── API pública ──────────────────────────────────────────────────────────────

export const cache = {
  /**
   * Obtiene el valor cacheado o ejecuta el fetcher y lo guarda.
   * @param key    Clave única (ej. "wger:exercises:en")
   * @param ttl    Segundos de vida del valor cacheado
   * @param fetcher Función async que obtiene el dato fresco
   */
  async getOrSet<T>(key: string, ttl: number, fetcher: () => Promise<T>): Promise<T> {
    // 1. Intentar desde Redis
    if (redis) {
      try {
        const cached = await redis.get<T>(key)
        if (cached !== null) {
          log.debug({ key }, 'cache hit (redis)')
          return cached
        }
      } catch (err) {
        log.error({ err, key }, 'Redis GET failed — will fetch fresh')
      }
    } else {
      // Fallback en memoria
      const cached = memGet<T>(key)
      if (cached !== null) {
        log.debug({ key }, 'cache hit (memory)')
        return cached
      }
    }

    // 2. Fetch fresco
    log.debug({ key }, 'cache miss — fetching')
    const value = await fetcher()

    // 3. Guardar en caché
    if (redis) {
      try {
        await redis.set(key, value, { ex: ttl })
      } catch (err) {
        log.error({ err, key }, 'Redis SET failed — data not cached')
      }
    } else {
      memSet(key, value, ttl)
    }

    return value
  },

  /** Invalida manualmente una clave */
  async del(key: string): Promise<void> {
    if (redis) {
      try {
        await redis.del(key)
      } catch (err) {
        log.error({ err, key }, 'Redis DEL failed')
      }
    } else {
      memoryStore.delete(key)
    }
  },

  /** Invalida todas las claves que empiezan por un prefijo (solo Redis) */
  async delPattern(pattern: string): Promise<void> {
    if (!redis) {
      // Fallback: borrar del map las claves que coincidan
      for (const key of memoryStore.keys()) {
        if (key.startsWith(pattern.replace('*', ''))) {
          memoryStore.delete(key)
        }
      }
      return
    }

    try {
      let cursor = 0
      do {
        const [nextCursor, keys] = await redis.scan(cursor, { match: pattern, count: 100 })
        cursor = Number(nextCursor)
        if (keys.length) await redis.del(...keys)
      } while (cursor !== 0)
    } catch (err) {
      log.error({ err, pattern }, 'Redis SCAN/DEL pattern failed')
    }
  },
}

// ─── Prefijos de clave recomendados ──────────────────────────────────────────

export const CacheKeys = {
  wgerExercises: (lang: string) => `wger:exercises:${lang}`,
  wgerCategories: () => 'wger:categories',
  wgerMuscles: () => 'wger:muscles',
  wgerEquipment: () => 'wger:equipment',
} as const
