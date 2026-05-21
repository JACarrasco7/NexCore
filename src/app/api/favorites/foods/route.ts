/**
 * GET /api/favorites/foods
 * POST /api/favorites/foods (add)
 * DELETE /api/favorites/foods?name=...&source=... (remove)
 */

import { apiHandler } from '@/lib/api/api-handler'
import { prisma } from '@/lib/prisma'
import { BusinessError, ErrorCodes } from '@/lib/errors'

export const GET = apiHandler({
  auth: 'athlete',
  handler: async ({ session }) => {
    const athlete = await prisma.athlete.findUnique({ where: { userId: session.user.id }, select: { id: true } })
    if (!athlete) throw new BusinessError('Not an athlete', ErrorCodes.FORBIDDEN, 403)

    const favs = await prisma.favoriteFood.findMany({ where: { athleteId: athlete.id }, orderBy: { addedAt: 'desc' } })
    return { favorites: favs }
  },
})

export const POST = apiHandler({
  auth: 'athlete',
  handler: async ({ req, session }) => {
    const athlete = await prisma.athlete.findUnique({ where: { userId: session.user.id }, select: { id: true } })
    if (!athlete) throw new BusinessError('Not an athlete', ErrorCodes.FORBIDDEN, 403)

    const body = await (req as Request).json()
    const { foodName, source, sourceId, kcal, proteinG, carbsG, fatG } = body
    if (!foodName?.trim() || !source?.trim()) throw new BusinessError('foodName and source required', ErrorCodes.INVALID_INPUT, 400)

    const fav = await prisma.favoriteFood.upsert({ where: { athleteId_foodName_source: { athleteId: athlete.id, foodName: foodName.trim(), source: source.trim() } }, update: { addedAt: new Date() }, create: { athleteId: athlete.id, foodName: foodName.trim(), source: source.trim(), sourceId: sourceId || null, kcal, proteinG, carbsG, fatG } })

    return { favorite: fav }
  },
})

export const DELETE = apiHandler({
  auth: 'athlete',
  handler: async ({ req, session }) => {
    const athlete = await prisma.athlete.findUnique({ where: { userId: session.user.id }, select: { id: true } })
    if (!athlete) throw new BusinessError('Not an athlete', ErrorCodes.FORBIDDEN, 403)

    const { searchParams } = new URL((req as Request).url)
    const name = searchParams.get('name')
    const source = searchParams.get('source')
    if (!name?.trim() || !source?.trim()) throw new BusinessError('name and source query params required', ErrorCodes.INVALID_INPUT, 400)

    await prisma.favoriteFood.deleteMany({ where: { athleteId: athlete.id, foodName: name, source } })
    return { ok: true }
  },
})
