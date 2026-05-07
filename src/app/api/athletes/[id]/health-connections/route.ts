import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertAthleteAccess } from "@/lib/api/auth-helpers";
import { AuthError, ForbiddenError } from "@/lib/api/errors";

type Params = { params: Promise<{ id: string }> };

function errorResponse(e: unknown) {
  if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 });
  if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 });
  console.error(e);
  return NextResponse.json({ error: "Internal error" }, { status: 500 });
}

// GET /api/athletes/[id]/health-connections
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    await assertAthleteAccess(id);

    const connections = await prisma.healthConnection.findMany({
      where: { athleteId: id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        provider: true,
        isActive: true,
        lastSyncAt: true,
        metadata: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ connections });
  } catch (e) {
    return errorResponse(e);
  }
}

// POST /api/athletes/[id]/health-connections — conectar proveedor
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    await assertAthleteAccess(id);

    const body = (await req.json()) as {
      provider?: string;
      metadata?: Record<string, unknown>;
    };

    const VALID_PROVIDERS = [
      "APPLE_HEALTH",
      "HEALTH_CONNECT",
      "GARMIN",
      "POLAR",
      "FITBIT",
      "WHOOP",
      "MANUAL",
    ];

    if (!body.provider || !VALID_PROVIDERS.includes(body.provider)) {
      return NextResponse.json(
        { error: `provider inválido. Válidos: ${VALID_PROVIDERS.join(", ")}` },
        { status: 400 }
      );
    }

    const connection = await prisma.healthConnection.upsert({
      where: {
        athleteId_provider: {
          athleteId: id,
          provider: body.provider as Parameters<typeof prisma.healthConnection.create>[0]["data"]["provider"],
        },
      },
      update: {
        isActive: true,
        metadata: body.metadata ? JSON.parse(JSON.stringify(body.metadata)) : undefined,
        lastSyncAt: new Date(),
      },
      create: {
        athleteId: id,
        provider: body.provider as Parameters<typeof prisma.healthConnection.create>[0]["data"]["provider"],
        isActive: true,
        metadata: body.metadata ? JSON.parse(JSON.stringify(body.metadata)) : undefined,
        lastSyncAt: new Date(),
      },
      select: {
        id: true,
        provider: true,
        isActive: true,
        lastSyncAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ connection }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}

// PATCH /api/athletes/[id]/health-connections — actualizar lastSyncAt / desactivar
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    await assertAthleteAccess(id);

    const body = (await req.json()) as {
      connectionId?: string;
      isActive?: boolean;
      lastSyncAt?: string;
    };

    if (!body.connectionId) {
      return NextResponse.json({ error: "connectionId requerido" }, { status: 400 });
    }

    const updated = await prisma.healthConnection.update({
      where: { id: body.connectionId, athleteId: id },
      data: {
        ...(typeof body.isActive === "boolean" ? { isActive: body.isActive } : {}),
        ...(body.lastSyncAt ? { lastSyncAt: new Date(body.lastSyncAt) } : {}),
      },
      select: { id: true, provider: true, isActive: true, lastSyncAt: true },
    });

    return NextResponse.json({ connection: updated });
  } catch (e) {
    return errorResponse(e);
  }
}

// DELETE /api/athletes/[id]/health-connections — desconectar proveedor
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    await assertAthleteAccess(id);

    const { connectionId } = (await req.json()) as { connectionId?: string };
    if (!connectionId) {
      return NextResponse.json({ error: "connectionId requerido" }, { status: 400 });
    }

    await prisma.healthConnection.delete({
      where: { id: connectionId, athleteId: id },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
