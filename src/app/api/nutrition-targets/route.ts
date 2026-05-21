import { MacroTargetMode } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { nutritionTargetSchema } from "@/lib/validators";
import { parseJsonOrError } from '@/lib/api/json-parser'
import { unauthorized, badRequest, forbidden, notFound } from '@/lib/api/error-response'

export const dynamic = "force-dynamic";

async function resolveAthleteAccess(athleteId: string | null, userId: string, role: string | undefined) {
  if (role === "ATHLETE") {
    const athlete = await prisma.athlete.findUnique({ where: { userId }, select: { id: true, coachId: true } });
    if (!athlete) return { error: notFound('Atleta no encontrado') };
    return { athleteId: athlete.id, coachId: athlete.coachId };
  }

  if (!athleteId) return { error: badRequest('athleteId requerido') };

  const athlete = await prisma.athlete.findUnique({ where: { id: athleteId }, select: { id: true, coachId: true } });
  if (!athlete) return { error: notFound('Atleta no encontrado') };

  if (role === "ADMIN") return { athleteId: athlete.id, coachId: athlete.coachId };

  const coach = await prisma.coach.findUnique({ where: { userId }, select: { id: true } });
  if (!coach || coach.id !== athlete.coachId) {
    return { error: forbidden('Sin acceso') };
  }

  return { athleteId: athlete.id, coachId: coach.id };
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized('No autenticado')

  const athleteId = new URL(request.url).searchParams.get("athleteId");
  const role = (session.user as { role?: string }).role;
  const context = await resolveAthleteAccess(athleteId, session.user.id, role);
  if ("error" in context) return context.error;

  const explicitTarget = await prisma.athleteMacroTarget.findUnique({ where: { athleteId: context.athleteId } });
  if (explicitTarget) {
    return NextResponse.json({
      athleteId: context.athleteId,
      mode: explicitTarget.mode,
      source: explicitTarget.source,
      kcalTarget: explicitTarget.kcalTarget,
      proteinG: explicitTarget.proteinG,
      carbsG: explicitTarget.carbsG,
      fatG: explicitTarget.fatG,
    });
  }

  const plan = await prisma.nutritionPlan.findFirst({
    where: { athleteId: context.athleteId, isActive: true },
    orderBy: { createdAt: "desc" },
  });

  if (plan) {
    return NextResponse.json({
      athleteId: context.athleteId,
      mode: "FIXED",
      source: "plan",
      kcalTarget: plan.kcalTarget,
      proteinG: plan.proteinG,
      carbsG: plan.carbsG,
      fatG: plan.fatG,
    });
  }

  return NextResponse.json({
    athleteId: context.athleteId,
    mode: "FLEXIBLE",
    source: "default",
    kcalTarget: 0,
    proteinG: 0,
    carbsG: 0,
    fatG: 0,
  });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized('No autenticado')

  const role = (session.user as { role?: string }).role;
  const parsedBody = await parseJsonOrError(request)
  if (!parsedBody.ok) return parsedBody.error
  const parsed = nutritionTargetSchema.safeParse(parsedBody.data);
  if (!parsed.success) {
    return badRequest('Objetivos inválidos', parsed.error.flatten().fieldErrors)
  }

  const context = await resolveAthleteAccess(parsed.data.athleteId ?? null, session.user.id, role);
  if ("error" in context) return context.error;

  const target = await prisma.athleteMacroTarget.upsert({
    where: { athleteId: context.athleteId },
    create: {
      athleteId: context.athleteId,
      coachId: context.coachId,
      updatedByUserId: session.user.id,
      source: role === "ATHLETE" ? "athlete" : "coach",
      mode: (parsed.data.mode as MacroTargetMode | undefined) ?? MacroTargetMode.FLEXIBLE,
      kcalTarget: parsed.data.kcalTarget,
      proteinG: parsed.data.proteinG,
      carbsG: parsed.data.carbsG,
      fatG: parsed.data.fatG,
    },
    update: {
      coachId: context.coachId,
      updatedByUserId: session.user.id,
      source: role === "ATHLETE" ? "athlete" : "coach",
      mode: (parsed.data.mode as MacroTargetMode | undefined) ?? MacroTargetMode.FLEXIBLE,
      kcalTarget: parsed.data.kcalTarget,
      proteinG: parsed.data.proteinG,
      carbsG: parsed.data.carbsG,
      fatG: parsed.data.fatG,
    },
  });

  return NextResponse.json({
    athleteId: target.athleteId,
    mode: target.mode,
    source: target.source,
    kcalTarget: target.kcalTarget,
    proteinG: target.proteinG,
    carbsG: target.carbsG,
    fatG: target.fatG,
  });
}
