import { MacroTargetMode } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { nutritionTargetSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

async function resolveAthleteAccess(athleteId: string | null, userId: string, role: string | undefined) {
  if (role === "ATHLETE") {
    const athlete = await prisma.athlete.findUnique({ where: { userId }, select: { id: true, coachId: true } });
    if (!athlete) return { error: NextResponse.json({ error: "Atleta no encontrado" }, { status: 404 }) };
    return { athleteId: athlete.id, coachId: athlete.coachId };
  }

  if (!athleteId) return { error: NextResponse.json({ error: "athleteId requerido" }, { status: 400 }) };

  const athlete = await prisma.athlete.findUnique({ where: { id: athleteId }, select: { id: true, coachId: true } });
  if (!athlete) return { error: NextResponse.json({ error: "Atleta no encontrado" }, { status: 404 }) };

  if (role === "ADMIN") return { athleteId: athlete.id, coachId: athlete.coachId };

  const coach = await prisma.coach.findUnique({ where: { userId }, select: { id: true } });
  if (!coach || coach.id !== athlete.coachId) {
    return { error: NextResponse.json({ error: "Sin acceso" }, { status: 403 }) };
  }

  return { athleteId: athlete.id, coachId: coach.id };
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

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
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  const body = await request.json().catch(() => ({}));
  const parsed = nutritionTargetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Objetivos inválidos", details: parsed.error.flatten().fieldErrors }, { status: 422 });
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
