import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

async function getCoachId(userId: string) {
  const coach = await prisma.coach.findUnique({ where: { userId }, select: { id: true } });
  return coach?.id ?? null;
}

/** GET /api/plans/templates — listar plantillas del coach */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const coachId = await getCoachId(session.user.id);
  if (!coachId) return NextResponse.json({ error: "No es coach" }, { status: 403 });

  const templates = await prisma.trainingTemplate.findMany({
    where: { coachId },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, description: true, splitType: true, createdAt: true },
  });

  return NextResponse.json(templates);
}

/** POST /api/plans/templates — crear nueva plantilla */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const coachId = await getCoachId(session.user.id);
  if (!coachId) return NextResponse.json({ error: "No es coach" }, { status: 403 });

  const body: { name: string; description?: string; splitType?: string; payload: unknown } = await req.json();

  if (!body.name?.trim()) return NextResponse.json({ error: "Nombre obligatorio" }, { status: 400 });
  if (!body.payload) return NextResponse.json({ error: "Payload obligatorio" }, { status: 400 });

  const template = await prisma.trainingTemplate.create({
    data: {
      coachId,
      name: body.name.trim(),
      description: body.description ?? null,
      splitType: body.splitType ?? null,
      payload: body.payload as object,
    },
  });

  return NextResponse.json(template, { status: 201 });
}
