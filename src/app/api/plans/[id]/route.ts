import { apiHandler } from '@/lib/api/api-handler';
import { prisma } from '@/lib/prisma';
import { auditMutation } from '@/lib/api/audit';
import { z } from 'zod';
import { parseJsonOrError } from '@/lib/api/json-parser';

export const dynamic = 'force-dynamic';

async function getCoachId(userId: string) {
  const coach = await prisma.coach.findUnique({ where: { userId }, select: { id: true } });
  return coach?.id ?? null;
}

async function canManagePlan(coachId: string, planId: string) {
  const plan = await prisma.plan.findUnique({ where: { id: planId }, select: { coachId: true } });
  return plan?.coachId === coachId;
}

export const GET = apiHandler({
  auth: 'coach',
  handler: async ({ params, session }) => {
    const id = params.id;
    const coachId = await getCoachId(session.user.id);
    if (!coachId) throw new Error('No es coach');
    if (!(await canManagePlan(coachId, id))) throw new Error('Sin acceso');

    const plan = await prisma.plan.findUnique({
      where: { id },
      include: {
        sessions: {
          orderBy: { order: 'asc' },
          include: { exercises: { orderBy: { order: 'asc' } } },
        },
      },
    });

    if (!plan) throw new Error('Plan no encontrado');
    return plan;
  },
});

export const PATCH = apiHandler({
  auth: 'coach',
  handler: async ({ params, req, session }) => {
    const id = params.id;
    const coachId = await getCoachId(session.user.id);
    if (!coachId) throw new Error('No es coach');
    if (!(await canManagePlan(coachId, id))) throw new Error('Sin acceso');

    const before = await prisma.plan.findUnique({ where: { id }, select: { title: true, weekLabel: true, athleteId: true } });

    const patchSchema = z.object({
      title: z.string().min(1).max(200).optional(),
      weekLabel: z.string().min(1).max(100).optional(),
      athleteId: z.string().min(1).optional(),
    });

    const parseResult = await parseJsonOrError(req);
    if (!parseResult.ok) return parseResult.error;
    const parsed = patchSchema.safeParse(parseResult.data);
    if (!parsed.success) {
      return { error: 'Datos inválidos', details: parsed.error.flatten() } as any;
    }
    const body = parsed.data;

    const updated = await prisma.plan.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.weekLabel !== undefined && { weekLabel: body.weekLabel }),
        ...(body.athleteId !== undefined && { athleteId: body.athleteId }),
      },
    });

    await auditMutation({
      entity: 'Plan',
      entityId: id,
      action: 'UPDATE',
      before: before ?? undefined,
      after: { title: updated.title, weekLabel: updated.weekLabel, athleteId: updated.athleteId },
      userId: session.user.id,
    });

    return updated;
  },
});

export const DELETE = apiHandler({
  auth: 'coach',
  handler: async ({ params, session }) => {
    const id = params.id;
    const coachId = await getCoachId(session.user.id);
    if (!coachId) throw new Error('No es coach');
    if (!(await canManagePlan(coachId, id))) throw new Error('Sin acceso');

    await prisma.plan.update({ where: { id }, data: { deletedAt: new Date() } });

    await auditMutation({ entity: 'Plan', entityId: id, action: 'DELETE', before: undefined, userId: session.user.id });

    return { ok: true };
  },
});
