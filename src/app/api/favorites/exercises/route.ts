/**
 * GET /api/favorites/exercises
 * POST /api/favorites/exercises (add)
 * DELETE /api/favorites/exercises?name=... (remove)
 */

import { apiHandler } from '@/lib/api/api-handler'
import { prisma } from '@/lib/prisma'
import { BusinessError, ErrorCodes } from '@/lib/errors'

export const GET = apiHandler({
  auth: 'athlete',
  handler: async ({ session }) => {
    const athlete = await prisma.athlete.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    })
    if (!athlete) throw new BusinessError('Not an athlete', ErrorCodes.FORBIDDEN, 403)

    const favs = await prisma.favoriteExercise.findMany({
      where: { athleteId: athlete.id },
      orderBy: { addedAt: 'desc' },
      select: { id: true, exerciseName: true, addedAt: true },
    })
    return { favorites: favs }
  },
})

export const POST = apiHandler({
  auth: 'athlete',
  handler: async ({ req, session }) => {
    const athlete = await prisma.athlete.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    })
    if (!athlete) throw new BusinessError('Not an athlete', ErrorCodes.FORBIDDEN, 403)

    const body = await (req as Request).json()
    const { exerciseName } = body
    if (!exerciseName?.trim())
      throw new BusinessError('exerciseName required', ErrorCodes.INVALID_INPUT, 400)

    const fav = await prisma.favoriteExercise.upsert({
      where: {
        athleteId_exerciseName: { athleteId: athlete.id, exerciseName: exerciseName.trim() },
      },
      update: { addedAt: new Date() },
      create: { athleteId: athlete.id, exerciseName: exerciseName.trim() },
    })

    return { favorite: fav }
  },
})

export const DELETE = apiHandler({
  auth: 'athlete',
  handler: async ({ req, session }) => {
    const athlete = await prisma.athlete.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    })
    if (!athlete) throw new BusinessError('Not an athlete', ErrorCodes.FORBIDDEN, 403)

    const { searchParams } = new URL((req as Request).url)
    const name = searchParams.get('name')
    if (!name?.trim())
      throw new BusinessError('name query param required', ErrorCodes.INVALID_INPUT, 400)

    await prisma.favoriteExercise.deleteMany({
      where: { athleteId: athlete.id, exerciseName: name },
    })
    return { ok: true }
  },
})
