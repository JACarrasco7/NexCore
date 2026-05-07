import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

// GET /api/messages/unread-count
// Devuelve { count: number } — mensajes no leídos recibidos por el usuario actual
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const myId = session.user.id!;
  const count = await prisma.message.count({
    where: { toUserId: myId, readAt: null },
  });

  return NextResponse.json({ count });
}
