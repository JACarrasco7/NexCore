import { NextResponse } from "next/server";
import { unlink } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

async function canDeletePhoto(userId: string, role: string | undefined, photoId: string): Promise<boolean> {
  const photo = await prisma.progressPhoto.findUnique({
    where: { id: photoId },
    include: { athlete: { select: { userId: true, coachId: true } } },
  });
  if (!photo) return false;

  if (role === "ATHLETE") return photo.athlete.userId === userId;

  if (role === "COACH" || role === "ADMIN") {
    const coach = await prisma.coach.findUnique({ where: { userId }, select: { id: true } });
    return coach?.id === photo.athlete.coachId;
  }
  return false;
}

/** DELETE /api/progress-photos/[id] */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  if (!(await canDeletePhoto(session.user.id, role, id))) {
    return NextResponse.json({ error: "Sin acceso" }, { status: 403 });
  }

  const photo = await prisma.progressPhoto.findUnique({ where: { id }, select: { url: true } });
  if (!photo) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  // Borrar archivo físico si es local
  if (photo.url.startsWith("/uploads/")) {
    const filePath = path.join(process.cwd(), "public", photo.url);
    await unlink(filePath).catch(() => null);
  }

  await prisma.progressPhoto.delete({ where: { id } });
  await logAudit(session.user.id, "DELETE", "ProgressPhoto", id);
  return NextResponse.json({ ok: true });
}
