import { NextRequest, NextResponse } from "next/server";
import { NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { auth } from "@/auth";
import { paginationSchema, buildPaginationResponse } from "@/lib/api";

/**
 * Verify that myId and withUserId share a valid coach↔athlete relationship.
 * Returns the verified athleteId or null if the relationship doesn't exist.
 */
async function verifyConversationAccess(myId: string, withUserId: string): Promise<boolean> {
  const myUser = await prisma.user.findUnique({ where: { id: myId }, select: { role: true } });
  const otherUser = await prisma.user.findUnique({ where: { id: withUserId }, select: { role: true } });
  if (!myUser || !otherUser) return false;

  const coachId = myUser.role === "COACH" || myUser.role === "ADMIN" ? myId : withUserId;
  const athleteUserId = myUser.role === "ATHLETE" ? myId : withUserId;

  // ADMIN can message anyone
  if (myUser.role === "ADMIN" || otherUser.role === "ADMIN") return true;

  // Must be a coach↔athlete pair
  const rel = await prisma.athlete.findFirst({
    where: {
      userId: athleteUserId,
      coach: { userId: coachId },
    },
    select: { id: true },
  });
  return Boolean(rel);
}

// GET /api/messages?withUserId=xxx&cursor=xxx&take=30
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const withUserId = req.nextUrl.searchParams.get("withUserId");
  if (!withUserId) return NextResponse.json({ error: "withUserId requerido" }, { status: 400 });

  const myId = session.user.id;

  // Validate relationship
  const hasAccess = await verifyConversationAccess(myId, withUserId);
  if (!hasAccess) return NextResponse.json({ error: "Sin acceso" }, { status: 403 });

  const pagination = paginationSchema.safeParse({
    take: req.nextUrl.searchParams.get("take") ?? 30,
    cursor: req.nextUrl.searchParams.get("cursor") ?? undefined,
  });
  const { take, cursor } = pagination.success ? pagination.data : { take: 30, cursor: undefined };

  const messages = await prisma.message.findMany({
    where: {
      deletedAt: null,
      OR: [
        { fromUserId: myId, toUserId: withUserId },
        { fromUserId: withUserId, toUserId: myId },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      fromUserId: true,
      toUserId: true,
      athleteId: true,
      content: true,
      readAt: true,
      createdAt: true,
      from: { select: { id: true, name: true, email: true, role: true } },
    },
  });

  const { items, nextCursor } = buildPaginationResponse(
    messages.map((m) => ({
      ...m,
      createdAt: m.createdAt.toISOString(),
      readAt: m.readAt?.toISOString() ?? null,
    })),
    take,
  );

  // Mark incoming messages as read (side-effect acceptable on read)
  void prisma.message.updateMany({
    where: { toUserId: myId, fromUserId: withUserId, readAt: null },
    data: { readAt: new Date() },
  });

  return NextResponse.json({ items, nextCursor });
}

// POST /api/messages
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json() as { toUserId?: string; athleteId?: string; content?: string };
  const { toUserId, athleteId, content } = body;

  if (!toUserId || !content?.trim()) {
    return NextResponse.json({ error: "toUserId y content son requeridos" }, { status: 400 });
  }

  // Validate relationship before allowing message
  const myId = session.user.id;
  const hasAccess = await verifyConversationAccess(myId, toUserId);
  if (!hasAccess) return NextResponse.json({ error: "Solo puedes enviar mensajes a tu coach o atletas asignados" }, { status: 403 });

  const to = await prisma.user.findUnique({ where: { id: toUserId }, select: { id: true, role: true, name: true, email: true } });
  if (!to) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  const msg = await prisma.message.create({
    data: {
      fromUserId: myId,
      toUserId,
      athleteId: athleteId ?? null,
      content: content.trim(),
    },
    include: {
      from: { select: { id: true, name: true, email: true, role: true } },
    },
  });

  const senderName = session.user.name ?? session.user.email ?? "Nuevo mensaje";
  const targetLink = to.role === "COACH" || to.role === "ADMIN"
    ? "/coach/messages"
    : "/athlete/chat";

  await createNotification({
    userId: toUserId,
    type: NotificationType.NEW_MESSAGE,
    title: `Mensaje de ${senderName}`,
    body: content.trim().slice(0, 120),
    link: targetLink,
  });

  return NextResponse.json(msg, { status: 201 });
}
