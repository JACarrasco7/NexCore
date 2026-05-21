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
  const athleteUserIds = athletes.map((a) => a.userId!);

  // Batch fetch: get all relevant messages and unread counts in 2 queries instead of N*2
  const recentMessages = await prisma.message.findMany({
    where: {
      OR: [
        { fromUserId: myUserId, toUserId: { in: athleteUserIds } },
        { fromUserId: { in: athleteUserIds }, toUserId: myUserId },
      ],
    },
    orderBy: { createdAt: "desc" },
    select: { content: true, createdAt: true, fromUserId: true, toUserId: true },
  });

  const unreadCounts = await prisma.message.groupBy({
    by: ["fromUserId"],
    where: { fromUserId: { in: athleteUserIds }, toUserId: myUserId, readAt: null },
    _count: { id: true },
  });

  // Build maps for fast lookup
  const lastMessageByAthleteId = new Map<string, typeof recentMessages[0]>();
  for (const msg of recentMessages) {
    const athleteUserId = msg.fromUserId === myUserId ? msg.toUserId : msg.fromUserId;
    if (!lastMessageByAthleteId.has(athleteUserId)) {
      lastMessageByAthleteId.set(athleteUserId, msg);
    }
  }

  const unreadByAthleteUserId = new Map<string, number>();
  for (const count of unreadCounts) {
    unreadByAthleteUserId.set(count.fromUserId, count._count.id);
  }

  const results = athletes.map((a) => {
    const athleteUserId = a.userId!;
    const lastMsg = lastMessageByAthleteId.get(athleteUserId);

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
      unreadCount: unreadByAthleteUserId.get(athleteUserId) ?? 0,
    };
  });

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
