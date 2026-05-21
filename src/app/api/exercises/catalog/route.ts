/**
 * GET /api/exercises/catalog
 * Devuelve todos los ejercicios de ExerciseMuscleMapping agrupados por músculo primario.
 * Accesible para atletas y coaches.
 */

import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export type CatalogExercise = {
  id: string
  name: string
  primaryMuscle: string
  secondaryMuscles: string[]
}

export type CatalogGroup = {
  muscle: string
  exercises: CatalogExercise[]
}

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rows = await prisma.exerciseMuscleMapping.findMany({
    orderBy: [{ primaryMuscle: 'asc' }, { exercise: 'asc' }],
    select: {
      id: true,
      exercise: true,
      primaryMuscle: true,
      secondaryMuscles: true,
    },
  })

  // Agrupar por músculo primario
  const grouped = new Map<string, CatalogExercise[]>()

  for (const row of rows) {
    const secondary = Array.isArray(row.secondaryMuscles) ? (row.secondaryMuscles as string[]) : []

    const ex: CatalogExercise = {
      id: row.id,
      name: row.exercise,
      primaryMuscle: row.primaryMuscle,
      secondaryMuscles: secondary,
    }

    const list = grouped.get(row.primaryMuscle) ?? []
    list.push(ex)
    grouped.set(row.primaryMuscle, list)
  }

  const groups: CatalogGroup[] = Array.from(grouped.entries()).map(([muscle, exercises]) => ({
    muscle,
    exercises,
  }))

  return NextResponse.json({ groups, total: rows.length })
}
