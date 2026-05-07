import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { DEFAULT_LAYOUT, sanitizeLayout } from "@/lib/dashboard-config";
import { prisma } from "@/lib/prisma";
import { dashboardLayoutSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

async function resolveCoachPresetContext(athleteId: string, userId: string, role: string | undefined) {
  const athlete = await prisma.athlete.findUnique({
    where: { id: athleteId },
    select: { id: true, coachId: true },
  });

  if (!athlete) return { error: NextResponse.json({ error: "Atleta no encontrado" }, { status: 404 }) };
  if (role === "ADMIN") return { athleteId: athlete.id, coachId: athlete.coachId };

  const coach = await prisma.coach.findUnique({ where: { userId }, select: { id: true } });
  if (!coach || coach.id !== athlete.coachId) {
    return { error: NextResponse.json({ error: "Sin acceso" }, { status: 403 }) };
  }

  return { athleteId: athlete.id, coachId: coach.id };
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  if (role !== "COACH" && role !== "ADMIN") {
    return NextResponse.json({ error: "Sin acceso" }, { status: 403 });
  }

  const athleteId = new URL(request.url).searchParams.get("athleteId");
  if (!athleteId) return NextResponse.json({ error: "athleteId requerido" }, { status: 400 });

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
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  if (role !== "COACH" && role !== "ADMIN") {
    return NextResponse.json({ error: "Sin acceso" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const athleteId = typeof body.athleteId === "string" ? body.athleteId : "";
  if (!athleteId) return NextResponse.json({ error: "athleteId requerido" }, { status: 400 });

  const parsed = dashboardLayoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Preset inválido", details: parsed.error.flatten().fieldErrors }, { status: 422 });
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
