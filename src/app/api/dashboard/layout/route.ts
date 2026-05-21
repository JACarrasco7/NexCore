import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { DEFAULT_LAYOUT, sanitizeLayout } from "@/lib/dashboard-config";
import { prisma } from "@/lib/prisma";
import { dashboardLayoutSchema } from "@/lib/validators";
import { parseJsonOrError } from '@/lib/api/json-parser'
import { unauthorized, badRequest } from '@/lib/api/error-response'

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const userLayout = await prisma.dashboardLayout.findUnique({ where: { userId: session.user.id } });
  if (userLayout) {
    return NextResponse.json({
      source: "user",
      layout: sanitizeLayout({ activeTab: userLayout.activeTab, hidden: userLayout.hidden, order: userLayout.order }),
    });
  }

  const athlete = await prisma.athlete.findUnique({
    where: { userId: session.user.id },
    select: { id: true, coachId: true },
  });

  if (athlete?.coachId) {
    const preset = await prisma.coachDashboardPreset.findUnique({
      where: { coachId_athleteId: { coachId: athlete.coachId, athleteId: athlete.id } },
    });

    if (preset) {
      return NextResponse.json({
        source: "preset",
        layout: sanitizeLayout({ activeTab: preset.activeTab, hidden: preset.hidden, order: preset.order }),
      });
    }
  }

  return NextResponse.json({ source: "default", layout: DEFAULT_LAYOUT });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized('No autenticado')

  const parsedBody = await parseJsonOrError(request)
  if (!parsedBody.ok) return parsedBody.error
  const parsed = dashboardLayoutSchema.safeParse(parsedBody.data)
  if (!parsed.success) {
    return badRequest('Layout inválido', parsed.error.flatten().fieldErrors)
  }

  const layout = sanitizeLayout(parsed.data);

  await prisma.dashboardLayout.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
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
