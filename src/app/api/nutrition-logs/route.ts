import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import {
  requireSession,
  assertAthleteAccess,
  assertCoachOwnsAthlete,
  requireAthleteId,
  paginationSchema,
  buildPaginationResponse,
} from "@/lib/api";
import { nutritionLogSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try { await requireSession(); } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const athleteId = searchParams.get("athleteId");
  if (!athleteId) return NextResponse.json({ error: "athleteId requerido" }, { status: 400 });

  try {
    await assertAthleteAccess(athleteId);
  } catch {
    return NextResponse.json({ error: "Sin acceso" }, { status: 403 });
  }

  const pagination = paginationSchema.safeParse({
    take: searchParams.get("take") ?? 50,
    cursor: searchParams.get("cursor") ?? undefined,
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
  });
  const { take, cursor, from, to } = pagination.success
    ? pagination.data
    : { take: 50, cursor: undefined, from: undefined, to: undefined };

  const where: Record<string, unknown> = { athleteId };
  if (from || to) {
    where.loggedAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }

  const logs = await prisma.nutritionLog.findMany({
    where,
    orderBy: { loggedAt: "desc" },
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const { items, nextCursor } = buildPaginationResponse(
    logs.map((l) => ({
      id: l.id,
      athleteId: l.athleteId,
      mealName: l.mealName,
      kcal: l.kcal,
      proteinG: l.proteinG,
      carbsG: l.carbsG,
      fatG: l.fatG,
      notes: l.notes,
      photoUrl: l.photoUrl,
      loggedAt: l.loggedAt.toISOString(),
    })),
    take,
  );

  return NextResponse.json({ items, nextCursor });
}

export async function POST(req: Request) {
  let session: { userId: string; role: string };
  try { session = await requireSession(); } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const ct = req.headers.get("content-type") ?? "";

  // ── Shared: resolve athleteId enforcing ownership ──────────────────────────
  async function resolveAthleteId(rawId: string | null): Promise<string | NextResponse> {
    if (session.role === "ATHLETE") {
      // Force own athleteId regardless of what was sent
      try { return await requireAthleteId(); } catch {
        return NextResponse.json({ error: "Perfil de atleta no encontrado" }, { status: 404 });
      }
    }
    if (!rawId) return NextResponse.json({ error: "athleteId requerido" }, { status: 400 });
    try {
      await assertCoachOwnsAthlete(rawId);
    } catch {
      return NextResponse.json({ error: "Sin acceso al atleta" }, { status: 403 });
    }
    return rawId;
  }

  if (ct.includes("multipart/form-data")) {
    const form = await req.formData();
    const rawAthleteId = form.get("athleteId") as string | null;
    const resolved = await resolveAthleteId(rawAthleteId);
    if (resolved instanceof NextResponse) return resolved;
    const athleteId = resolved;

    let photoUrl: string | undefined;
    const file = form.get("photo") as File | null;
    if (file && file.size > 0) {
      if (file.size > 5 * 1024 * 1024)
        return NextResponse.json({ error: "Foto máx 5 MB" }, { status: 400 });
      const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
      if (!allowedTypes.includes(file.type))
        return NextResponse.json({ error: "Tipo de archivo no permitido" }, { status: 400 });
      const ext = (file.name.split(".").pop() ?? "jpg").replace(/[^a-z0-9]/gi, "").slice(0, 6) || "jpg";
      const filename = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
      const dir = path.join(process.cwd(), "public", "uploads", "nutrition-photos");
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));
      photoUrl = `/uploads/nutrition-photos/${filename}`;
    }

    const log = await prisma.nutritionLog.create({
      data: {
        athleteId,
        mealName: (form.get("mealName") as string | null) ?? undefined,
        kcal: form.get("kcal") ? parseFloat(form.get("kcal") as string) : undefined,
        proteinG: form.get("proteinG") ? parseFloat(form.get("proteinG") as string) : undefined,
        carbsG: form.get("carbsG") ? parseFloat(form.get("carbsG") as string) : undefined,
        fatG: form.get("fatG") ? parseFloat(form.get("fatG") as string) : undefined,
        notes: (form.get("notes") as string | null) ?? undefined,
        loggedAt: form.get("loggedAt") ? new Date(form.get("loggedAt") as string) : undefined,
        photoUrl,
      },
    });
    return NextResponse.json(log, { status: 201 });
  }

  // ── JSON path ──────────────────────────────────────────────────────────────
  let rawBody: unknown;
  try { rawBody = await req.json(); } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = nutritionLogSchema.safeParse(rawBody);
  if (!parsed.success)
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 422 });

  const resolved = await resolveAthleteId(parsed.data.athleteId);
  if (resolved instanceof NextResponse) return resolved;

  const log = await prisma.nutritionLog.create({
    data: {
      athleteId: resolved,
      mealName: parsed.data.mealName ?? undefined,
      kcal: parsed.data.kcal ?? undefined,
      proteinG: parsed.data.proteinG ?? undefined,
      carbsG: parsed.data.carbsG ?? undefined,
      fatG: parsed.data.fatG ?? undefined,
      notes: parsed.data.notes ?? undefined,
      loggedAt: parsed.data.loggedAt ? new Date(parsed.data.loggedAt) : undefined,
    },
  });

  return NextResponse.json(log, { status: 201 });
}
