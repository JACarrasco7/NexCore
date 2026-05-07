import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

async function getCoachId(userId: string) {
  const coach = await prisma.coach.findUnique({ where: { userId }, select: { id: true } });
  return coach?.id ?? null;
}

async function canManageTemplate(coachId: string, templateId: string) {
  const t = await prisma.trainingTemplate.findUnique({ where: { id: templateId }, select: { coachId: true } });
  return t?.coachId === coachId;
}

/** GET /api/plans/templates/[tid] — detalle completo (incluye payload) */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tid: string }> }
) {
  const { tid } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const coachId = await getCoachId(session.user.id);
  if (!coachId) return NextResponse.json({ error: "No es coach" }, { status: 403 });
  if (!(await canManageTemplate(coachId, tid))) return NextResponse.json({ error: "Sin acceso" }, { status: 403 });

  const template = await prisma.trainingTemplate.findUnique({ where: { id: tid } });
  if (!template) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  return NextResponse.json(template);
}

/** PATCH /api/plans/templates/[tid] — editar nombre/desc/splitType/payload */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ tid: string }> }
) {
  const { tid } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const coachId = await getCoachId(session.user.id);
  if (!coachId) return NextResponse.json({ error: "No es coach" }, { status: 403 });
  if (!(await canManageTemplate(coachId, tid))) return NextResponse.json({ error: "Sin acceso" }, { status: 403 });

  const body: { name?: string; description?: string; splitType?: string; payload?: unknown } = await req.json();
  const updated = await prisma.trainingTemplate.update({
    where: { id: tid },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.splitType !== undefined && { splitType: body.splitType }),
      ...(body.payload !== undefined && { payload: body.payload as object }),
    },
  });

  return NextResponse.json(updated);
}

/** DELETE /api/plans/templates/[tid] */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ tid: string }> }
) {
  const { tid } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const coachId = await getCoachId(session.user.id);
  if (!coachId) return NextResponse.json({ error: "No es coach" }, { status: 403 });
  if (!(await canManageTemplate(coachId, tid))) return NextResponse.json({ error: "Sin acceso" }, { status: 403 });

  await prisma.trainingTemplate.delete({ where: { id: tid } });
  return NextResponse.json({ ok: true });
}
