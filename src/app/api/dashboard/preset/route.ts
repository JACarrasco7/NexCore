import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { DEFAULT_LAYOUT, sanitizeLayout } from "@/lib/dashboard-config";
import { prisma } from "@/lib/prisma";
import { dashboardLayoutSchema } from "@/lib/validators";
import { parseJsonOrError } from '@/lib/api/json-parser'
import { unauthorized, forbidden, badRequest } from '@/lib/api/error-response'

export const dynamic = "force-dynamic";

async function resolveCoachPresetContext(athleteId: string, userId: string, role: string | undefined) {
  const athlete = await prisma.athlete.findUnique({
    where: { id: athleteId },
    select: { id: true, coachId: true },
  });

  if (!athlete) return { error: NextResponse.json({ error: "Atleta no encontrado" }, { status: 404 }) };
  if (!athlete.coachId) return { error: badRequest("Atleta sin coach asignado") };

  if (role === "ADMIN") return { athleteId: athlete.id, coachId: athlete.coachId };

  const coach = await prisma.coach.findUnique({ where: { userId }, select: { id: true } });
  if (!coach || coach.id !== athlete.coachId) {
    return { error: NextResponse.json({ error: "Sin acceso" }, { status: 403 }) };
  }

  return { athleteId: athlete.id, coachId: coach.id };
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized('No autenticado')

  const role = (session.user as { role?: string }).role;
  if (role !== "COACH" && role !== "ADMIN") {
    return forbidden('Sin acceso')
  }

  const athleteId = new URL(request.url).searchParams.get("athleteId");
  if (!athleteId) return badRequest('athleteId requerido')

  const context = await resolveCoachPresetContext(athleteId, session.user.id, role);
  if ("error" in context) return context.error;

  const preset = await prisma.coachDashboardPreset.findUnique({
    where: { coachId_athleteId: { coachId: context.coachId, athleteId: context.athleteId } },
  });

  if (!preset) return NextResponse.json({ source: "default", layout: DEFAULT_LAYOUT });

  return NextResponse.json({
    source: "preset",
    layout: sanitizeLayout({ activeTab: preset.activeTab, hidden: preset.hidden, order: preset.order }),
  });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized('No autenticado')

  const role = (session.user as { role?: string }).role;
  if (role !== "COACH" && role !== "ADMIN") {
    return forbidden('Sin acceso')
  }

  const parsedBody = await parseJsonOrError(request)
  if (!parsedBody.ok) return parsedBody.error
  const body = parsedBody.data as any
  const athleteId = typeof body.athleteId === "string" ? body.athleteId : "";
  if (!athleteId) return badRequest('athleteId requerido')

  const parsed = dashboardLayoutSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest('Preset inválido', parsed.error.flatten().fieldErrors)
  }

  const context = await resolveCoachPresetContext(athleteId, session.user.id, role);
  if ("error" in context) return context.error;

  const layout = sanitizeLayout(parsed.data);

  await prisma.coachDashboardPreset.upsert({
    where: { coachId_athleteId: { coachId: context.coachId, athleteId: context.athleteId } },
    create: {
      coachId: context.coachId,
      athleteId: context.athleteId,
      activeTab: layout.activeTab,
      hidden: layout.hidden,
      order: layout.order,
    },
    update: {
      activeTab: layout.activeTab,
      hidden: layout.hidden,
      order: layout.order,
    },
  });

  return NextResponse.json({ ok: true, layout });
}
