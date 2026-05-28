/**
 * GET /api/wger/exercise-muscles?name=sentadilla
 * Busca en la BD local ExerciseMuscleMapping (datos ya descargados de WGER)
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

export interface ExerciseMuscleResult {
  found: boolean
  exerciseName?: string
  category?: string
  muscles: string[]
  musclesSecondary: string[]
  muscleIds: number[]
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

  // Fuzzy search by exact match first, then contains
  let row = await prisma.exerciseMuscleMapping.findFirst({
    where: { exercise: name },
  })

  if (!row) {
    row = await prisma.exerciseMuscleMapping.findFirst({
      where: { exercise: { contains: name } },
    })
  }

  if (!row) {
    // Try word-by-word match
    const words = name
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3)
    if (words.length > 0) {
      row = await prisma.exerciseMuscleMapping.findFirst({
        where: {
          OR: words.map((w) => ({ exercise: { contains: w } })),
        },
      })
    }
  }

  if (!row) {
    return NextResponse.json({
      found: false,
      muscles: [],
      musclesSecondary: [],
      muscleIds: [],
      source: 'not-found',
    } satisfies ExerciseMuscleResult)
  }

  const secondary = ((row.secondaryMuscles as string[]) || []).map(formatMuscle)

  return NextResponse.json({
    found: true,
    exerciseName: row.exercise,
    category: formatMuscle(row.primaryMuscle),
    muscles: [formatMuscle(row.primaryMuscle)],
    musclesSecondary: secondary,
    muscleIds: [],
    source: 'local',
  } satisfies ExerciseMuscleResult)
}
