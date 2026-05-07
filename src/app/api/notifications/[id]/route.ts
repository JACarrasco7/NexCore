import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest, context: any) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = context?.params ?? {};
    const notification = await prisma.notification.findUnique({
      where: { id },
      include: { deliveries: { orderBy: { createdAt: "asc" } } },
    });

    if (!notification) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (notification.userId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    return NextResponse.json(notification);
  } catch (err) {
    console.error("[api/notifications/[id]] GET", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
