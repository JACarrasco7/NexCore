/**
 * GET /api/wger/exercise-info?name=Calf+Press
 * Busca en la BD local ExerciseMuscleMapping.
 * Fuentes: datos WGER ya descargados + YouTube fallback para vídeos.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { checkRateLimit, getClientIp, getRateLimitKey } from '@/lib/rate-limit'
import { badRequest, unauthorized, tooManyRequests } from '@/lib/api/error-response'
import { prisma } from '@/lib/prisma'

function formatMuscle(name: string): string {
  return name
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function cleanDesc(html: string | null): string | undefined {
  if (!html) return undefined
  return html
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/<[^>]+>/g, '')
    .trim()
}

export interface ExerciseInfoResult {
  found: boolean
  exerciseName?: string
  category?: string
  description?: string
  muscles: string[]
  musclesSecondary: string[]
  muscleIds: number[]
  videoUrls: string[]
  imageUrls: string[]
  mainImageUrl?: string
  equipment?: string
  difficulty?: string
  source: 'local' | 'not-found'
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  const clientIp = getClientIp(req.headers)
  const rateLimitKey = getRateLimitKey(clientIp, session.user.id)
  const { ok } = await checkRateLimit(rateLimitKey, 60, 60)
  if (!ok) return tooManyRequests()

  const name = req.nextUrl.searchParams.get('name')?.trim()
  if (!name) return badRequest("Parámetro 'name' requerido")

  // Fuzzy search: exact → contains → word-by-word
  let row = await prisma.exerciseMuscleMapping.findFirst({
    where: { exercise: name },
  })

  if (!row) {
    row = await prisma.exerciseMuscleMapping.findFirst({
      where: { exercise: { contains: name } },
    })
  }

  if (!row) {
    const words = name
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3)
    if (words.length > 0) {
      row = await prisma.exerciseMuscleMapping.findFirst({
        where: { OR: words.map((w) => ({ exercise: { contains: w } })) },
      })
    }
  }

  if (!row) {
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

  const secondary = ((row.secondaryMuscles as string[]) || []).map(formatMuscle)
  const imageUrls = row.externalImageUrl ? [row.externalImageUrl] : []
  const videoUrls = row.externalVideoUrl ? [row.externalVideoUrl] : []

  return NextResponse.json({
    found: true,
    exerciseName: row.exercise,
    category: formatMuscle(row.primaryMuscle),
    description: cleanDesc(row.description),
    muscles: [formatMuscle(row.primaryMuscle)],
    musclesSecondary: secondary,
    muscleIds: [],
    videoUrls,
    imageUrls,
    mainImageUrl: row.externalImageUrl || undefined,
    equipment: row.equipment || undefined,
    difficulty: row.difficulty || undefined,
    source: 'local',
  } satisfies ExerciseInfoResult)
}
