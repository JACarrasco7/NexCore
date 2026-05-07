import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

/**
 * A user can manage a phase if they are:
 * - A COACH or ADMIN (user.role) AND an active member of the team that owns the phase
 * - OR a global ADMIN user regardless of team membership
 */
async function assertOwnership(userId: string, phaseId: string) {
  const phase = await prisma.teamPhase.findUnique({
    where: { id: phaseId },
    select: { teamId: true },
  });
  if (!phase) return null;

  const [user, membership] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { role: true } }),
    prisma.teamUserMembership.findUnique({
      where: { teamId_userId: { teamId: phase.teamId, userId } },
      select: { isActive: true },
    }),
  ]);

  const isGlobalAdmin = user?.role === "ADMIN";
  const isTeamCoach = (user?.role === "COACH" || user?.role === "ADMIN") && membership?.isActive === true;
  if (!isGlobalAdmin && !isTeamCoach) return null;

  return phase;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const ownership = await assertOwnership(session.user.id, id);
  if (!ownership) return NextResponse.json({ error: "Sin acceso" }, { status: 403 });

  const body = await request.json() as {
    label?: string;
    description?: string;
    isVisible?: boolean;
    order?: number;
  };

  const updated = await prisma.teamPhase.update({
    where: { id },
    data: {
      ...(body.label !== undefined ? { label: body.label.trim() } : {}),
      ...(body.description !== undefined ? { description: body.description?.trim() ?? null } : {}),
      ...(body.isVisible !== undefined ? { isVisible: body.isVisible } : {}),
      ...(body.order !== undefined ? { order: body.order } : {}),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const ownership = await assertOwnership(session.user.id, id);
  if (!ownership) return NextResponse.json({ error: "Sin acceso" }, { status: 403 });

  await prisma.teamPhase.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
