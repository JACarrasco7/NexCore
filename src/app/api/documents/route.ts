import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads", "docs");
const ALLOWED_MIME = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

const CATEGORY_MAP: Record<string, string> = {
  dieta: "DIETA",
  plan_pdf: "PLAN_PDF",
  analisis: "ANALISIS",
  progreso: "PROGRESO",
  general: "GENERAL",
};

const CUSTOM_CATEGORY_PREFIX = "__cat__:";

function readCategory(docCategory: string, notes?: string | null) {
  const raw = (notes ?? "").trim();
  if (raw.startsWith(CUSTOM_CATEGORY_PREFIX)) {
    const firstLineEnd = raw.indexOf("\n");
    const firstLine = firstLineEnd >= 0 ? raw.slice(0, firstLineEnd) : raw;
    const custom = firstLine.replace(CUSTOM_CATEGORY_PREFIX, "").trim();
    const cleanNotes = firstLineEnd >= 0 ? raw.slice(firstLineEnd + 1).trim() : "";
    return { category: custom || "General", notes: cleanNotes || null };
  }
  return { category: docCategory, notes: notes ?? null };
}

// GET /api/documents?athleteId=xxx
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const athleteId = req.nextUrl.searchParams.get("athleteId");
  if (!athleteId) return NextResponse.json({ error: "athleteId requerido" }, { status: 400 });

  const docs = await prisma.document.findMany({
    where: { athleteId, deletedAt: null },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    docs.map((d) => {
      const parsed = readCategory(d.category, d.notes);
      return {
        ...d,
        category: parsed.category,
        notes: parsed.notes,
      };
    })
  );
}

// POST /api/documents  (multipart/form-data)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const athleteId = formData.get("athleteId") as string | null;
  const title = (formData.get("title") as string | null) ?? "";
  const category = (formData.get("category") as string | null) ?? "general";
  const notes = (formData.get("notes") as string | null) ?? undefined;

  if (!file || !athleteId) {
    return NextResponse.json({ error: "file y athleteId son requeridos" }, { status: 400 });
  }

  if (!ALLOWED_MIME.includes(file.type)) {
    return NextResponse.json({ error: "Tipo de archivo no permitido" }, { status: 415 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Archivo demasiado grande (max 10 MB)" }, { status: 413 });
  }

  // Obtener el coachId desde el usuario autenticado
  const coachProfile = await prisma.coach.findUnique({
    where: { userId: session.user.id },
  });
  if (!coachProfile) {
    return NextResponse.json({ error: "Perfil coach no encontrado" }, { status: 403 });
  }

  // Verificar que el atleta pertenece al coach
  const athlete = await prisma.athlete.findFirst({
    where: { id: athleteId, coachId: coachProfile.id },
  });
  if (!athlete) {
    return NextResponse.json({ error: "Atleta no encontrado" }, { status: 404 });
  }

  // Guardar el archivo con nombre único
  const ext = path.extname(file.name) || ".bin";
  const safeName = `${Date.now()}-${athleteId.slice(-6)}${ext}`;
  await mkdir(UPLOADS_DIR, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOADS_DIR, safeName), buffer);

  const categoryInput = category.trim() || "general";
  const normalizedCategory = categoryInput.toLowerCase();
  const mappedCategory = CATEGORY_MAP[normalizedCategory] ?? "GENERAL";
  const isPresetCategory = Boolean(CATEGORY_MAP[normalizedCategory]);
  const cleanNotes = notes?.trim() ?? "";
  const storedNotes = isPresetCategory
    ? (cleanNotes || undefined)
    : `${CUSTOM_CATEGORY_PREFIX}${categoryInput}${cleanNotes ? `\n${cleanNotes}` : ""}`;

  const doc = await prisma.document.create({
    data: {
      athleteId,
      coachId: coachProfile.id,
      title: title || file.name,
      category: mappedCategory as Parameters<typeof prisma.document.create>[0]["data"]["category"],
      fileUrl: `/uploads/docs/${safeName}`,
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      notes: storedNotes,
    },
  });

  const parsed = readCategory(doc.category, doc.notes);
  return NextResponse.json({ ...doc, category: parsed.category, notes: parsed.notes }, { status: 201 });
}
