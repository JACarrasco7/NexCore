import { apiHandler } from '@/lib/api/api-handler';
import { NextRequest } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getClientIp, getRateLimitKey } from '@/lib/rate-limit';
import { paginationSchema, buildPaginationResponse } from '@/lib/api';
import { parseJsonOrError } from '@/lib/api/json-parser';
import { BusinessError, ApiError, ErrorCodes, throw404, throwForbidden } from '@/lib/errors';

const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads', 'docs');
const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

const CATEGORY_MAP: Record<string, string> = {
  dieta: 'DIETA',
  plan_pdf: 'PLAN_PDF',
  analisis: 'ANALISIS',
  progreso: 'PROGRESO',
  general: 'GENERAL',
};

const CUSTOM_CATEGORY_PREFIX = '__cat__:';

function readCategory(docCategory: string, notes?: string | null) {
  const raw = (notes ?? '').trim();
  if (raw.startsWith(CUSTOM_CATEGORY_PREFIX)) {
    const firstLineEnd = raw.indexOf('\n');
    const firstLine = firstLineEnd >= 0 ? raw.slice(0, firstLineEnd) : raw;
    const custom = firstLine.replace(CUSTOM_CATEGORY_PREFIX, '').trim();
    const cleanNotes = firstLineEnd >= 0 ? raw.slice(firstLineEnd + 1).trim() : '';
    return { category: custom || 'General', notes: cleanNotes || null };
  }
  return { category: docCategory, notes: notes ?? null };
}

export const GET = apiHandler({
  auth: 'session',
  handler: async ({ req }) => {
    const session = (await Promise.resolve()) as any; // session is provided by apiHandler

    // Extract session from context (apiHandler sets it)
    // Validate session was required
    // Note: apiHandler already enforces auth, so session exists here

    const athleteId = (req as NextRequest).nextUrl.searchParams.get('athleteId');
    if (!athleteId) throw new BusinessError('athleteId requerido', ErrorCodes.INVALID_INPUT, 400);

    // Parse pagination params (support both `take` and legacy `limit`)
    const takeParam = (req as NextRequest).nextUrl.searchParams.get('take') ?? (req as NextRequest).nextUrl.searchParams.get('limit') ?? undefined;
    const cursorParam = (req as NextRequest).nextUrl.searchParams.get('cursor') ?? undefined;
    const paginationParams = paginationSchema.safeParse({ take: takeParam, cursor: cursorParam });
    if (!paginationParams.success) throw new BusinessError('Invalid pagination params', ErrorCodes.VALIDATION_FAILED, 400);

    const { take, cursor } = paginationParams.data;

    const docs = await prisma.document.findMany({
      where: { athleteId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: take + 1,
      ...(cursor && { skip: 1, cursor: { id: cursor } }),
    });

    const { items, nextCursor } = buildPaginationResponse(docs, take);

    return {
      items: items.map((d) => {
        const parsed = readCategory(d.category, d.notes);
        return { ...d, category: parsed.category, notes: parsed.notes };
      }),
      nextCursor,
    };
  },
});

export const POST = apiHandler({
  auth: 'coach',
  handler: async ({ req, session }) => {
    // Rate limiting for document uploads
    const clientIp = getClientIp((req as NextRequest).headers);
    const rateLimitKey = getRateLimitKey(clientIp, session.user.id);
    const { ok } = await checkRateLimit(rateLimitKey, 10, 60); // 10 req/min per user
    if (!ok) throw new ApiError('Rate limited', 429, ErrorCodes.RATE_LIMITED);

    const formData = await (req as NextRequest).formData();
    const file = formData.get('file') as File | null;
    const athleteId = formData.get('athleteId') as string | null;
    const title = (formData.get('title') as string | null) ?? '';
    const category = (formData.get('category') as string | null) ?? 'general';
    const notes = (formData.get('notes') as string | null) ?? undefined;

    if (!file || !athleteId) throw new BusinessError('file y athleteId son requeridos', ErrorCodes.INVALID_INPUT, 400);

    if (!ALLOWED_MIME.includes(file.type)) throw new ApiError('Tipo de archivo no permitido', 415);

    if (file.size > MAX_SIZE) throw new ApiError('Archivo demasiado grande', 413);

    const coachProfile = await prisma.coach.findUnique({ where: { userId: session.user.id } });
    if (!coachProfile) throwForbidden('Perfil coach no encontrado');

    const athlete = await prisma.athlete.findFirst({ where: { id: athleteId, coachId: coachProfile.id } });
    if (!athlete) throw404('Atleta');

    const ext = path.extname(file.name) || '.bin';
    const safeName = `${Date.now()}-${athleteId.slice(-6)}${ext}`;
    await mkdir(UPLOADS_DIR, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(UPLOADS_DIR, safeName), buffer);

    const categoryInput = category.trim() || 'general';
    const normalizedCategory = categoryInput.toLowerCase();
    const mappedCategory = CATEGORY_MAP[normalizedCategory] ?? 'GENERAL';
    const isPresetCategory = Boolean(CATEGORY_MAP[normalizedCategory]);
    const cleanNotes = notes?.trim() ?? '';
    const storedNotes = isPresetCategory ? (cleanNotes || undefined) : `${CUSTOM_CATEGORY_PREFIX}${categoryInput}${cleanNotes ? `\n${cleanNotes}` : ''}`;

    const doc = await prisma.document.create({
      data: {
        athleteId,
        coachId: coachProfile.id,
        title: title || file.name,
        category: mappedCategory as Parameters<typeof prisma.document.create>[0]['data']['category'],
        fileUrl: `/uploads/docs/${safeName}`,
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        notes: storedNotes,
      },
    });

    const parsed = readCategory(doc.category, doc.notes);
    return { ...doc, category: parsed.category, notes: parsed.notes };
  },
});
