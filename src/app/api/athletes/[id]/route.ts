import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { auditMutation } from "@/lib/api/audit";

export const dynamic = "force-dynamic";

async function getSessionUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    role: (session.user as { role?: string }).role ?? null,
  };
}

function canReadAthlete(role: string | null, sessionUserId: string, athleteUserId: string | null, coachUserId: string | null) {
  if (role === "ADMIN") return true;
  if (role === "COACH") return coachUserId === sessionUserId;
  if (role === "ATHLETE") return athleteUserId === sessionUserId;
  return false;
}

function canManageAthlete(role: string | null, sessionUserId: string, coachUserId: string | null) {
  if (role === "ADMIN") return true;
  if (role === "COACH") return coachUserId === sessionUserId;
  return false;
}

function cadenceToApi(value: "DAILY" | "WEEKLY" | "WORKOUT" | "CHECKIN" | "CUSTOM_DAYS" | null | undefined) {
  if (!value) return "checkin";
  return value.toLowerCase().replace("_", "-");
}

function reviewCadenceToApi(value: "WEEKLY" | "CHECKIN" | "CUSTOM_DAYS" | null | undefined) {
  if (!value) return "checkin";
  return value.toLowerCase().replace("_", "-");
}

function cadenceFromApi(value: string | undefined): "DAILY" | "WEEKLY" | "WORKOUT" | "CHECKIN" | "CUSTOM_DAYS" | undefined {
  if (!value) return undefined;
  const map: Record<string, "DAILY" | "WEEKLY" | "WORKOUT" | "CHECKIN" | "CUSTOM_DAYS"> = {
    daily: "DAILY",
    weekly: "WEEKLY",
    workout: "WORKOUT",
    checkin: "CHECKIN",
    "custom-days": "CUSTOM_DAYS",
  };
  return map[value];
}

function reviewCadenceFromApi(value: string | undefined): "WEEKLY" | "CHECKIN" | "CUSTOM_DAYS" | undefined {
  if (!value) return undefined;
  const map: Record<string, "WEEKLY" | "CHECKIN" | "CUSTOM_DAYS"> = {
    weekly: "WEEKLY",
    checkin: "CHECKIN",
    "custom-days": "CUSTOM_DAYS",
  };
  return map[value];
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { id } = await params;
  const athlete = await prisma.athlete.findUnique({
    where: { id },
    include: {
      coach: { select: { displayName: true, userId: true } },
      user:  { select: { id: true, email: true } },
      team: {
        select: {
          id: true,
          name: true,
          userMemberships: {
            where: { isActive: true },
            select: { userId: true },
          },
        },
      },
    },
  });
  if (!athlete) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const canReadByLegacy = canReadAthlete(sessionUser.role, sessionUser.id, athlete.user?.id ?? null, athlete.coach?.userId ?? null);
  const canReadByTeam = sessionUser.role === "COACH" && !!athlete.team?.userMemberships.some((m) => m.userId === sessionUser.id);
  if (!canReadByLegacy && !canReadByTeam) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    id: athlete.id,
    userId: athlete.user?.id ?? null,
    fullName: athlete.fullName,
    goal: athlete.goal.toLowerCase().replace("_", "-"),
    phaseLabel: athlete.phaseLabel,
    phone: athlete.phone,
    contactEmail: athlete.user?.email ?? athlete.contactEmail,
    primaryComment: athlete.primaryComment,
    teamId: athlete.teamId,
    teamName: athlete.team?.name ?? null,
    coachName: athlete.coach?.displayName ?? "Coach",
    coachUserId: athlete.coach?.userId ?? null,
    measurementCadence: cadenceToApi(athlete.measurementCadence),
    measurementEveryDays: athlete.measurementEveryDays,
    reviewCadence: reviewCadenceToApi(athlete.reviewCadence),
    reviewEveryDays: athlete.reviewEveryDays,
    healthConnections: athlete.healthConnections ? JSON.parse(athlete.healthConnections) : [],
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { id } = await params;
  const athlete = await prisma.athlete.findUnique({
    where: { id },
    select: {
      coach: { select: { userId: true } },
      team: {
        select: {
          userMemberships: {
            where: { isActive: true },
            select: { userId: true },
          },
        },
      },
    },
  });
  if (!athlete) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const canManageByLegacy = canManageAthlete(sessionUser.role, sessionUser.id, athlete.coach?.userId ?? null);
  const canManageByTeam = sessionUser.role === "COACH" && !!athlete.team?.userMemberships.some((m) => m.userId === sessionUser.id);
  if (!canManageByLegacy && !canManageByTeam) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.athlete.delete({ where: { id } }).catch(() => null);
  await logAudit(sessionUser.id, "DELETE", "Athlete", id);
  return new NextResponse(null, { status: 204 });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { id } = await params;
  const athlete = await prisma.athlete.findUnique({
    where: { id },
    select: {
      coach: { select: { userId: true } },
      team: {
        select: {
          userMemberships: {
            where: { isActive: true },
            select: { userId: true },
          },
        },
      },
      fullName: true,
      goal: true,
      phaseLabel: true,
      phone: true,
      contactEmail: true,
      primaryComment: true,
    },
  });
  if (!athlete) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const canManageByLegacy = canManageAthlete(sessionUser.role, sessionUser.id, athlete.coach?.userId ?? null);
  const canManageByTeam = sessionUser.role === "COACH" && !!athlete.team?.userMemberships.some((m) => m.userId === sessionUser.id);
  if (!canManageByLegacy && !canManageByTeam) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const goalMap: Record<string, string> = {
    volumen: "VOLUMEN",
    definicion: "DEFINICION",
    mantenimiento: "MANTENIMIENTO",
    "peak-week": "PEAK_WEEK",
  };
  const updated = await prisma.athlete.update({
    where: { id },
    data: {
      ...(body.goal ? { goal: goalMap[body.goal] as "VOLUMEN" | "DEFINICION" | "MANTENIMIENTO" | "PEAK_WEEK" } : {}),
      ...(body.phaseLabel !== undefined ? { phaseLabel: body.phaseLabel } : {}),
      ...(body.fullName !== undefined ? { fullName: body.fullName } : {}),
      ...(body.phone !== undefined ? { phone: body.phone ? String(body.phone).trim() : null } : {}),
      ...(body.contactEmail !== undefined ? { contactEmail: body.contactEmail ? String(body.contactEmail).trim().toLowerCase() : null } : {}),
      ...(body.primaryComment !== undefined ? { primaryComment: body.primaryComment ? String(body.primaryComment).trim() : null } : {}),
      ...(body.measurementCadence !== undefined ? { measurementCadence: cadenceFromApi(body.measurementCadence) } : {}),
      ...(body.measurementEveryDays !== undefined ? { measurementEveryDays: body.measurementEveryDays } : {}),
      ...(body.reviewCadence !== undefined ? { reviewCadence: reviewCadenceFromApi(body.reviewCadence) } : {}),
      ...(body.reviewEveryDays !== undefined ? { reviewEveryDays: body.reviewEveryDays } : {}),
    },
    include: { coach: { select: { displayName: true } }, user: { select: { email: true } } },
  });

  await auditMutation({
    entity: "Athlete",
    entityId: id,
    action: "UPDATE",
    before: {
      fullName: athlete.fullName,
      goal: athlete.goal,
      phaseLabel: athlete.phaseLabel,
      phone: athlete.phone,
      contactEmail: athlete.contactEmail,
      primaryComment: athlete.primaryComment,
    },
    after: {
      fullName: updated.fullName,
      goal: updated.goal,
      phaseLabel: updated.phaseLabel,
      phone: updated.phone,
      contactEmail: updated.contactEmail,
      primaryComment: updated.primaryComment,
    },
    userId: sessionUser.id,
  });

  return NextResponse.json({
    id: updated.id,
    fullName: updated.fullName,
    goal: updated.goal.toLowerCase().replace("_", "-"),
    phaseLabel: updated.phaseLabel,
    phone: updated.phone,
    contactEmail: updated.user?.email ?? updated.contactEmail,
    primaryComment: updated.primaryComment,
    teamId: updated.teamId,
    coachName: updated.coach?.displayName ?? "Coach",
    measurementCadence: cadenceToApi(updated.measurementCadence),
    measurementEveryDays: updated.measurementEveryDays,
    reviewCadence: reviewCadenceToApi(updated.reviewCadence),
    reviewEveryDays: updated.reviewEveryDays,
    healthConnections: updated.healthConnections ? JSON.parse(updated.healthConnections) : [],
  });
}
