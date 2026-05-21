import { apiHandler } from '@/lib/api/api-handler';
import { prisma } from '@/lib/prisma';
import { parseJsonOrError } from '@/lib/api/json-parser';
import { assertAthleteAccess, assertCoachOwnsAthlete } from '@/lib/api';
import { planSchema } from '@/lib/validators';
import { trainingService } from '@/lib/services/training';

export const dynamic = 'force-dynamic';

export const GET = apiHandler({
  auth: 'session',
  handler: async ({ req }) => {
    const { searchParams } = new URL(req.url);
    const athleteId = searchParams.get('athleteId') ?? undefined;

    if (!athleteId) throw new Error('athleteId requerido');

    await assertAthleteAccess(athleteId);

    const plans = await prisma.plan.findMany({
      where: { athleteId, deletedAt: null },
      include: { sessions: { include: { exercises: { orderBy: { order: 'asc' } } }, orderBy: { order: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });

    const mapped = plans.map((p) => ({
      id: p.id,
      athleteId: p.athleteId,
      title: p.title,
      weekLabel: p.weekLabel,
      sessions: p.sessions.map((s) => ({
        id: s.id,
        name: s.name,
        block: s.block,
        exercises: s.exercises.map((e) => ({
          exercise:        e.exercise,
          sets:            e.sets,
          reps:            e.reps,
          targetRir:       e.targetRir        ?? undefined,
          restSeconds:     e.restSeconds      ?? undefined,
          notes:           e.notes            ?? undefined,
          technique:       e.technique        ?? undefined,
          techniqueDetail: e.techniqueDetail  ?? undefined,
          loadKg:          e.loadKg           ?? undefined,
          loadNote:        e.loadNote         ?? undefined,
          tempoEcc:        e.tempoEcc         ?? undefined,
          tempoPause:      e.tempoPause       ?? undefined,
          tempoConc:       e.tempoConc        ?? undefined,
          coachCue:        e.coachCue         ?? undefined,
          progressionNote: e.progressionNote  ?? undefined,
          videoUrl:        e.videoUrl         ?? undefined,
        })),
      })),
    }));

    return mapped;
  },
});

export const POST = apiHandler({
  auth: 'coach',
  handler: async ({ req, session }) => {
    const parseResult = await parseJsonOrError(req);
    if (!parseResult.ok) return parseResult.error;

    const parsed = planSchema.safeParse(parseResult.data);
    if (!parsed.success) {
      return { error: 'Datos inválidos', details: parsed.error.flatten() } as any;
    }
    const body = parsed.data;

    await assertCoachOwnsAthlete(body.athleteId);

    // Ensure each session has a `block` (service expects it)
    const input = {
      ...body,
      sessions: (body.sessions || []).map((s: any) => ({ ...s, block: body.block ?? '' })),
    };

    // Use service to create plan (includes audit)
    const created = await trainingService.createPlan(input, session.user.id);

    return created;
  },
});
