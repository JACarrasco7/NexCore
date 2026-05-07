import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { unlink } from "fs/promises";
import path from "path";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const log = await prisma.nutritionLog.findUnique({ where: { id }, select: { athleteId: true, photoUrl: true } });
  if (!log) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  // Verificar acceso
  const role = (session.user as { role?: string }).role;
  const athlete = await prisma.athlete.findUnique({ where: { id: log.athleteId }, select: { userId: true, coachId: true } });
  if (!athlete) return NextResponse.json({ error: "Atleta no encontrado" }, { status: 404 });

  let allowed = false;
  if (role === "ADMIN") allowed = true;
  else if (role === "ATHLETE") allowed = athlete.userId === session.user.id;
  else if (role === "COACH") {
    const coach = await prisma.coach.findUnique({ where: { userId: session.user.id }, select: { id: true } });
    allowed = coach?.id === athlete.coachId;
  }

  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Borrar foto si existe
  if (log.photoUrl) {
    try {
      const filePath = path.join(process.cwd(), "public", log.photoUrl);
      await unlink(filePath);
    } catch { /* no crítico */ }
  }

  await prisma.nutritionLog.delete({ where: { id } });
  await logAudit(session.user.id, "DELETE", "NutritionLog", id);
  return new NextResponse(null, { status: 204 });
}
