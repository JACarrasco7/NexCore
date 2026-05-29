'use client'

import { useMemo } from 'react'
import type { LocalSession } from './types'

type TrainingSummaryBarProps = {
  sessions: LocalSession[]
  onOpenDrawer: () => void
}

export function TrainingSummaryBar({ sessions, onOpenDrawer }: TrainingSummaryBarProps) {
  const summary = useMemo(() => {
    const totalSets = sessions.reduce(
      (acc, s) => acc + s.exercises.reduce((a, e) => a + e.sets, 0),
      0
    )
    const totalExercises = sessions.reduce((acc, s) => acc + s.exercises.length, 0)
    const totalSessions = sessions.length
    const estimatedMinutes = Math.round(totalExercises * 2.5) // ~2.5 min por ejercicio

    return { totalSessions, totalExercises, totalSets, estimatedMinutes }
  }, [sessions])

  return (
    <div className="from-accent/5 to-accent/10 border-line rounded-3xl border bg-linear-to-br p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <p className="text-foreground/60 mb-3 text-sm">Resumen del entrenamiento</p>
          <div className="flex items-center gap-6 sm:gap-8">
            <div>
              <p className="text-accent text-2xl font-bold sm:text-3xl">{summary.totalSessions}</p>
              <p className="text-foreground/50 text-xs">
                Sesion{summary.totalSessions !== 1 ? 'es' : ''}
              </p>
            </div>
            <div>
              <p className="text-accent text-2xl font-bold sm:text-3xl">{summary.totalExercises}</p>
              <p className="text-foreground/50 text-xs">Ejercicios</p>
            </div>
            <div className="text-foreground/60 ml-auto text-right text-sm">
              <p className="font-semibold">{summary.totalSets} sets</p>
              <p className="text-foreground/50 text-xs">~{summary.estimatedMinutes} min</p>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenDrawer}
          className="border-accent/30 text-accent hover:bg-accent/10 rounded-xl border px-4 py-2 text-sm font-medium whitespace-nowrap transition"
        >
          Ver detalle
        </button>
      </div>
    </div>
  )
}
