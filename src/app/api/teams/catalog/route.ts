import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { resolveTeamId } from "@/lib/api/auth-helpers";

export const dynamic = "force-dynamic";

export const DEFAULT_GOALS = [
  { code: "VOLUMEN", label: "Volumen", description: "Construir masa muscular con superávit controlado.", order: 0 },
  { code: "DEFINICION", label: "Definición", description: "Reducir grasa preservando músculo en déficit.", order: 1 },
  { code: "MANTENIMIENTO", label: "Mantenimiento", description: "Mantener composición corporal actual.", order: 2 },
  { code: "PEAK_WEEK", label: "Peak Week", description: "Puesta a punto previa a competición.", order: 3 },
];


export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get("teamId") ?? (await resolveTeamId(session.user.id));

  if (!teamId) {
    return NextResponse.json({
      teamId: null,
      goals: DEFAULT_GOALS.map((g) => ({ ...g, id: null, isVisible: true, isDefault: true })),
      phases: [],
    });
  }

  const [goals, phases] = await Promise.all([
    prisma.teamGoal.findMany({
      where: { teamId },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    }),
    prisma.teamPhase.findMany({
      where: { teamId, isVisible: true },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  const resolvedGoals =
    goals.length > 0
      ? goals.map((g) => ({ ...g, isDefault: false }))
      : DEFAULT_GOALS.map((g) => ({ ...g, id: null, isVisible: true, isDefault: true }));

  return NextResponse.json({ teamId, goals: resolvedGoals, phases });
}
