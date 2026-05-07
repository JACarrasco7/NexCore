import { NextRequest, NextResponse } from "next/server";
import { NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

// PATCH /api/check-ins/[id]  { coachNote: string }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  if (role !== "COACH" && role !== "ADMIN") {
    return NextResponse.json({ error: "Solo el coach puede responder check-ins" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json() as { coachNote?: string };

  const previous = await prisma.checkIn.findUnique({
    where: { id },
    include: { athlete: { select: { id: true, userId: true, fullName: true, coach: { select: { userId: true } } } } },
  });
  if (!previous) {
    return NextResponse.json({ error: "Check-in no encontrado" }, { status: 404 });
  }

  // Validate that the coach owns this athlete
  if (role === "COACH" && previous.athlete.coach?.userId !== session.user.id) {
    return NextResponse.json({ error: "Sin acceso a este check-in" }, { status: 403 });
  }

  const row = await prisma.checkIn.update({
    where: { id },
    data: { coachNote: body.coachNote ?? null },
  });

  if (body.coachNote?.trim() && previous.athlete.userId) {
    await createNotification({
      userId: previous.athlete.userId,
      type: NotificationType.COACH_NOTE,
      title: "Tu coach ha respondido al check-in",
      body: body.coachNote.trim().slice(0, 140),
      link: "/athlete/check-in",
    });
  }

  return NextResponse.json({ ...row, date: row.date.toISOString() });
}
