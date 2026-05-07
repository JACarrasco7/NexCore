import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

// GET /api/me/coach-for-athlete
// Devuelve el coach asignado al atleta autenticado con su userId (para el chat)
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const athlete = await prisma.athlete.findUnique({
    where: { userId: session.user.id },
    include: {
      coach: {
        include: { user: { select: { id: true } } },
      },
    },
  });

  if (!athlete?.coach) {
    return NextResponse.json({ error: "Sin coach asignado" }, { status: 404 });
  }

  return NextResponse.json({
    id: athlete.coach.id,
    userId: athlete.coach.user.id,
    displayName: athlete.coach.displayName,
  });
}
