import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { parseJsonOrError } from '@/lib/api/json-parser'
import { unauthorized, badRequest } from '@/lib/api/error-response'

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized('No autenticado')

  const parsed = await parseJsonOrError(request)
  if (!parsed.ok) return parsed.error
  const body = parsed.data as any
  const ids = Array.isArray(body.ids)
    ? body.ids.map(String)
    : body.ids
      ? [String(body.ids)]
      : [];
  if (!ids || ids.length === 0) return badRequest('Sin ids')

  const result = await prisma.notification.updateMany({
    where: { id: { in: ids }, userId: session.user.id },
    data: { read: true },
  });

  return NextResponse.json({ updated: result.count });
}
