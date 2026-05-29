'use client'

import { useMemo } from 'react'
import { X } from 'lucide-react'
import type { LocalSession } from './types'

type TrainingDetailDrawerProps = {
  sessions: LocalSession[]
  open: boolean
  onClose: () => void
}

const muscleColors: Record<string, string> = {
  pecho: 'bg-red-100 text-red-700',
  espalda: 'bg-blue-100 text-blue-700',
  hombro: 'bg-purple-100 text-purple-700',
  triceps: 'bg-indigo-100 text-indigo-700',
  bíceps: 'bg-pink-100 text-pink-700',
  pierna: 'bg-green-100 text-green-700',
  glúteos: 'bg-emerald-100 text-emerald-700',
  gemelos: 'bg-teal-100 text-teal-700',
  core: 'bg-orange-100 text-orange-700',
}

const pushExercises = [
  'press',
  'banca',
  'hombro',
  'elevacion',
  'curl',
  'extension',
  'patada',
  'dips',
]
const pullExercises = ['remo', 'jalón', 'dominada', 'peso muerto', 'curl', 'face pull']

function inferMuscle(exercise: string): string {
  const name = exercise.toLowerCase()
  if (name.includes('press') || name.includes('banca')) return 'pecho'
  if (name.includes('remo') || name.includes('jalón') || name.includes('dominada')) return 'espalda'
  if (name.includes('sentadilla') || name.includes('pierna') || name.includes('prensa'))
    return 'pierna'
  if (name.includes('curl')) return 'bíceps'
  if (name.includes('extension') || name.includes('patada') || name.includes('kickback'))
    return 'triceps'
  if (name.includes('hombro') || name.includes('elevacion') || name.includes('deltoid'))
    return 'hombro'
  if (name.includes('peso muerto') || name.includes('glúteo') || name.includes('hip thrust'))
    return 'glúteos'
  if (name.includes('gemelo') || name.includes('elevación de talón')) return 'gemelos'
  return 'core'
}

function isPush(exercise: string): boolean {
  const name = exercise.toLowerCase()
  return pushExercises.some((k) => name.includes(k)) && !pullExercises.some((k) => name.includes(k))
}

export function TrainingDetailDrawer({ sessions, open, onClose }: TrainingDetailDrawerProps) {
  const { volumeByMuscle, pushSets, pullSets, avgRir } = useMemo(() => {
    const map = new Map<string, number>()
    let push = 0,
      pull = 0
    const rirs: number[] = []

    sessions.forEach((s) => {
      s.exercises.forEach((e) => {
        const muscle = inferMuscle(e.exercise)
        map.set(muscle, (map.get(muscle) || 0) + e.sets)
        if (isPush(e.exercise)) push += e.sets
        else pull += e.sets
        if (e.targetRir) rirs.push(Number(e.targetRir))
      })
    })

    return {
      volumeByMuscle: Array.from(map.entries()).sort((a, b) => b[1] - a[1]),
      pushSets: push,
      pullSets: pull,
      avgRir: rirs.length ? (rirs.reduce((a, b) => a + b, 0) / rirs.length).toFixed(1) : '-',
    }
  }, [sessions])

  const totalSets = volumeByMuscle.reduce((acc, [, sets]) => acc + sets, 0)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="bg-background border-line absolute top-0 right-0 h-full w-full max-w-md border-l shadow-xl">
        <div className="flex h-full flex-col">
          <div className="border-line flex items-center justify-between border-b p-4">
            <h3 className="text-foreground text-lg font-semibold">Desglose del plan</h3>
            <button onClick={onClose} className="text-foreground/60 hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {/* Resumen general */}
            <div className="mb-4">
              <h4 className="text-foreground/80 mb-2 text-sm font-medium">Resumen general</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-surface-strong rounded-xl p-3 text-center">
                  <p className="text-accent text-2xl font-bold">{sessions.length}</p>
                  <p className="text-foreground/50 text-xs">Sesiones</p>
                </div>
                <div className="bg-surface-strong rounded-xl p-3 text-center">
                  <p className="text-accent text-2xl font-bold">{totalSets}</p>
                  <p className="text-foreground/50 text-xs">Total sets</p>
                </div>
                <div className="bg-surface-strong rounded-xl p-3 text-center">
                  <p className="text-accent text-2xl font-bold">{pushSets}</p>
                  <p className="text-foreground/50 text-xs">Push sets</p>
                </div>
                <div className="bg-surface-strong rounded-xl p-3 text-center">
                  <p className="text-accent text-2xl font-bold">{pullSets}</p>
                  <p className="text-foreground/50 text-xs">Pull sets</p>
                </div>
              </div>
            </div>

            {/* Volumen por músculo */}
            <div className="mb-4">
              <h4 className="text-foreground/80 mb-2 text-sm font-medium">Volumen por músculo</h4>
              <div className="space-y-2">
                {volumeByMuscle.map(([muscle, sets]) => (
                  <div key={muscle} className="flex items-center justify-between">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${muscleColors[muscle] || 'bg-gray-100 text-gray-600'}`}
                    >
                      {muscle}
                    </span>
                    <span className="text-foreground font-medium">{sets} sets</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Detalle por sesión */}
            <div className="border-line border-t pt-4">
              <h4 className="text-foreground/80 mb-2 text-sm font-medium">Detalle por sesión</h4>
              <div className="space-y-3">
                {sessions.map((s, si) => (
                  <div key={si} className="border-line bg-surface rounded-lg border p-3">
                    <p className="text-foreground font-medium">{s.name}</p>
                    <p className="text-foreground/50 text-xs">{s.exercises.length} ejercicios</p>
                    <div className="mt-2 space-y-1">
                      {s.exercises.map((e, ei) => (
                        <div key={ei} className="text-foreground/70 flex justify-between text-xs">
                          <span className="truncate">{e.exercise || '(sin nombre)'}</span>
                          <span className="ml-2 shrink-0">
                            {e.sets}×{e.reps}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
