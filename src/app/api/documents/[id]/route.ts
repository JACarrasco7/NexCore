import { NextRequest, NextResponse } from "next/server";
import { unlink } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// DELETE /api/documents/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  // Solo el coach dueño puede borrar
  const coach = await prisma.coach.findUnique({ where: { userId: session.user.id } });
  if (!coach || coach.id !== doc.coachId) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  // Eliminar archivo del disco
  try {
    const filePath = path.join(process.cwd(), "public", doc.fileUrl);
    await unlink(filePath);
  } catch {
    // Si el archivo ya no existe, ignorar
  }

  await prisma.document.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
