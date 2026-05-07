import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { assertAthleteAccess, assertCoachOwnsAthlete, auditMutation } from "@/lib/api";
import { nutritionPlanSchema } from "@/lib/validators";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const athleteId = searchParams.get("athleteId");

  const userId = (session.user as { id: string }).id;
  const role = (session.user as { role: string }).role;

  let resolvedAthleteId = athleteId;

  if (!resolvedAthleteId && role === "ATHLETE") {
    const athlete = await prisma.athlete.findFirst({ where: { userId }, select: { id: true } });
    resolvedAthleteId = athlete?.id ?? null;
  }

  if (!resolvedAthleteId) {
    return NextResponse.json({ error: "athleteId required" }, { status: 400 });
  }

  try {
    await assertAthleteAccess(resolvedAthleteId);
  } catch {
    return NextResponse.json({ error: "Sin acceso" }, { status: 403 });
  }

  const plans = await prisma.nutritionPlan.findMany({
    where: { athleteId: resolvedAthleteId, deletedAt: null },
    include: {
      meals: {
        orderBy: { order: "asc" },
        include: { foods: { orderBy: { order: "asc" } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(plans);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role: string }).role;
  if (role !== "COACH" && role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = (session.user as { id: string }).id;
  const coach = await prisma.coach.findFirst({ where: { userId } });
  if (!coach) return NextResponse.json({ error: "Coach not found" }, { status: 404 });

  let rawBody: unknown;
  try { rawBody = await req.json(); } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = nutritionPlanSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 422 });
  }
  const body = parsed.data;

  try {
    await assertCoachOwnsAthlete(body.athleteId);
  } catch {
    return NextResponse.json({ error: "Sin acceso al atleta" }, { status: 403 });
  }

  const plan = await prisma.$transaction(async (tx) => {
    return tx.nutritionPlan.create({
      data: {
        athleteId: body.athleteId,
        coachId: coach.id,
        title: body.title,
        phase: body.phase ?? "Activo",
        kcalTarget: body.kcalTarget ?? 0,
        proteinG: body.proteinG ?? 0,
        carbsG: body.carbsG ?? 0,
        fatG: body.fatG ?? 0,
        notes: body.notes,
        meals: body.meals.length > 0
          ? {
              create: body.meals.map((m, i) => ({
                name: m.name,
                time: m.time ?? "",
                order: m.order ?? i,
                foods: m.foods.length > 0
                  ? {
                      create: m.foods.map((f, j) => ({
                        food: f.food,
                        quantity: f.quantity ?? 0,
                        unit: f.unit ?? "g",
                        kcal: f.kcal,
                        proteinG: f.proteinG,
                        carbsG: f.carbsG,
                        fatG: f.fatG,
                        order: f.order ?? j,
                      })),
                    }
                  : undefined,
              })),
            }
          : undefined,
      },
      include: {
        meals: { orderBy: { order: "asc" }, include: { foods: { orderBy: { order: "asc" } } } },
      },
    });
  });

  await auditMutation({
    entity: "NutritionPlan",
    entityId: plan.id,
    action: "CREATE",
    after: { athleteId: plan.athleteId, title: plan.title },
    userId,
  });

  return NextResponse.json(plan, { status: 201 });
}
