import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; mid: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, mid } = await params;

  const coach = await prisma.coach.findUnique({ where: { userId: session.user.id }, select: { id: true } });
  const athlete = await prisma.athlete.findUnique({ where: { id }, select: { coachId: true } });

  if (!coach || !athlete || athlete.coachId !== coach.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.bodyMeasurement.delete({ where: { id: mid } });
  return NextResponse.json({ ok: true });
}
