import type { LocalSession } from '@/components/coach/types'

export type PlanDiff = {
  sessionsAdded: number
  sessionsRemoved: number
  sessionsModified: number
  totalSetsBefore: number
  totalSetsAfter: number
  volumeByMuscle: { muscle: string; before: number; after: number; diff: number }[]
}

export function computePlanDiff(before: LocalSession[], after: LocalSession[]): PlanDiff {
  const beforeMap = new Map<string, LocalSession>()
  const afterMap = new Map<string, LocalSession>()

  before.forEach((s) => beforeMap.set(s.name, s))
  after.forEach((s) => afterMap.set(s.name, s))

  let added = 0,
    removed = 0,
    modified = 0

  const muscleMap = new Map<string, { before: number; after: number }>()

  // Count added/removed/modified
  after.forEach((s) => {
    if (!beforeMap.has(s.name)) added++
    else modified++
  })
  before.forEach((s) => {
    if (!afterMap.has(s.name)) removed++
  })

  // Calculate volume by muscle
  const inferMuscle = (exercise: string): string => {
    const name = exercise.toLowerCase()
    if (name.includes('press') || name.includes('banca')) return 'pecho'
    if (name.includes('remo') || name.includes('jalón')) return 'espalda'
    if (name.includes('sentadilla') || name.includes('pierna')) return 'pierna'
    if (name.includes('curl')) return 'bíceps'
    if (name.includes('extension') || name.includes('patada')) return 'triceps'
    if (name.includes('hombro') || name.includes('elevacion')) return 'hombro'
    if (name.includes('peso muerto') || name.includes('glúteo')) return 'glúteos'
    return 'core'
  }

  const addVolume = (
    map: Map<string, { before: number; after: number }>,
    sessions: LocalSession[],
    isAfter: boolean
  ) => {
    sessions.forEach((s) => {
      s.exercises.forEach((e) => {
        const muscle = inferMuscle(e.exercise)
        const entry = map.get(muscle) || { before: 0, after: 0 }
        if (isAfter) entry.after += e.sets
        else entry.before += e.sets
        map.set(muscle, entry)
      })
    })
  }

  addVolume(muscleMap, before, false)
  addVolume(muscleMap, after, true)

  const volumeByMuscle = Array.from(muscleMap.entries()).map(([muscle, v]) => ({
    muscle,
    before: v.before,
    after: v.after,
    diff: v.after - v.before,
  }))

  const totalSetsBefore = before.reduce(
    (acc, s) => acc + s.exercises.reduce((a, e) => a + e.sets, 0),
    0
  )
  const totalSetsAfter = after.reduce(
    (acc, s) => acc + s.exercises.reduce((a, e) => a + e.sets, 0),
    0
  )

  return {
    sessionsAdded: added,
    sessionsRemoved: removed,
    sessionsModified: modified,
    totalSetsBefore,
    totalSetsAfter,
    volumeByMuscle,
  }
}
