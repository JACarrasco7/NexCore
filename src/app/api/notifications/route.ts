import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    role: (session.user as { role?: string }).role ?? null,
  };
}

export async function GET(request: NextRequest) {
  const sessionUser = await requireUser();
  if (!sessionUser) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const url = new URL(request.url);
  const unreadOnly = url.searchParams.get("unread") === "1" || url.searchParams.get("unread") === "true";
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "20"), 50);

  const rows = await prisma.notification.findMany({
    where: {
      userId: sessionUser.id,
      ...(unreadOnly ? { read: false } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      type: true,
      title: true,
      body: true,
      link: true,
      read: true,
      createdAt: true,
    },
  });

  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const sessionUser = await requireUser();
  if (!sessionUser) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (sessionUser.role !== "COACH" && sessionUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  if (!body?.userId || !body?.title) return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });

  const notification = await prisma.notification.create({
    data: {
      userId: String(body.userId),
      title: String(body.title),
      body: body.body ? String(body.body) : null,
      link: body.link ? String(body.link) : null,
      type: body.type ?? "SYSTEM",
      read: Boolean(body.read ?? false),
    },
  });

  return NextResponse.json(notification, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const sessionUser = await requireUser();
  if (!sessionUser) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  if (!body?.id) return NextResponse.json({ error: "Falta id" }, { status: 400 });

  const existing = await prisma.notification.findUnique({ where: { id: String(body.id) }, select: { id: true, userId: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.userId !== sessionUser.id && sessionUser.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const updated = await prisma.notification.update({
    where: { id: existing.id },
    data: {
      ...(body.read !== undefined ? { read: Boolean(body.read) } : {}),
      ...(body.link !== undefined ? { link: body.link ? String(body.link) : null } : {}),
      ...(body.title !== undefined ? { title: String(body.title) } : {}),
      ...(body.body !== undefined ? { body: body.body ? String(body.body) : null } : {}),
    },
  });

  return NextResponse.json(updated);
}
