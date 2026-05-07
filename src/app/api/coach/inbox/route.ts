import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

// GET /api/coach/inbox
// Devuelve por cada atleta del coach: { athleteId, userId, displayName, lastMessage, unreadCount }
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  if (role !== "COACH" && role !== "ADMIN") {
    return NextResponse.json({ error: "Solo coaches" }, { status: 403 });
  }

  const myUserId = session.user.id!;

  // Obtener el registro Coach del usuario actual
  const coachRecord = await prisma.coach.findFirst({
    where: { userId: myUserId },
    include: {
      athletes: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  if (!coachRecord) return NextResponse.json([]);

  const athletes = coachRecord.athletes.filter((a) => a.userId != null);

  const results = await Promise.all(
    athletes.map(async (a) => {
      const athleteUserId = a.userId!;

      // Último mensaje en cualquier dirección
      const lastMsg = await prisma.message.findFirst({
        where: {
          OR: [
            { fromUserId: myUserId, toUserId: athleteUserId },
            { fromUserId: athleteUserId, toUserId: myUserId },
          ],
        },
        orderBy: { createdAt: "desc" },
        select: { content: true, createdAt: true, fromUserId: true },
      });

      // No leídos recibidos del atleta
      const unreadCount = await prisma.message.count({
        where: { fromUserId: athleteUserId, toUserId: myUserId, readAt: null },
      });

      return {
        athleteId: a.id,
        userId: athleteUserId,
        displayName: a.fullName ?? a.user?.name ?? a.user?.email ?? "Atleta",
        lastMessage: lastMsg
          ? {
              content: lastMsg.content,
              createdAt: lastMsg.createdAt.toISOString(),
              fromMe: lastMsg.fromUserId === myUserId,
            }
          : null,
        unreadCount,
      };
    })
  );

  // Ordenar: más reciente primero
  results.sort((a, b) => {
    const ta = a.lastMessage?.createdAt ?? "";
    const tb = b.lastMessage?.createdAt ?? "";
    return tb.localeCompare(ta);
  });

  const unreadByAthleteId: Record<string, number> = {};
  let totalUnread = 0;
  for (const r of results) {
    unreadByAthleteId[r.athleteId] = r.unreadCount;
    totalUnread += r.unreadCount;
  }

  return NextResponse.json({ conversations: results, totalUnread, unreadByAthleteId });
}
