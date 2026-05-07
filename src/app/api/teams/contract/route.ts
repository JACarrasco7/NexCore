import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, resolveAdminTeamId } from "@/lib/api/auth-helpers";
import { AuthError, ForbiddenError } from "@/lib/api/errors";

const DEFAULT_TEMPLATE = `# Contrato de Servicios de Coaching Deportivo

**Apex Coach OS** — Versión 1.0

Al aceptar este contrato, el atleta confirma que:

1. Ha leído y comprende los términos del servicio de coaching.
2. Autoriza al coach a acceder a sus datos de salud y rendimiento con fines de entrenamiento.
3. Se compromete a proporcionar información veraz en los check-ins y registros diarios.
4. Entiende que los resultados dependen de su adherencia al plan proporcionado.
5. Acepta la política de privacidad y el tratamiento de sus datos personales conforme al RGPD.

Este acuerdo es válido desde la fecha de aceptación digital registrada.`;

// GET /api/teams/contract — obtener plantilla actual del equipo
export async function GET(_req: NextRequest) {
  try {
    const session = await requireRole(["COACH", "ADMIN", "ATHLETE"]);

    let teamId: string | null = null;
    if (session.role === "ATHLETE") {
      const athlete = await prisma.athlete.findUnique({
        where: { userId: session.userId },
        select: { teamId: true },
      });
      teamId = athlete?.teamId ?? null;
    } else {
      teamId = await resolveAdminTeamId(session.userId);
    }

    if (!teamId) {
      return NextResponse.json({ template: DEFAULT_TEMPLATE });
    }

    // Preferir TeamSettings.contractTemplate; fallback Team.contractTemplate (legacy)
    const settings = await prisma.teamSettings.findUnique({
      where: { teamId },
      select: { contractTemplate: true, contractVersion: true },
    });
    let template = settings?.contractTemplate ?? null;
    let version = settings?.contractVersion ?? "1.0";

    if (!template) {
      const team = await prisma.team.findUnique({
        where: { id: teamId },
        select: { contractTemplate: true },
      });
      template = team?.contractTemplate ?? null;
    }

    return NextResponse.json({
      template: template ?? DEFAULT_TEMPLATE,
      version,
    });
  } catch (e) {
    if (e instanceof AuthError || e instanceof ForbiddenError) {
      return NextResponse.json({ error: (e as Error).message }, { status: (e as AuthError).status });
    }
    console.error(e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// PUT /api/teams/contract — guardar plantilla del contrato (TeamSettings)
export async function PUT(req: NextRequest) {
  try {
    const session = await requireRole(["COACH", "ADMIN"]);
    const teamId = await resolveAdminTeamId(session.userId);
    if (!teamId) {
      return NextResponse.json({ error: "Sin equipo administrado" }, { status: 404 });
    }

    const { template, version } = (await req.json()) as {
      template?: string;
      version?: string;
    };

    if (!template || typeof template !== "string") {
      return NextResponse.json({ error: "template requerido" }, { status: 400 });
    }

    await prisma.teamSettings.upsert({
      where: { teamId },
      create: {
        teamId,
        contractTemplate: template,
        contractVersion: version ?? "1.0",
      },
      update: {
        contractTemplate: template,
        ...(version ? { contractVersion: version } : {}),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError || e instanceof ForbiddenError) {
      return NextResponse.json({ error: (e as Error).message }, { status: (e as AuthError).status });
    }
    console.error(e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
