import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_ATHLETE_CONTEXT,
  type AthleteContextProfileData,
  type GymMachineItem,
  type MobilityTestItem,
  type ObjectiveMuscleItem,
  type RestrictionItem,
} from "@/lib/athlete-context";

export const dynamic = "force-dynamic";

const MAX_TEXT = 280;
const MAX_LONG_TEXT = 2000;
const MAX_ITEMS = 120;

function sanitizeText(value: unknown, max = MAX_TEXT): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function sanitizeImageUrl(value: unknown): string {
  const raw = sanitizeText(value, 800_000);
  if (!raw) return "";

  const isHttp = /^https?:\/\//i.test(raw);
  const isDataImage = /^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(raw);
  return isHttp || isDataImage ? raw : "";
}

function dedupeByName<T extends { name: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const output: T[] = [];
  for (const item of items) {
    const key = item.name.toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    output.push(item);
  }
  return output;
}

function sanitizePayload(body: AthleteContextProfileData): AthleteContextProfileData {
  const mobilityTests = (Array.isArray(body.mobilityTests) ? body.mobilityTests : [])
    .slice(0, MAX_ITEMS)
    .map((t) => ({
      id: sanitizeText(t?.id, 64),
      test: sanitizeText(t?.test, 120),
      finding: sanitizeText(t?.finding, 240),
      implication: sanitizeText(t?.implication, 400),
      severity: t?.severity === "ok" || t?.severity === "warning" || t?.severity === "risk" ? t.severity : "warning",
    }))
    .filter((t) => t.id || t.test || t.finding || t.implication);

  const restrictedFoods = dedupeByName(
    (Array.isArray(body.restrictedFoods) ? body.restrictedFoods : [])
      .slice(0, MAX_ITEMS)
      .map((f) => ({
        id: sanitizeText(f?.id, 64),
        name: sanitizeText(f?.name, 140),
        reason: sanitizeText(f?.reason, 240),
      }))
      .filter((f) => f.name)
  );

  const restrictedExercises = dedupeByName(
    (Array.isArray(body.restrictedExercises) ? body.restrictedExercises : [])
      .slice(0, MAX_ITEMS)
      .map((e) => ({
        id: sanitizeText(e?.id, 64),
        name: sanitizeText(e?.name, 140),
        reason: sanitizeText(e?.reason, 240),
      }))
      .filter((e) => e.name)
  );

  const gymMachines = dedupeByName(
    (Array.isArray(body.gymMachines) ? body.gymMachines : [])
      .slice(0, MAX_ITEMS)
      .map((m) => ({
        id: sanitizeText(m?.id, 64),
        name: sanitizeText(m?.name, 140),
        brand: sanitizeText(m?.brand, 80),
        model: sanitizeText(m?.model, 80),
        muscleGroup: sanitizeText(m?.muscleGroup, 40),
        imageUrl: sanitizeImageUrl(m?.imageUrl),
        note: sanitizeText(m?.note, 240),
      }))
      .filter((m) => m.name)
  );

  const objectiveMuscles = (Array.isArray(body.objectiveMuscles) ? body.objectiveMuscles : [])
    .slice(0, MAX_ITEMS)
    .map((m) => ({
      id: sanitizeText(m?.id, 64),
      muscle: sanitizeText(m?.muscle, 120),
      priority: m?.priority === "baja" || m?.priority === "media" || m?.priority === "alta" ? m.priority : "media",
      idealVolume: sanitizeText(m?.idealVolume, 80),
      maxVolume: sanitizeText(m?.maxVolume, 80),
    }))
    .filter((m) => m.muscle);

  return {
    mobilityTests,
    restrictedFoods,
    restrictedExercises,
    gymMachines,
    objectiveMuscles,
    notes: sanitizeText(body.notes, MAX_LONG_TEXT),
  };
}

function normalizeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function mapProfile(profile: {
  mobilityTestsJson: unknown;
  restrictedFoodsJson: unknown;
  restrictedExercises: unknown;
  gymMachinesJson?: unknown;
  objectiveMuscles: unknown;
  notes: string | null;
} | null): AthleteContextProfileData {
  if (!profile) return DEFAULT_ATHLETE_CONTEXT;

  return {
    mobilityTests: normalizeArray<MobilityTestItem>(profile.mobilityTestsJson),
    restrictedFoods: normalizeArray<RestrictionItem>(profile.restrictedFoodsJson),
    restrictedExercises: normalizeArray<RestrictionItem>(profile.restrictedExercises),
    gymMachines: normalizeArray<GymMachineItem>(profile.gymMachinesJson),
    objectiveMuscles: normalizeArray<ObjectiveMuscleItem>(profile.objectiveMuscles),
    notes: profile.notes ?? "",
  };
}

function mapAthleteView(profile: AthleteContextProfileData): AthleteContextProfileData {
  return {
    ...DEFAULT_ATHLETE_CONTEXT,
    gymMachines: profile.gymMachines,
  };
}

async function assertCoachAccess(athleteId: string, userId: string) {
  const coach = await prisma.coach.findUnique({ where: { userId }, select: { id: true } });
  if (!coach) return false;

  const athlete = await prisma.athlete.findUnique({ where: { id: athleteId }, select: { coachId: true } });
  if (!athlete) return false;

  return athlete.coachId === coach.id;
}

async function assertAthleteSelfAccess(athleteId: string, userId: string) {
  const athlete = await prisma.athlete.findUnique({ where: { userId }, select: { id: true } });
  if (!athlete) return false;
  return athlete.id === athleteId;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  if (role !== "COACH" && role !== "ADMIN" && role !== "ATHLETE") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const canCoachAccess = role === "ADMIN" ? true : await assertCoachAccess(id, session.user.id);
  const canAthleteAccess = role === "ATHLETE" ? await assertAthleteSelfAccess(id, session.user.id) : false;
  if (!canCoachAccess && !canAthleteAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const profile = await prisma.athleteContextProfile.findUnique({ where: { athleteId: id } });
  const mapped = mapProfile(profile);
  if (canAthleteAccess && role === "ATHLETE") {
    return NextResponse.json(mapAthleteView(mapped));
  }

  return NextResponse.json(mapped);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  if (role !== "COACH" && role !== "ADMIN" && role !== "ATHLETE") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const canCoachAccess = role === "ADMIN" ? true : await assertCoachAccess(id, session.user.id);
  const canAthleteAccess = role === "ATHLETE" ? await assertAthleteSelfAccess(id, session.user.id) : false;

  if (!canCoachAccess && !canAthleteAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as AthleteContextProfileData;

  const payload = sanitizePayload(body);

  const existing = await prisma.athleteContextProfile.findUnique({ where: { athleteId: id } });
  const existingMapped = mapProfile(existing);

  // Regla de negocio: la maquinaria la gestiona el atleta.
  // Coach/Admin editan el resto del contexto, pero no sobrescriben gymMachines.
  // Athlete solo puede editar gymMachines.
  const finalPayload: AthleteContextProfileData = canAthleteAccess
    ? {
      ...existingMapped,
      gymMachines: payload.gymMachines,
    }
    : {
      ...payload,
      gymMachines: existingMapped.gymMachines,
    };

  const row = await prisma.athleteContextProfile.upsert({
    where: { athleteId: id },
    create: {
      athleteId: id,
      mobilityTestsJson: finalPayload.mobilityTests,
      restrictedFoodsJson: finalPayload.restrictedFoods,
      restrictedExercises: finalPayload.restrictedExercises,
      gymMachinesJson: finalPayload.gymMachines,
      objectiveMuscles: finalPayload.objectiveMuscles,
      notes: finalPayload.notes,
    },
    update: {
      mobilityTestsJson: finalPayload.mobilityTests,
      restrictedFoodsJson: finalPayload.restrictedFoods,
      restrictedExercises: finalPayload.restrictedExercises,
      gymMachinesJson: finalPayload.gymMachines,
      objectiveMuscles: finalPayload.objectiveMuscles,
      notes: finalPayload.notes,
    },
  });

  const mapped = mapProfile(row);
  if (canAthleteAccess && role === "ATHLETE") {
    return NextResponse.json(mapAthleteView(mapped));
  }

  return NextResponse.json(mapped);
}
