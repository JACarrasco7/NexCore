import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

/**
 * POST /api/cron/check-in-reminders
 * Notifica a atletas con check-in pendiente (>6 días sin enviar).
 * Invocar con: Authorization: Bearer <CRON_SECRET>
 */
export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 6);

  // Atletas cuyo último check-in es anterior al cutoff (o no tienen ninguno)
  const athletes = await prisma.athlete.findMany({
    select: {
      id: true,
      fullName: true,
      userId: true,
      checkIns: {
        orderBy: { date: "desc" },
        take: 1,
        select: { date: true },
      },
    },
  });

  let notified = 0;

  for (const athlete of athletes) {
    const lastCheckIn = athlete.checkIns[0]?.date ?? null;
    if (!lastCheckIn || new Date(lastCheckIn) < cutoff) {
      const daysSince = lastCheckIn
        ? Math.floor((Date.now() - new Date(lastCheckIn).getTime()) / 86_400_000)
        : null;

      await createNotification({
        userId: athlete.userId,
        type: "REMINDER_CHECK_IN",
        title: "Recuerda enviar tu check-in semanal",
        body: daysSince
          ? `Llevas ${daysSince} días sin enviar check-in. Tu coach lo revisa cada semana.`
          : "Todavia no has enviado ningún check-in. Hazlo ahora.",
        link: "/athlete/check-in",
      });

      notified++;
    }
  }

  return NextResponse.json({ ok: true, notified });
}
