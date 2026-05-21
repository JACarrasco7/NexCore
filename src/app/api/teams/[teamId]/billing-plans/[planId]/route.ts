import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { z } from 'zod'
import { parseJsonOrError } from '@/lib/api/json-parser'

export const dynamic = 'force-dynamic'

const UpdateBillingPlanSchema = z.object({
  planName: z.string().min(1, 'Plan name required').optional(),
  description: z.string().nullable().optional(),
  price: z.number().min(0, 'Price must be >= 0').optional(),
  currency: z.string().optional(),
  billingCycle: z.enum(['MONTHLY', 'YEARLY', 'ONE_TIME']).optional(),
  maxAthletes: z.number().nullable().optional(),
  isActive: z.boolean().optional(),
})

/**
 * GET /api/teams/[teamId]/billing-plans/[planId]
 * Get a specific billing plan
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ teamId: string; planId: string }> }
) {
  const { teamId, planId } = await params
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

    // Get the plan
    const plan = await prisma.teamBillingPlan.findUnique({
      where: {
        id: planId,
        teamId,
      },
    })

    if (!plan) {
      return NextResponse.json({ error: 'Billing plan not found' }, { status: 404 })
    }

    return NextResponse.json(plan)
  } catch (error) {
    console.error('[billing-plans-[planId]] GET error:', error)
    return NextResponse.json({ error: 'Error fetching billing plan' }, { status: 500 })
  }
}

/**
 * PUT /api/teams/[teamId]/billing-plans/[planId]
 * Update a billing plan (only ADMIN can update)
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ teamId: string; planId: string }> }
) {
  const { teamId, planId } = await params
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
        { error: 'Only team admins can update billing plans' },
        { status: 403 }
      )
    }

    // Verify plan exists
    const existingPlan = await prisma.teamBillingPlan.findUnique({
      where: { id: planId },
    })

    if (!existingPlan || existingPlan.teamId !== teamId) {
      return NextResponse.json({ error: 'Billing plan not found' }, { status: 404 })
    }

    const parseResult = await parseJsonOrError(request)
    if (!parseResult.ok) return parseResult.error
    const validated = UpdateBillingPlanSchema.parse(parseResult.data)

    // Update plan
    const updated = await prisma.teamBillingPlan.update({
      where: { id: planId },
      data: {
        ...(validated.planName && { planName: validated.planName }),
        ...(validated.description !== undefined && {
          description: validated.description,
        }),
        ...(validated.price !== undefined && { price: validated.price }),
        ...(validated.currency && { currency: validated.currency }),
        ...(validated.billingCycle && {
          billingCycle: validated.billingCycle,
        }),
        ...(validated.maxAthletes !== undefined && {
          maxAthletes: validated.maxAthletes,
        }),
        ...(validated.isActive !== undefined && { isActive: validated.isActive }),
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 422 }
      )
    }
    console.error('[billing-plans-[planId]] PUT error:', error)
    return NextResponse.json({ error: 'Error updating billing plan' }, { status: 500 })
  }
}

/**
 * DELETE /api/teams/[teamId]/billing-plans/[planId]
 * Delete a billing plan (only ADMIN can delete)
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ teamId: string; planId: string }> }
) {
  const { teamId, planId } = await params
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
        { error: 'Only team admins can delete billing plans' },
        { status: 403 }
      )
    }

    // Verify plan exists
    const existingPlan = await prisma.teamBillingPlan.findUnique({
      where: { id: planId },
    })

    if (!existingPlan || existingPlan.teamId !== teamId) {
      return NextResponse.json({ error: 'Billing plan not found' }, { status: 404 })
    }

    // Delete plan
    await prisma.teamBillingPlan.delete({
      where: { id: planId },
    })

    return NextResponse.json(null, { status: 204 })
  } catch (error) {
    console.error('[billing-plans-[planId]] DELETE error:', error)
    return NextResponse.json({ error: 'Error deleting billing plan' }, { status: 500 })
  }
}
