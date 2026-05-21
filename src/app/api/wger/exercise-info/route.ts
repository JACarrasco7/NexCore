/**
 * Proxy enriquecido — /api/wger/exercise-info?name=sentadilla
 *
 * Fuentes (en orden de prioridad):
 *  1. wger.de — músculos, categoría, descripción, imágenes PNG, vídeos MP4
 *  2. ExerciseDB (RapidAPI) — GIFs animados HD + instrucciones detalladas
 *     (requiere EXERCISEDB_RAPIDAPI_KEY en .env, plan $12.99/mes)
 *
 * Cacheo en memoria 24h.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { checkRateLimit, getClientIp, getRateLimitKey } from '@/lib/rate-limit'
import { badRequest, unauthorized, tooManyRequests } from '@/lib/api/error-response'
import {
  isExerciseDBConfigured,
  searchExerciseDB,
  type ExerciseDBResult,
} from '@/lib/exercisedb-provider'

interface WgerMuscle {
  id: number
  name: string
  name_en: string
}

interface WgerExerciseInfo {
  id: number
  muscles: WgerMuscle[]
  muscles_secondary: WgerMuscle[]
  category: { id: number; name: string }
  translations: { language: number; name: string; description: string }[]
}

interface WgerListResponse {
  count: number
  results: WgerExerciseInfo[]
}

interface WgerVideo {
  id: number
  exercise_base: number
  video: string
  is_main: boolean
}

interface WgerVideoListResponse {
  count: number
  results: WgerVideo[]
}

interface WgerImage {
  id: number
  uuid: string
  exercise: number
  exercise_uuid: string
  image: string // URL directa a PNG/JPG
  is_main: boolean
  style: string
}

interface WgerImageListResponse {
  count: number
  results: WgerImage[]
}

export interface ExerciseInfoResult {
  found: boolean
  exerciseName?: string
  category?: string
  description?: string
  muscles: string[]
  musclesSecondary: string[]
  muscleIds: number[]
  videoUrls: string[] // MP4 de wger
  imageUrls: string[] // PNG de wger
  mainImageUrl?: string // Imagen principal de wger
  gifUrl?: string // GIF animado de ExerciseDB (si key configurada)
  instructions?: string[] // Instrucciones de ExerciseDB (si disponible)
  wgerBaseId?: number
  exercisedbId?: string // ID en ExerciseDB
  source: 'wger' | 'wger+exercisedb' | 'cache' | 'not-found'
}

const cache = new Map<string, { data: ExerciseInfoResult; ts: number }>()
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

const WGER_MUSCLE_NAMES_ES: Record<number, string> = {
  1: 'Bíceps',
  2: 'Deltoides',
  3: 'Serrato anterior',
  4: 'Pectoral',
  5: 'Tríceps',
  6: 'Core (abdomen)',
  7: 'Gemelos',
  8: 'Glúteos',
  9: 'Trapecio',
  10: 'Cuádriceps',
  11: 'Isquios',
  12: 'Espalda (lat)',
  13: 'Espalda (lumbar)',
  14: 'Oblicuos',
  15: 'Sóleo',
}

export async function GET(req: NextRequest) {
  // Authentication check
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  // Rate limiting to prevent DoS via WGER proxy
  const clientIp = getClientIp(req.headers)
  const rateLimitKey = getRateLimitKey(clientIp, session.user.id)
  const { ok } = await checkRateLimit(rateLimitKey, 30, 60) // 30 req/min per user
  if (!ok) return tooManyRequests()

  const name = req.nextUrl.searchParams.get('name')?.trim()
  if (!name) {
    return badRequest("Parámetro 'name' requerido")
  }

  const key = name.toLowerCase()

  const cached = cache.get(key)
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return NextResponse.json({ ...cached.data, source: 'cache' })
  }

  try {
    // 1. Buscar ejercicio por nombre (en inglés — base de datos más completa)
    const searchUrl = `https://wger.de/api/v2/exerciseinfo/?format=json&language=2&limit=20&offset=0`
    const res = await fetch(searchUrl, {
      next: { revalidate: 86400 },
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(6000),
    })

    if (!res.ok) throw new Error(`WGER HTTP ${res.status}`)

    const data: WgerListResponse = await res.json()

    const nameLower = key
    let best: WgerExerciseInfo | null = null
    let bestScore = 0

    for (const ex of data.results) {
      for (const t of ex.translations) {
        const tLow = t.name.toLowerCase()
        let score = 0
        if (tLow === nameLower) score = 100
        else if (tLow.includes(nameLower) || nameLower.includes(tLow)) score = 50
        else {
          const words = nameLower.split(/\s+/)
          const matches = words.filter((w) => tLow.includes(w) && w.length > 3).length
          score = matches * 15
        }
        if (score > bestScore) {
          bestScore = score
          best = ex
        }
      }
    }

    if (!best || bestScore === 0) {
      const result: ExerciseInfoResult = {
        found: false,
        muscles: [],
        musclesSecondary: [],
        muscleIds: [],
        videoUrls: [],
        imageUrls: [],
        source: 'not-found',
      }
      cache.set(key, { data: result, ts: Date.now() })
      return NextResponse.json(result)
    }

    // 2. Obtener vídeos e imágenes en paralelo
    let videoUrls: string[] = []
    let imageUrls: string[] = []
    let mainImageUrl: string | undefined

    await Promise.allSettled([
      // Videos
      fetch(`https://wger.de/api/v2/video/?format=json&exercise_base=${best.id}&limit=3`, {
        next: { revalidate: 86400 },
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(4000),
      }).then(async (r) => {
        if (!r.ok) return
        const d: WgerVideoListResponse = await r.json()
        videoUrls = d.results
          .map((v) => v.video)
          .filter((url) => url && (url.endsWith('.mp4') || url.includes('wger.de')))
      }),
      // Imágenes
      fetch(`https://wger.de/api/v2/exerciseimage/?format=json&exercise=${best.id}&limit=10`, {
        next: { revalidate: 86400 },
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(4000),
      }).then(async (r) => {
        if (!r.ok) return
        const d: WgerImageListResponse = await r.json()
        imageUrls = d.results.map((img) => img.image)
        mainImageUrl = d.results.find((img) => img.is_main)?.image ?? d.results[0]?.image
      }),
    ])

    const muscles = best.muscles.map((m) => WGER_MUSCLE_NAMES_ES[m.id] ?? m.name_en)
    const musclesSecondary = best.muscles_secondary.map(
      (m) => WGER_MUSCLE_NAMES_ES[m.id] ?? m.name_en
    )
    const muscleIds = best.muscles.map((m) => m.id)

    // Preferir descripción en español (language=4), luego inglés (language=2)
    const descEs = best.translations.find((t) => t.language === 4 && t.description?.trim())
    const descEn = best.translations.find((t) => t.language === 2 && t.description?.trim())
    const descRaw = descEs?.description ?? descEn?.description ?? ''
    // Limpiar HTML básico
    const description = descRaw.replace(/<[^>]+>/g, '').trim()

    const exNameEn =
      best.translations.find((t) => t.language === 2)?.name ??
      best.translations[0]?.name ??
      'Exercise'

    // 3. ExerciseDB (GIFs + instrucciones) — solo si hay key configurada
    let gifUrl: string | undefined
    let instructions: string[] | undefined
    let exercisedbId: string | undefined

    if (isExerciseDBConfigured()) {
      const edbResults = await searchExerciseDB(exNameEn, 1).catch(() => [] as ExerciseDBResult[])
      const edb = edbResults[0]
      if (edb) {
        gifUrl = edb.gifUrl
        instructions = edb.instructions.length > 0 ? edb.instructions : undefined
        exercisedbId = edb.exerciseId
      }
    }

    const result: ExerciseInfoResult = {
      found: true,
      exerciseName: exNameEn,
      category: best.category.name,
      description: description || undefined,
      muscles,
      musclesSecondary,
      muscleIds,
      videoUrls,
      imageUrls,
      mainImageUrl,
      gifUrl,
      instructions,
      wgerBaseId: best.id,
      exercisedbId,
      source: exercisedbId ? 'wger+exercisedb' : 'wger',
    }

    cache.set(key, { data: result, ts: Date.now() })
    return NextResponse.json(result)
  } catch (err) {
    console.error('[wger/exercise-info]', err)
    return NextResponse.json({
      found: false,
      muscles: [],
      musclesSecondary: [],
      muscleIds: [],
      videoUrls: [],
      imageUrls: [],
      source: 'not-found',
    } satisfies ExerciseInfoResult)
  }
}
