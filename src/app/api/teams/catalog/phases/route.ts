import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { resolveAdminTeamId } from "@/lib/api/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "COACH" && role !== "ADMIN") return NextResponse.json({ error: "Sin acceso" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get("teamId") ?? (await resolveAdminTeamId(session.user.id));
  if (!teamId) return NextResponse.json({ teamId: null, phases: [] });

  const phases = await prisma.teamPhase.findMany({
    where: { teamId },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ teamId, phases });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "COACH" && role !== "ADMIN") return NextResponse.json({ error: "Sin acceso" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get("teamId") ?? (await resolveAdminTeamId(session.user.id));
  if (!teamId) return NextResponse.json({ error: "Equipo no encontrado" }, { status: 404 });

  const body = await request.json() as {
    code?: string;
    label: string;
    description?: string;
    isVisible?: boolean;
    order?: number;
  };

  if (!body.label?.trim()) return NextResponse.json({ error: "label es requerido" }, { status: 400 });

  const count = await prisma.teamPhase.count({ where: { teamId } });
  const code = body.code?.trim() || `phase-${Date.now()}`;

  const phase = await prisma.teamPhase.create({
    data: {
      teamId,
      code,
      label: body.label.trim(),
      description: body.description?.trim() ?? null,
      isVisible: body.isVisible ?? true,
      order: body.order ?? count,
    },
  });

  return NextResponse.json(phase, { status: 201 });
}
