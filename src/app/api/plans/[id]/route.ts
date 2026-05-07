import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { logAudit } from "@/lib/audit";
import { auditMutation } from "@/lib/api/audit";
import { z } from "zod";

export const dynamic = "force-dynamic";

async function getCoachId(userId: string) {
  const coach = await prisma.coach.findUnique({ where: { userId }, select: { id: true } });
  return coach?.id ?? null;
}

async function canManagePlan(coachId: string, planId: string) {
  const plan = await prisma.plan.findUnique({ where: { id: planId }, select: { coachId: true } });
  return plan?.coachId === coachId;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const coachId = await getCoachId(session.user.id);
  if (!coachId) return NextResponse.json({ error: "No es coach" }, { status: 403 });
  if (!(await canManagePlan(coachId, id))) return NextResponse.json({ error: "Sin acceso" }, { status: 403 });

  const plan = await prisma.plan.findUnique({
    where: { id },
    include: {
      sessions: {
        orderBy: { order: "asc" },
        include: { exercises: { orderBy: { order: "asc" } } },
      },
    },
  });

  if (!plan) return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 });
  return NextResponse.json(plan);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const coachId = await getCoachId(session.user.id);
  if (!coachId) return NextResponse.json({ error: "No es coach" }, { status: 403 });
  if (!(await canManagePlan(coachId, id))) return NextResponse.json({ error: "Sin acceso" }, { status: 403 });

  const before = await prisma.plan.findUnique({ where: { id }, select: { title: true, weekLabel: true, athleteId: true } });

  const patchSchema = z.object({
    title: z.string().min(1).max(200).optional(),
    weekLabel: z.string().min(1).max(100).optional(),
    athleteId: z.string().min(1).optional(),
  });

  let rawBody: unknown;
  try { rawBody = await req.json(); } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 422 });
  }
  const body = parsed.data;

  const updated = await prisma.plan.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.weekLabel !== undefined && { weekLabel: body.weekLabel }),
      ...(body.athleteId !== undefined && { athleteId: body.athleteId }),
    },
  });

  await auditMutation({
    entity: "Plan",
    entityId: id,
    action: "UPDATE",
    before: before ?? undefined,
    after: { title: updated.title, weekLabel: updated.weekLabel, athleteId: updated.athleteId },
    userId: session.user.id,
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const coachId = await getCoachId(session.user.id);
  if (!coachId) return NextResponse.json({ error: "No es coach" }, { status: 403 });
  if (!(await canManagePlan(coachId, id))) return NextResponse.json({ error: "Sin acceso" }, { status: 403 });

  await prisma.plan.update({ where: { id }, data: { deletedAt: new Date() } });
  await logAudit(session.user.id, "DELETE", "Plan", id);
  return NextResponse.json({ ok: true });
}
