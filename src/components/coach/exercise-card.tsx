'use client'

import { useState } from 'react'
import { ChevronDown, Trash2, GripVertical } from 'lucide-react'
import { ExerciseSearch } from './exercise-search'
import type { LocalExercise } from './types'

type ExerciseCardProps = {
  ex: LocalExercise
  onChange: (patch: Partial<LocalExercise>) => void
  onRemove: () => void
  dragHandleProps?: any
  isDragging?: boolean
}

export function ExerciseCard({
  ex,
  onChange,
  onRemove,
  dragHandleProps,
  isDragging,
}: ExerciseCardProps) {
  const [expanded, setExpanded] = useState(!ex.exercise)

  return (
    <div
      className={`border-line bg-surface rounded-2xl border transition-all duration-200 ${isDragging ? 'bg-accent/10 ring-accent shadow-md ring-2' : 'hover:bg-surface/80 hover:shadow-sm'}`}
    >
      {/* Header - siempre visible */}
      <div className="flex items-center justify-between gap-3 p-3.5">
        <div
          {...dragHandleProps}
          className="text-foreground/30 hover:text-foreground/50 flex-shrink-0 cursor-grab transition-colors active:cursor-grabbing"
        >
          <GripVertical size={14} />
        </div>
        <div className="min-w-0 flex-1">
          {expanded ? (
            <ExerciseSearch
              onSelect={(name) => onChange({ exercise: name })}
              showFavorites={false}
            />
          ) : (
            <div className="flex min-w-0 items-center gap-2">
              <span className="text-foreground truncate font-medium">
                {ex.exercise || '(sin nombre)'}
              </span>
              {ex.exercise && (
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-foreground/40 bg-surface-strong rounded px-1.5 py-0.5">
                    {ex.sets}×{ex.reps}
                  </span>
                  {ex.targetRir && <span className="text-accent/70">RIR {ex.targetRir}</span>}
                  {ex.restSeconds && <span className="text-foreground/50">{ex.restSeconds}s</span>}
                  {ex.loadKg && <span className="text-accent/80 font-medium">{ex.loadKg}kg</span>}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-foreground/60 hover:text-accent rounded-lg p-1 transition"
            title={expanded ? 'Colapsar' : 'Expandir'}
          >
            <ChevronDown
              size={16}
              className={`transition-transform ${expanded ? 'rotate-0' : '-rotate-90'}`}
            />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="border-danger/30 bg-danger/5 text-danger hover:bg-danger/10 rounded-lg border p-1 transition"
            title="Eliminar ejercicio"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Body - solo cuando expandido */}
      <div
        className={`border-line overflow-hidden border-t transition-all duration-300 ease-in-out ${expanded ? 'max-h-[1500px] opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <div className="bg-surface/50 p-4 pt-3">
          {/* Fila 1: Series, Reps, RIR, Descanso */}
          <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className="text-foreground/50 mb-1 block text-xs font-medium">Series</label>
              <input
                type="number"
                min={1}
                className="border-line bg-surface focus:ring-accent/50 w-full rounded-lg border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
                value={ex.sets}
                onChange={(e) => onChange({ sets: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="text-foreground/50 mb-1 block text-xs font-medium">Reps</label>
              <input
                className="border-line bg-surface focus:ring-accent/50 w-full rounded-lg border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
                placeholder="8-10"
                value={ex.reps}
                onChange={(e) => onChange({ reps: e.target.value })}
              />
            </div>
            <div>
              <label className="text-foreground/50 mb-1 block text-xs font-medium">RIR</label>
              <input
                className="border-line bg-surface focus:ring-accent/50 w-full rounded-lg border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
                placeholder="2"
                value={ex.targetRir ?? ''}
                onChange={(e) => onChange({ targetRir: e.target.value || undefined })}
              />
            </div>
            <div>
              <label className="text-foreground/50 mb-1 block text-xs font-medium">
                Descanso (s)
              </label>
              <input
                type="number"
                min={0}
                className="border-line bg-surface focus:ring-accent/50 w-full rounded-lg border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
                placeholder="90"
                value={ex.restSeconds ?? ''}
                onChange={(e) =>
                  onChange({ restSeconds: e.target.value ? Number(e.target.value) : undefined })
                }
              />
            </div>
          </div>

          {/* Fila 2: Carga y variaciones */}
          <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div>
              <label className="text-foreground/50 mb-1 block text-xs font-medium">
                Carga (kg)
              </label>
              <input
                type="number"
                min={0}
                className="border-line bg-surface focus:ring-accent/50 w-full rounded-lg border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
                placeholder="80"
                value={ex.loadKg ?? ''}
                onChange={(e) =>
                  onChange({ loadKg: e.target.value ? Number(e.target.value) : undefined })
                }
              />
            </div>
            <div>
              <label className="text-foreground/50 mb-1 block text-xs font-medium">Nota</label>
              <input
                className="border-line bg-surface focus:ring-accent/50 w-full rounded-lg border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
                placeholder="RPE 8"
                value={ex.loadNote ?? ''}
                onChange={(e) => onChange({ loadNote: e.target.value || undefined })}
              />
            </div>
            <div>
              <label className="text-foreground/50 mb-1 block text-xs font-medium">Coach cue</label>
              <input
                className="border-line bg-surface focus:ring-accent/50 w-full rounded-lg border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
                placeholder="Codos 45°"
                value={ex.coachCue ?? ''}
                onChange={(e) => onChange({ coachCue: e.target.value || undefined })}
              />
            </div>
          </div>

          {/* Fila 3: Progresión y notas */}
          <div className="mb-3">
            <label className="text-foreground/50 mb-1 block text-xs font-medium">
              Criterio de progresión
            </label>
            <input
              className="border-line bg-surface focus:ring-accent/50 w-full rounded-lg border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
              placeholder="Si >8 reps, +2.5 kg"
              value={ex.progressionNote ?? ''}
              onChange={(e) => onChange({ progressionNote: e.target.value || undefined })}
            />
          </div>

          <div>
            <label className="text-foreground/50 mb-1 block text-xs font-medium">Notas</label>
            <textarea
              rows={2}
              className="border-line bg-surface focus:ring-accent/50 w-full resize-none rounded-lg border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
              placeholder="Técnica, variantes..."
              value={ex.notes ?? ''}
              onChange={(e) => onChange({ notes: e.target.value || undefined })}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
