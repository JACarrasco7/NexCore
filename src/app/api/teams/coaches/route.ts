import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const role = (session.user as { role?: string }).role ?? "ATHLETE";
  if (role !== "COACH" && role !== "ADMIN") {
    return NextResponse.json({ error: "Sin acceso" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const teamIdParam = searchParams.get("teamId") ?? undefined;

  // ADMIN can inspect any team by query. COACH is restricted to own memberships.
  if (role === "ADMIN") {
    if (!teamIdParam) return NextResponse.json({ teamId: null, coaches: [] });

    const memberships = await prisma.teamUserMembership.findMany({
      where: { teamId: teamIdParam, isActive: true },
      include: { user: { include: { coachProfile: true } } },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    });

    return NextResponse.json({
      teamId: teamIdParam,
      coaches: memberships
        .filter((m) => m.user.coachProfile)
        .map((m) => ({
          coachId: m.user.coachProfile!.id,
          displayName: m.user.coachProfile!.displayName,
          email: m.user.email,
          phone: m.user.coachProfile!.phone,
          role: m.role,
        })),
    });
  }

  const ownMemberships = await prisma.teamUserMembership.findMany({
    where: { userId: session.user.id, isActive: true },
    select: { teamId: true },
    orderBy: { createdAt: "asc" },
  });

  if (ownMemberships.length === 0) {
    return NextResponse.json({ teamId: null, coaches: [] });
  }

  const allowedTeamIds = ownMemberships.map((m) => m.teamId);
  const teamId = teamIdParam && allowedTeamIds.includes(teamIdParam)
    ? teamIdParam
    : allowedTeamIds[0];

  const memberships = await prisma.teamUserMembership.findMany({
    where: { teamId, isActive: true },
    include: { user: { include: { coachProfile: true } } },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({
    teamId,
    coaches: memberships
      .filter((m) => m.user.coachProfile)
      .map((m) => ({
        coachId: m.user.coachProfile!.id,
        displayName: m.user.coachProfile!.displayName,
        email: m.user.email,
        phone: m.user.coachProfile!.phone,
        role: m.role,
      })),
  });
}
