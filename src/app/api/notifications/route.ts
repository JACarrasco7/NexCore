import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp, getRateLimitKey } from "@/lib/rate-limit";
import { paginationSchema, buildPaginationResponse } from "@/lib/api";
import { parseJsonOrError } from "@/lib/api/json-parser";
import { notificationSchema } from "@/lib/validators";
import { badRequest, unauthorized, forbidden, tooManyRequests, notFound } from "@/lib/api/error-response";

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
  if (!sessionUser) return unauthorized("No autenticado");

  const url = new URL(request.url);
  const unreadOnly =
    url.searchParams.get("unread") === "1" ||
    url.searchParams.get("unread") === "true";

  // Support both `take` and legacy `limit` query params; normalize to schema
  const takeParam = url.searchParams.get("take") ?? url.searchParams.get("limit") ?? undefined;
  const cursorParam = url.searchParams.get("cursor") ?? undefined;

  // Parse pagination params
  const paginationParams = paginationSchema.safeParse({
    take: takeParam,
    cursor: cursorParam,
  });

  if (!paginationParams.success) {
    return badRequest("Invalid pagination params");
  }

  const { take, cursor } = paginationParams.data;

  // Fetch take+1 to detect if there's a next page
  const rows = await prisma.notification.findMany({
    where: {
      userId: sessionUser.id,
      ...(unreadOnly ? { read: false } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: take + 1,
    ...(cursor && { skip: 1, cursor: { id: cursor } }),
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

  const { items, nextCursor } = buildPaginationResponse(rows, take);

  return NextResponse.json({ items, nextCursor });
}

export async function POST(request: NextRequest) {
  const sessionUser = await requireUser();
  if (!sessionUser) return unauthorized("No autenticado");
  if (sessionUser.role !== "COACH" && sessionUser.role !== "ADMIN") {
    return forbidden("Forbidden");
  }

  // Rate limiting to prevent notification spam
  const clientIp = getClientIp(request.headers);
  const rateLimitKey = getRateLimitKey(clientIp, sessionUser.id);
  const { ok } = await checkRateLimit(rateLimitKey, 20, 60); // 20 req/min per user
  if (!ok) return tooManyRequests();
  const parsedBody = await parseJsonOrError(request)
  if (!parsedBody.ok) return parsedBody.error

  // Validate using Zod schema
  const parsed = notificationSchema.safeParse(parsedBody.data);
  if (!parsed.success) {
    return badRequest("Datos inválidos", parsed.error.flatten().fieldErrors);
  }

  const notification = await prisma.notification.create({
    data: {
      userId: parsed.data.userId,
      title: parsed.data.title,
      body: parsed.data.body,
      link: parsed.data.link,
      type: parsed.data.type,
      read: parsed.data.read,
    },
  });

  return NextResponse.json(notification, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const sessionUser = await requireUser();
  if (!sessionUser) return unauthorized('No autenticado')

  const parsedBody = await parseJsonOrError(request)
  if (!parsedBody.ok) return parsedBody.error
  const body = parsedBody.data as any
  if (!body?.id) return badRequest('Falta id')

  const existing = await prisma.notification.findUnique({
    where: { id: String(body.id) },
    select: { id: true, userId: true },
  });
  if (!existing) return notFound('Not found')
  if (existing.userId !== sessionUser.id && sessionUser.role !== "ADMIN") return forbidden('Forbidden')

  const updated = await prisma.notification.update({
    where: { id: existing.id },
    data: {
      ...(body.read !== undefined ? { read: Boolean(body.read) } : {}),
      ...(body.link !== undefined
        ? { link: body.link ? String(body.link) : null }
        : {}),
      ...(body.title !== undefined ? { title: String(body.title) } : {}),
      ...(body.body !== undefined
        ? { body: body.body ? String(body.body) : null }
        : {}),
    },
  });

  return NextResponse.json(updated);
}
