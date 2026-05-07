import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

async function canAccessAthlete(userId: string, role: string | undefined, athleteId: string): Promise<boolean> {
  if (role === "ATHLETE") {
    const a = await prisma.athlete.findUnique({ where: { userId }, select: { id: true } });
    return a?.id === athleteId;
  }
  if (role === "COACH" || role === "ADMIN") {
    const coach = await prisma.coach.findUnique({ where: { userId }, select: { id: true } });
    if (!coach) return false;
    const a = await prisma.athlete.findUnique({ where: { id: athleteId }, select: { coachId: true } });
    return a?.coachId === coach.id;
  }
  return false;
}

/** GET /api/progress-photos?athleteId=xxx */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const athleteId = searchParams.get("athleteId");
  if (!athleteId) return NextResponse.json({ error: "athleteId requerido" }, { status: 400 });

  const role = (session.user as { role?: string }).role;
  if (!(await canAccessAthlete(session.user.id, role, athleteId))) {
    return NextResponse.json({ error: "Sin acceso" }, { status: 403 });
  }

  const photos = await prisma.progressPhoto.findMany({
    where: { athleteId },
    orderBy: { takenAt: "desc" },
  });

  return NextResponse.json(photos);
}

/** POST /api/progress-photos — multipart/form-data */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const athleteId = form.get("athleteId") as string | null;
  const pose = (form.get("pose") as string | null) ?? undefined;
  const weekLabel = (form.get("weekLabel") as string | null) ?? undefined;
  const weightKg = form.get("weightKg") ? Number(form.get("weightKg")) : undefined;
  const notes = (form.get("notes") as string | null) ?? undefined;

  if (!file) return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });
  if (!athleteId) return NextResponse.json({ error: "athleteId requerido" }, { status: 400 });

  const uploadRole = (session.user as { role?: string }).role;
  if (!(await canAccessAthlete(session.user.id, uploadRole, athleteId))) {
    return NextResponse.json({ error: "Sin acceso" }, { status: 403 });
  }

  // Validar tipo de archivo (solo imágenes)
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/heic"];
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: "Solo se permiten imágenes (jpg, png, webp, heic)" }, { status: 400 });
  }

  // Limite de 10 MB
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "Máximo 10 MB por foto" }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const filename = `${athleteId}_${Date.now()}.${ext}`;
  const dest = path.join(process.cwd(), "public", "uploads", "progress-photos", filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(dest, buffer);

  const url = `/uploads/progress-photos/${filename}`;

  const photo = await prisma.progressPhoto.create({
    data: { athleteId, url, pose, weekLabel, weightKg, notes },
  });

  return NextResponse.json(photo, { status: 201 });
}
