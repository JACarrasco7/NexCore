import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Goal } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { fullName, goal, coachEmail, weightKg } = await req.json();

    if (!fullName?.trim()) return NextResponse.json({ error: "fullName requerido" }, { status: 400 });
    if (!coachEmail?.trim()) return NextResponse.json({ error: "coachEmail requerido" }, { status: 400 });

    let user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, email: true } });
    if (!user && session.user.email) {
      user = await prisma.user.findUnique({
        where: { email: session.user.email.toLowerCase() },
        select: { id: true, email: true },
      });
    }
    if (!user) {
      return NextResponse.json({ error: "Sesión desactualizada. Cierra sesión y vuelve a entrar." }, { status: 401 });
    }

    const coachUser = await prisma.user.findUnique({
      where: { email: coachEmail.trim().toLowerCase() },
      select: { id: true, role: true },
    });
    if (!coachUser || coachUser.role !== "COACH") {
      return NextResponse.json({ error: "No se encontró un coach con ese email" }, { status: 404 });
    }

    let coach = await prisma.coach.findUnique({ where: { userId: coachUser.id } });
    if (!coach) {
      coach = await prisma.coach.create({
        data: { userId: coachUser.id, displayName: "Coach" },
      });
    }

    const existing = await prisma.athlete.findUnique({ where: { userId: user.id } });
    if (existing) {
      return NextResponse.json({ id: existing.id, alreadyExists: true });
    }

    const goalEnum: Goal =
      goal === "DEFINICION" ? Goal.DEFINICION
      : goal === "MANTENIMIENTO" ? Goal.MANTENIMIENTO
      : goal === "PEAK_WEEK" ? Goal.PEAK_WEEK
      : Goal.VOLUMEN;

    const athlete = await prisma.athlete.create({
      data: {
        userId: user.id,
        coachId: coach.id,
        fullName: fullName.trim(),
        goal: goalEnum,
        phaseLabel: weightKg ? `Inicio — ${weightKg} kg` : "Semana 1",
      },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { name: fullName.trim() },
    });

    return NextResponse.json({ id: athlete.id, coachId: coach.id }, { status: 201 });
  } catch (error) {
    console.error("onboarding/athlete POST failed", error);
    return NextResponse.json({ error: "Error interno al guardar onboarding de atleta" }, { status: 500 });
  }
}
