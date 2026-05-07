import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let coach = await prisma.coach.findUnique({
    where: { userId: session.user.id },
    select: { id: true, displayName: true },
  });

  // Auto-crear perfil coach si no existe (primera vez)
  if (!coach) {
    coach = await prisma.coach.create({
      data: {
        userId: session.user.id,
        displayName: session.user.name ?? session.user.email ?? "Coach",
      },
      select: { id: true, displayName: true },
    });
  }

  return NextResponse.json(coach);
}
