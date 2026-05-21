import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { z } from 'zod'
import { parseJsonOrError } from '@/lib/api/json-parser'

export const dynamic = 'force-dynamic'

const CreateBillingPlanSchema = z.object({
  planName: z.string().min(1, 'Plan name required'),
  description: z.string().nullable().optional(),
  price: z.number().min(0, 'Price must be >= 0'),
  currency: z.string().default('EUR'),
  billingCycle: z.enum(['MONTHLY', 'YEARLY', 'ONE_TIME']).default('MONTHLY'),
  maxAthletes: z.number().nullable().optional(),
})

/**
 * GET /api/teams/[teamId]/billing-plans
 * List all billing plans for a team (coach can view their own plans)
 */
export async function GET(request: Request, { params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 })
  }

  try {
    // Verify user is part of the team
    const membership = await prisma.teamUserMembership.findFirst({
      where: {
        teamId,
        userId: session.user.id,
        isActive: true,
      },
    })

    if (!membership) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Get all billing plans for the team
    const plans = await prisma.teamBillingPlan.findMany({
      where: { teamId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(plans)
  } catch (error) {
    console.error('[billing-plans] GET error:', error)
    return NextResponse.json({ error: 'Error fetching billing plans' }, { status: 500 })
  }
}

/**
 * POST /api/teams/[teamId]/billing-plans
 * Create a new billing plan (only ADMIN can create)
 */
export async function POST(request: Request, { params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 })
  }

  try {
    // Verify user is ADMIN of the team
    const membership = await prisma.teamUserMembership.findFirst({
      where: {
        teamId,
        userId: session.user.id,
        role: 'ADMIN',
        isActive: true,
      },
    })

    if (!membership) {
      return NextResponse.json(
        { error: 'Only team admins can create billing plans' },
        { status: 403 }
      )
    }

    const parseResult = await parseJsonOrError(request)
    if (!parseResult.ok) return parseResult.error
    const validated = CreateBillingPlanSchema.parse(parseResult.data)

    // Create billing plan
    const plan = await prisma.teamBillingPlan.create({
      data: {
        teamId,
        planName: validated.planName,
        description: validated.description || null,
        price: validated.price,
        currency: validated.currency,
        billingCycle: validated.billingCycle,
        maxAthletes: validated.maxAthletes || null,
      },
    })

    return NextResponse.json(plan, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 422 }
      )
    }
    console.error('[billing-plans] POST error:', error)
    return NextResponse.json({ error: 'Error creating billing plan' }, { status: 500 })
  }
}
