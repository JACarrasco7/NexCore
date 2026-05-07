import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { DEFAULT_GOALS } from "@/app/api/teams/catalog/route";
import { resolveAdminTeamId } from "@/lib/api/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "COACH" && role !== "ADMIN") return NextResponse.json({ error: "Sin acceso" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get("teamId") ?? (await resolveAdminTeamId(session.user.id));
  if (!teamId) {
    return NextResponse.json({
      teamId: null,
      goals: DEFAULT_GOALS.map((g) => ({ ...g, id: null, isVisible: true, isDefault: true })),
    });
  }

  const goals = await prisma.teamGoal.findMany({
    where: { teamId },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });

  const resolvedGoals =
    goals.length > 0
      ? goals.map((g) => ({ ...g, isDefault: false }))
      : DEFAULT_GOALS.map((g) => ({ ...g, id: null, isVisible: true, isDefault: true }));

  return NextResponse.json({ teamId, goals: resolvedGoals });
}

// PUT bulk upsert: [{ code, label, description?, isVisible, order }]
export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "COACH" && role !== "ADMIN") return NextResponse.json({ error: "Sin acceso" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get("teamId") ?? (await resolveAdminTeamId(session.user.id));
  if (!teamId) return NextResponse.json({ error: "Equipo no encontrado" }, { status: 404 });

  const body = await request.json() as Array<{
    code: string;
    label: string;
    description?: string;
    isVisible?: boolean;
    order?: number;
  }>;

  if (!Array.isArray(body)) return NextResponse.json({ error: "Se esperaba un array" }, { status: 400 });

  const results = await Promise.all(
    body.map((g) =>
      prisma.teamGoal.upsert({
        where: { teamId_code: { teamId, code: g.code } },
        update: {
          label: g.label,
          description: g.description ?? null,
          isVisible: g.isVisible ?? true,
          order: g.order ?? 0,
        },
        create: {
          teamId,
          code: g.code,
          label: g.label,
          description: g.description ?? null,
          isVisible: g.isVisible ?? true,
          order: g.order ?? 0,
        },
      })
    )
  );

  return NextResponse.json({ goals: results });
}
