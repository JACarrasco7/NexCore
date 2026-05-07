import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const ids = Array.isArray(body.ids)
    ? body.ids.map(String)
    : body.ids
      ? [String(body.ids)]
      : [];
  if (!ids || ids.length === 0)
    return NextResponse.json({ error: "Sin ids" }, { status: 400 });

  const result = await prisma.notification.updateMany({
    where: { id: { in: ids }, userId: session.user.id },
    data: { read: true },
  });

  return NextResponse.json({ updated: result.count });
}
