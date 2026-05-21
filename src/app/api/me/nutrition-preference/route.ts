import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const athlete = await prisma.athlete.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      nutritionPreference: true,
    },
  })

  if (!athlete) {
    return NextResponse.json({ error: 'Not an athlete' }, { status: 403 })
  }

  // Si no existe preferencia, retornar default sin crear en BD
  // El POST/upsert se encarga de crear
  const dietType = athlete.nutritionPreference?.dietType ?? 'closed'

  return NextResponse.json({
    dietType,
    athleteId: athlete.id,
  })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const athlete = await prisma.athlete.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  })

  if (!athlete) {
    return NextResponse.json({ error: 'Not an athlete' }, { status: 403 })
  }

  const body = await req.json()
  const { dietType } = body

  if (!['open', 'closed'].includes(dietType)) {
    return NextResponse.json({ error: 'Invalid dietType' }, { status: 400 })
  }

  const pref = await prisma.nutritionPreference.upsert({
    where: { athleteId: athlete.id },
    update: { dietType },
    create: {
      athleteId: athlete.id,
      dietType,
    },
  })

  return NextResponse.json({ dietType: pref.dietType })
}
