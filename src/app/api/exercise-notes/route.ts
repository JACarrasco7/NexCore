import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { assertAthleteAccess } from "@/lib/api";
import type { ExerciseNote } from "@/lib/domain";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const athleteId = searchParams.get("athleteId");
  const exerciseName = searchParams.get("exercise");

  if (!athleteId || !exerciseName) {
    return NextResponse.json({ error: "athleteId y exercise requeridos" }, { status: 400 });
  }

  try {
    await assertAthleteAccess(athleteId);
  } catch {
    return NextResponse.json({ error: "Sin acceso" }, { status: 403 });
  }

  const notes = await prisma.exerciseNote.findMany({
    where: { athleteId, exerciseName },
    orderBy: { createdAt: "desc" },
  });

  const mapped: ExerciseNote[] = notes.map((n) => ({
    id: n.id,
    athleteId: n.athleteId,
    exerciseName: n.exerciseName,
    content: n.content,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
  }));

  return NextResponse.json(mapped);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body: { athleteId: string; exerciseName: string; content: string } = await request.json();

  if (!body.athleteId || !body.exerciseName || !body.content?.trim()) {
    return NextResponse.json({ error: "athleteId, exerciseName y content requeridos" }, { status: 400 });
  }

  try {
    await assertAthleteAccess(body.athleteId);
  } catch {
    return NextResponse.json({ error: "Sin acceso" }, { status: 403 });
  }

  const note = await prisma.exerciseNote.create({
    data: {
      athleteId: body.athleteId,
      exerciseName: body.exerciseName,
      content: body.content.trim(),
    },
  });

  return NextResponse.json({
    id: note.id,
    athleteId: note.athleteId,
    exerciseName: note.exerciseName,
    content: note.content,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  } satisfies ExerciseNote, { status: 201 });
}
