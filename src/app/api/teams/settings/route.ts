import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, resolveAdminTeamId, requireTeamMembership } from "@/lib/api/auth-helpers";
import { AuthError, ForbiddenError } from "@/lib/api/errors";

const DEFAULT_FEATURES = {
  wall: true,
  healthConnections: true,
  nutrition: true,
  documents: true,
  photos: true,
  contract: true,
  emailVerification: true,
};

function errorResponse(e: unknown) {
  if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 });
  if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 });
  console.error(e);
  return NextResponse.json({ error: "Internal error" }, { status: 500 });
}

// GET /api/teams/settings — devuelve config del team del usuario actual
//   Cualquier miembro puede leer (para localización, branding, features).
export async function GET(_req: NextRequest) {
  try {
    const session = await requireRole(["COACH", "ADMIN", "ATHLETE"]);

    let teamId: string | null = null;
    if (session.role === "ATHLETE") {
      const a = await prisma.athlete.findUnique({
        where: { userId: session.userId },
        select: { teamId: true },
      });
      teamId = a?.teamId ?? null;
    } else {
      teamId = await resolveAdminTeamId(session.userId);
    }

    if (!teamId) {
      return NextResponse.json({ teamId: null, settings: null, features: DEFAULT_FEATURES });
    }

    const settings = await prisma.teamSettings.findUnique({
      where: { teamId },
    });

    return NextResponse.json({
      teamId,
      settings,
      features: { ...DEFAULT_FEATURES, ...((settings?.features as object) ?? {}) },
    });
  } catch (e) {
    return errorResponse(e);
  }
}

// PUT /api/teams/settings — upsert (solo ADMIN del team)
export async function PUT(req: NextRequest) {
  try {
    const session = await requireRole(["COACH", "ADMIN"]);
    const teamId = await resolveAdminTeamId(session.userId);
    if (!teamId) {
      return NextResponse.json({ error: "Sin equipo administrado" }, { status: 404 });
    }
    await requireTeamMembership(teamId, { adminOnly: true });

    const body = (await req.json()) as Partial<{
      displayName: string | null;
      logoUrl: string | null;
      primaryColor: string | null;
      accentColor: string | null;
      locale: string;
      timezone: string;
      currency: string;
      supportEmail: string | null;
      legalEmail: string | null;
      websiteUrl: string | null;
      contractTemplate: string | null;
      privacyNotice: string | null;
      termsNotice: string | null;
      contractVersion: string;
      defaultCheckinDays: number;
      defaultReviewDays: number;
      features: Record<string, boolean>;
      branding: Record<string, unknown>;
      metadata: Record<string, unknown>;
    }>;

    // Whitelist explícito (evita inyección de campos no permitidos)
    const data: Record<string, unknown> = {};
    const stringKeys = [
      "displayName", "logoUrl", "primaryColor", "accentColor",
      "locale", "timezone", "currency",
      "supportEmail", "legalEmail", "websiteUrl",
      "contractTemplate", "privacyNotice", "termsNotice", "contractVersion",
    ] as const;
    for (const k of stringKeys) {
      if (k in body) data[k] = body[k];
    }
    const intKeys = ["defaultCheckinDays", "defaultReviewDays"] as const;
    for (const k of intKeys) {
      if (k in body && typeof body[k] === "number") data[k] = body[k];
    }
    const jsonKeys = ["features", "branding", "metadata"] as const;
    for (const k of jsonKeys) {
      if (k in body && body[k] != null) {
        data[k] = JSON.parse(JSON.stringify(body[k]));
      }
    }

    const settings = await prisma.teamSettings.upsert({
      where: { teamId },
      create: { teamId, ...data },
      update: data,
    });

    return NextResponse.json({ teamId, settings });
  } catch (e) {
    return errorResponse(e);
  }
}
