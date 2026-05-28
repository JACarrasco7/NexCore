import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const nutritionPlanUpdateSchema = z.object({
  title: z.string().optional(),
  phase: z.string().optional(),
  kcalTarget: z.number().positive().optional(),
  proteinG: z.number().positive().optional(),
  carbsG: z.number().positive().optional(),
  fatG: z.number().positive().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
})

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const plan = await prisma.nutritionPlan.findUnique({
    where: { id },
    include: {
      meals: {
        orderBy: { order: 'asc' },
        include: { foods: { orderBy: { order: 'asc' } } },
      },
    },
  })

  if (!plan) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(plan)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = (session.user as { role: string }).role
  if (role !== 'COACH' && role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const parsed = nutritionPlanUpdateSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const plan = await prisma.nutritionPlan.update({
    where: { id },
    data: parsed.data,
  })

  return NextResponse.json(plan)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = (session.user as { role: string }).role
  if (role !== 'COACH' && role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  await prisma.nutritionPlan.update({ where: { id }, data: { deletedAt: new Date() } })
  return new NextResponse(null, { status: 204 })
}
