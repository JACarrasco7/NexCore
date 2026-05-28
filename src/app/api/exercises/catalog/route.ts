/**
 * GET /api/exercises/catalog
 * Devuelve todos los ejercicios de ExerciseMuscleMapping agrupados por músculo primario.
 * Accesible para atletas y coaches.
 *
 * Query params:
 * - muscle: filtrar por músculo primario
 * - type: filtrar por tipo (push, pull, legs, core)
 */

import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export type CatalogExercise = {
  id: string
  name: string
  primaryMuscle: string
  secondaryMuscles: string[]
  externalImageUrl?: string | null
}

export type CatalogGroup = {
  muscle: string
  exercises: CatalogExercise[]
}

const muscleToType: Record<string, string> = {
  pecho: 'push',
  hombro: 'push',
  triceps: 'push',
  espalda: 'pull',
  bíceps: 'pull',
  trapecio: 'pull',
  pierna: 'legs',
  glúteos: 'legs',
  isquiotibiales: 'legs',
  gemelos: 'legs',
  adictores: 'legs',
  abductores: 'legs',
  core: 'core',
}

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const muscleFilter = searchParams.get('muscle')
  const typeFilter = searchParams.get('type')

  const where: any = {}
  if (muscleFilter) {
    where.primaryMuscle = muscleFilter
  }

  const rows = await prisma.exerciseMuscleMapping.findMany({
    where,
    orderBy: [{ primaryMuscle: 'asc' }, { exercise: 'asc' }],
    select: {
      id: true,
      exercise: true,
      primaryMuscle: true,
      secondaryMuscles: true,
      externalImageUrl: true,
    },
  })

  let filtered = rows

  if (typeFilter) {
    filtered = rows.filter((row) => muscleToType[row.primaryMuscle] === typeFilter)
  }

  // Agrupar por músculo primario
  const grouped = new Map<string, CatalogExercise[]>()

  for (const row of filtered) {
    const secondary = Array.isArray(row.secondaryMuscles) ? (row.secondaryMuscles as string[]) : []

    const ex: CatalogExercise = {
      id: row.id,
      name: row.exercise,
      primaryMuscle: row.primaryMuscle,
      secondaryMuscles: secondary,
      externalImageUrl: row.externalImageUrl,
    }

    const list = grouped.get(row.primaryMuscle) ?? []
    list.push(ex)
    grouped.set(row.primaryMuscle, list)
  }

  const groups: CatalogGroup[] = Array.from(grouped.entries()).map(([muscle, exercises]) => ({
    muscle,
    exercises,
  }))

  return NextResponse.json({ groups, total: filtered.length })
}
