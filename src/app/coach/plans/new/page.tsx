'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { PageShell } from '@/components/layout'
import { SectionIntro } from '@/components/section-intro'
import { useToast } from '@/components/ui/toast'
import { ExerciseSearch } from '@/components/exercise-search'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'

// ─── tipos ────────────────────────────────────────────────────────────────────

type WeekParams = {
  sets: number
  reps: string
  targetRir?: string
  restSeconds?: number
  loadKg?: number
  loadNote?: string
  warmupSets?: number
  targetRpe?: number
}

type LocalExercise = {
  exercise: string
  coachCue?: string
  progressionNote?: string
  notes?: string
  technique?: string
  techniqueDetail?: string
  tempoEcc?: number
  tempoPause?: number
  tempoConc?: number
  videoUrl?: string
  progressionMethod?: 'double' | 'rep_target' | 'rir_driven'
  progressionIncrementKg?: number
  repTargetMax?: number
  supersetGroup?: string
  weeks: WeekParams[]
}

type LocalSession = {
  name: string
  block: string
  exercises: LocalExercise[]
}

type PlanDraft = {
  title: string
  weeksCount: number
  athleteId: string
  sessions: LocalSession[]
}

// ─── defaults ─────────────────────────────────────────────────────────────────

function defaultWeekParams(): WeekParams {
  return { sets: 3, reps: '8-10' }
}

function createExercise(weeksCount: number): LocalExercise {
  return {
    exercise: '',
    weeks: Array.from({ length: weeksCount }, () => defaultWeekParams()),
  }
}

// ─── Presets de periodización ───────────────────────────────────────────────

type PeriodizationPreset = {
  name: string
  weeks: Array<{ sets: number; reps: string; targetRir: string; targetRpe?: number }>
}

const PERIODIZATION_PRESETS: Record<string, PeriodizationPreset> = {
  accumulation_intensification: {
    name: 'Acumulación → Intensificación',
    weeks: [
      { sets: 3, reps: '10-12', targetRir: '3' },
      { sets: 3, reps: '10-12', targetRir: '2' },
      { sets: 4, reps: '8-10', targetRir: '2' },
      { sets: 4, reps: '6-8', targetRir: '1' },
      { sets: 5, reps: '4-6', targetRir: '1' },
      { sets: 3, reps: '8-10', targetRir: '3' }, // deload
    ],
  },
  linear_strength: {
    name: 'Lineal fuerza',
    weeks: [
      { sets: 3, reps: '10', targetRir: '2' },
      { sets: 3, reps: '10', targetRir: '2' },
      { sets: 3, reps: '8', targetRir: '1' },
      { sets: 3, reps: '8', targetRir: '1' },
      { sets: 3, reps: '6', targetRir: '1' },
      { sets: 3, reps: '8', targetRir: '3' }, // deload
    ],
  },
  undulating_daily: {
    name: 'Ondulatorio diario',
    weeks: [
      { sets: 3, reps: '12', targetRir: '2' },
      { sets: 3, reps: '10', targetRir: '2' },
      { sets: 3, reps: '12', targetRir: '2' },
      { sets: 3, reps: '10', targetRir: '2' },
      { sets: 3, reps: '8', targetRir: '1' },
      { sets: 3, reps: '10', targetRir: '3' }, // deload
    ],
  },
  specialization: {
    name: 'Especialización',
    weeks: [
      { sets: 4, reps: '8-10', targetRir: '2' },
      { sets: 4, reps: '8-10', targetRir: '2' },
      { sets: 5, reps: '6-8', targetRir: '1' },
      { sets: 5, reps: '6-8', targetRir: '1' },
      { sets: 6, reps: '4-6', targetRir: '1' },
      { sets: 3, reps: '8-10', targetRir: '3' }, // deload
    ],
  },
  german_volume: {
    name: 'Volumen alemán',
    weeks: [
      { sets: 10, reps: '10', targetRir: '2' },
      { sets: 10, reps: '10', targetRir: '2' },
      { sets: 10, reps: '8', targetRir: '2' },
      { sets: 10, reps: '8', targetRir: '1' },
      { sets: 3, reps: '10', targetRir: '3' }, // deload
    ],
  },
}

// ─── Step 1: Datos del Mesociclo ──────────────────────────────────────────────

function Step1({
  draft,
  onChange,
}: {
  draft: PlanDraft
  onChange: (d: Partial<PlanDraft>) => void
}) {
  return (
    <div className="space-y-5">
      <div>
        <label className="text-foreground/80 mb-1.5 block text-sm font-medium">
          Nombre del mesociclo
        </label>
        <input
          className="border-line bg-surface-strong focus:ring-accent w-full rounded-2xl border px-4 py-3 text-sm focus:ring-1 focus:outline-none"
          placeholder="Ej. Fuerza-Resistencia Fase 1"
          value={draft.title}
          onChange={(e) => onChange({ title: e.target.value })}
        />
      </div>
      <div>
        <label className="text-foreground/80 mb-1.5 block text-sm font-medium">
          Semanas del mesociclo
        </label>
        <select
          className="border-line bg-surface-strong focus:ring-accent w-full rounded-2xl border px-4 py-3 text-sm focus:ring-1 focus:outline-none"
          value={draft.weeksCount}
          onChange={(e) => onChange({ weeksCount: Number(e.target.value) })}
        >
          {Array.from({ length: 16 }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n} {n === 1 ? 'semana' : 'semanas'}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-foreground/80 mb-1.5 block text-sm font-medium">
          Preset de periodización
        </label>
        <select
          className="border-line bg-surface-strong focus:ring-accent w-full rounded-2xl border px-4 py-3 text-sm focus:ring-1 focus:outline-none"
          onChange={(e) => {
            const preset = PERIODIZATION_PRESETS[e.target.value as string]
            if (preset) {
              onChange({ weeksCount: preset.weeks.length })
            }
          }}
        >
          <option value="">— Sin preset —</option>
          {Object.entries(PERIODIZATION_PRESETS).map(([key, p]) => (
            <option key={key} value={key}>
              {p.name} ({p.weeks.length} sem)
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

// ─── Step 2: Sesiones y Ejercicios ────────────────────────────────────────────

function ExerciseRow({
  ex,
  onChange,
  onRemove,
  weeksCount,
  onAddWeek,
  onRemoveWeek,
  dragHandleProps,
  isDragging,
}: {
  ex: LocalExercise
  onChange: (patch: Partial<LocalExercise>) => void
  onRemove: () => void
  weeksCount: number
  onAddWeek: () => void
  onRemoveWeek: () => void
  dragHandleProps?: any
  isDragging?: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const missingName = !ex.exercise.trim()

  return (
    <div
      className={`rounded-3xl border p-4 transition ${
        missingName ? 'border-danger/40 bg-danger/5' : 'border-line bg-surface'
      } ${isDragging ? 'ring-accent ring-2' : ''}`}
    >
      {/* Header colapsable */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-1 items-center gap-2">
          <div
            {...dragHandleProps}
            className="text-foreground/30 hover:text-foreground/50 cursor-grab active:cursor-grabbing"
            title="Arrastrar"
          >
            ⋮⋮
          </div>
          <ExerciseSearch onSelect={(name) => onChange({ exercise: name })} showFavorites={true} />
          <span className="bg-accent/10 text-accent shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium">
            {weeksCount} sem
          </span>
        </div>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-foreground/40 hover:text-foreground/70 shrink-0 rounded-xl p-1.5 transition"
          title={expanded ? 'Colapsar semanas' : 'Editar por semana'}
        >
          {expanded ? '▲' : '▼'}
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="border-danger/30 bg-danger/5 text-danger hover:bg-danger/10 rounded-xl border px-3 py-2 text-xs transition"
        >
          Quitar
        </button>
      </div>

      {/* Tabla de semanas (expandida) */}
      {expanded && (
        <div className="mt-4 space-y-3">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-foreground/50 border-line border-b">
                  <th className="py-1.5 pr-2 text-left font-medium">Sem</th>
                  <th className="px-1 py-1.5 text-center font-medium">Series</th>
                  <th className="px-1 py-1.5 text-center font-medium">Reps</th>
                  <th className="px-1 py-1.5 text-center font-medium">RIR</th>
                  <th className="px-1 py-1.5 text-center font-medium">Cal</th>
                  <th className="px-1 py-1.5 text-center font-medium">RPE</th>
                  <th className="py-1.5 pl-1 text-center font-medium">Carga(kg)</th>
                </tr>
              </thead>
              <tbody>
                {ex.weeks.map((w, wi) => (
                  <tr key={wi} className="border-line border-b">
                    <td className="text-foreground/60 py-1.5 pr-2 font-medium">{wi + 1}</td>
                    <td className="px-0.5 py-1">
                      <input
                        type="number"
                        min={1}
                        className="border-line bg-surface-strong focus:ring-accent w-full rounded-lg border px-2 py-1.5 text-center text-xs focus:ring-1 focus:outline-none"
                        value={w.sets}
                        onChange={(e) => {
                          const weeks = [...ex.weeks]
                          weeks[wi] = { ...weeks[wi], sets: Number(e.target.value) }
                          onChange({ weeks })
                        }}
                      />
                    </td>
                    <td className="px-0.5 py-1">
                      <input
                        className="border-line bg-surface-strong focus:ring-accent w-full rounded-lg border px-2 py-1.5 text-center text-xs focus:ring-1 focus:outline-none"
                        value={w.reps}
                        onChange={(e) => {
                          const weeks = [...ex.weeks]
                          weeks[wi] = { ...weeks[wi], reps: e.target.value }
                          onChange({ weeks })
                        }}
                      />
                    </td>
                    <td className="px-0.5 py-1">
                      <input
                        className="border-line bg-surface-strong focus:ring-accent w-full rounded-lg border px-2 py-1.5 text-center text-xs focus:ring-1 focus:outline-none"
                        value={w.targetRir ?? ''}
                        placeholder="-"
                        onChange={(e) => {
                          const weeks = [...ex.weeks]
                          weeks[wi] = { ...weeks[wi], targetRir: e.target.value || undefined }
                          onChange({ weeks })
                        }}
                      />
                    </td>
                    <td className="px-0.5 py-1">
                      <input
                        type="number"
                        min={0}
                        className="border-line bg-surface-strong focus:ring-accent w-full rounded-lg border px-2 py-1.5 text-center text-xs focus:ring-1 focus:outline-none"
                        value={w.warmupSets ?? ''}
                        placeholder="-"
                        onChange={(e) => {
                          const weeks = [...ex.weeks]
                          weeks[wi] = {
                            ...weeks[wi],
                            warmupSets: e.target.value ? Number(e.target.value) : undefined,
                          }
                          onChange({ weeks })
                        }}
                      />
                    </td>
                    <td className="px-0.5 py-1">
                      <input
                        type="number"
                        min={1}
                        max={10}
                        className="border-line bg-surface-strong focus:ring-accent w-full rounded-lg border px-2 py-1.5 text-center text-xs focus:ring-1 focus:outline-none"
                        value={w.targetRpe ?? ''}
                        placeholder="-"
                        onChange={(e) => {
                          const weeks = [...ex.weeks]
                          weeks[wi] = {
                            ...weeks[wi],
                            targetRpe: e.target.value ? Number(e.target.value) : undefined,
                          }
                          onChange({ weeks })
                        }}
                      />
                    </td>
                    <td className="px-0.5 py-1">
                      <input
                        type="number"
                        min={0}
                        className="border-line bg-surface-strong focus:ring-accent w-full rounded-lg border px-2 py-1.5 text-center text-xs focus:ring-1 focus:outline-none"
                        value={w.restSeconds ?? ''}
                        placeholder="-"
                        onChange={(e) => {
                          const weeks = [...ex.weeks]
                          weeks[wi] = {
                            ...weeks[wi],
                            restSeconds: e.target.value ? Number(e.target.value) : undefined,
                          }
                          onChange({ weeks })
                        }}
                      />
                    </td>
                    <td className="py-1 pl-0.5">
                      <input
                        type="number"
                        min={0}
                        className="border-line bg-surface-strong focus:ring-accent w-full rounded-lg border px-2 py-1.5 text-center text-xs focus:ring-1 focus:outline-none"
                        value={w.loadKg ?? ''}
                        placeholder="-"
                        onChange={(e) => {
                          const weeks = [...ex.weeks]
                          weeks[wi] = {
                            ...weeks[wi],
                            loadKg: e.target.value ? Number(e.target.value) : undefined,
                          }
                          onChange({ weeks })
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Botones añadir/quitar semana */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onAddWeek}
              className="border-accent/30 bg-accent/5 text-accent hover:bg-accent/10 rounded-xl border px-3 py-1.5 text-xs font-medium transition"
            >
              + Semana
            </button>
            {ex.weeks.length > 1 && (
              <button
                type="button"
                onClick={onRemoveWeek}
                className="border-line text-foreground/50 hover:border-danger/30 hover:text-danger rounded-xl border px-3 py-1.5 text-xs transition"
              >
                - Quitar última
              </button>
            )}
          </div>

          {/* Campos comunes */}
          <div className="border-line bg-surface-strong rounded-2xl border p-3">
            <p className="text-foreground/40 mb-2 text-xs">
              Campos comunes (aplican a todas las semanas)
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <label className="text-foreground/50 mb-0.5 block text-xs">Coach cue</label>
                <input
                  className="border-line bg-surface focus:ring-accent w-full rounded-xl border px-3 py-1.5 text-xs focus:ring-1 focus:outline-none"
                  placeholder="Codos 45°"
                  value={ex.coachCue ?? ''}
                  onChange={(e) => onChange({ coachCue: e.target.value || undefined })}
                />
              </div>
              <div>
                <label className="text-foreground/50 mb-0.5 block text-xs">
                  Método de progresión
                </label>
                <select
                  className="border-line bg-surface focus:ring-accent w-full rounded-xl border px-3 py-1.5 text-xs focus:ring-1 focus:outline-none"
                  value={ex.progressionMethod ?? ''}
                  onChange={(e) =>
                    onChange({
                      progressionMethod:
                        (e.target.value as 'double' | 'rep_target' | 'rir_driven') || undefined,
                    })
                  }
                >
                  <option value="">— Sin método —</option>
                  <option value="double">Doble progresión</option>
                  <option value="rep_target">Objetivo reps</option>
                  <option value="rir_driven">RIR-driven</option>
                </select>
              </div>
              {ex.progressionMethod && (
                <>
                  {ex.progressionMethod !== 'rir_driven' && (
                    <div>
                      <label className="text-foreground/50 mb-0.5 block text-xs">
                        Incremento (kg)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min={0}
                        max={50}
                        className="border-line bg-surface focus:ring-accent w-full rounded-xl border px-3 py-1.5 text-xs focus:ring-1 focus:outline-none"
                        placeholder="2.5"
                        value={ex.progressionIncrementKg ?? ''}
                        onChange={(e) =>
                          onChange({ progressionIncrementKg: Number(e.target.value) || undefined })
                        }
                      />
                    </div>
                  )}
                  {ex.progressionMethod === 'rep_target' && (
                    <div>
                      <label className="text-foreground/50 mb-0.5 block text-xs">
                        Reps objetivo máximo
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        className="border-line bg-surface focus:ring-accent w-full rounded-xl border px-3 py-1.5 text-xs focus:ring-1 focus:outline-none"
                        placeholder="12"
                        value={ex.repTargetMax ?? ''}
                        onChange={(e) =>
                          onChange({ repTargetMax: Number(e.target.value) || undefined })
                        }
                      />
                    </div>
                  )}
                </>
              )}
              <div>
                <label className="text-foreground/50 mb-0.5 block text-xs">Superset grupo</label>
                <input
                  className="border-line bg-surface focus:ring-accent w-full rounded-xl border px-3 py-1.5 text-xs focus:ring-1 focus:outline-none"
                  placeholder="A1"
                  value={ex.supersetGroup ?? ''}
                  onChange={(e) => onChange({ supersetGroup: e.target.value || undefined })}
                />
              </div>
              <div>
                <label className="text-foreground/50 mb-0.5 block text-xs">
                  Criterio progresión
                </label>
                <input
                  className="border-line bg-surface focus:ring-accent w-full rounded-xl border px-3 py-1.5 text-xs focus:ring-1 focus:outline-none"
                  placeholder="Si >8 reps, +2.5 kg"
                  value={ex.progressionNote ?? ''}
                  onChange={(e) => onChange({ progressionNote: e.target.value || undefined })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-foreground/50 mb-0.5 block text-xs">Notas</label>
                <textarea
                  rows={2}
                  className="border-line bg-surface focus:ring-accent w-full rounded-xl border px-3 py-1.5 text-xs focus:ring-1 focus:outline-none"
                  placeholder="Técnica, variantes..."
                  value={ex.notes ?? ''}
                  onChange={(e) => onChange({ notes: e.target.value || undefined })}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Step2({
  draft,
  onChange,
}: {
  draft: PlanDraft
  onChange: (d: Partial<PlanDraft>) => void
}) {
  function addSession() {
    onChange({
      sessions: [
        ...draft.sessions,
        { name: `Sesión ${draft.sessions.length + 1}`, block: 'Bloque A', exercises: [] },
      ],
    })
  }

  function removeSession(si: number) {
    onChange({ sessions: draft.sessions.filter((_, i) => i !== si) })
  }

  function updateSession(si: number, patch: Partial<LocalSession>) {
    onChange({ sessions: draft.sessions.map((s, i) => (i === si ? { ...s, ...patch } : s)) })
  }

  function addExercise(si: number) {
    const sessions = [...draft.sessions]
    sessions[si] = {
      ...sessions[si],
      exercises: [...sessions[si].exercises, createExercise(draft.weeksCount)],
    }
    onChange({ sessions })
  }

  function updateExercise(si: number, ei: number, patch: Partial<LocalExercise>) {
    const sessions = [...draft.sessions]
    sessions[si] = {
      ...sessions[si],
      exercises: sessions[si].exercises.map((e, i) => (i === ei ? { ...e, ...patch } : e)),
    }
    onChange({ sessions })
  }

  function removeExercise(si: number, ei: number) {
    const sessions = [...draft.sessions]
    sessions[si] = {
      ...sessions[si],
      exercises: sessions[si].exercises.filter((_, i) => i !== ei),
    }
    onChange({ sessions })
  }

  function applyPresetToSession(si: number, presetKey: string) {
    const preset = PERIODIZATION_PRESETS[presetKey]
    if (!preset) return
    const sessions = [...draft.sessions]
    sessions[si] = {
      ...sessions[si],
      exercises: sessions[si].exercises.map((ex) => ({
        ...ex,
        weeks: preset.weeks.map((pw) => ({
          sets: pw.sets,
          reps: pw.reps,
          targetRir: pw.targetRir,
          targetRpe: pw.targetRpe,
        })),
      })),
    }
    onChange({ sessions })
  }

  function addWeekToExercise(si: number, ei: number) {
    const sessions = [...draft.sessions]
    const ex = { ...sessions[si].exercises[ei] }
    ex.weeks = [...ex.weeks, defaultWeekParams()]
    sessions[si] = {
      ...sessions[si],
      exercises: sessions[si].exercises.map((e, i) => (i === ei ? ex : e)),
    }
    onChange({ sessions, weeksCount: ex.weeks.length })
  }

  function removeWeekFromExercise(si: number, ei: number) {
    const sessions = [...draft.sessions]
    const ex = { ...sessions[si].exercises[ei] }
    if (ex.weeks.length <= 1) return
    ex.weeks = ex.weeks.slice(0, -1)
    sessions[si] = {
      ...sessions[si],
      exercises: sessions[si].exercises.map((e, i) => (i === ei ? ex : e)),
    }
    onChange({ sessions, weeksCount: ex.weeks.length })
  }

  function handleDragEnd(result: any) {
    if (!result.destination) return
    const { source, destination } = result

    // Drag within same session
    if (source.droppableId === destination.droppableId) {
      const si = Number(source.droppableId.split('-')[1])
      const sessions = [...draft.sessions]
      const [moved] = sessions[si].exercises.splice(source.index, 1)
      sessions[si].exercises.splice(destination.index, 0, moved)
      onChange({ sessions })
      return
    }

    // Drag between sessions
    const sourceSi = Number(source.droppableId.split('-')[1])
    const destSi = Number(destination.droppableId.split('-')[1])
    const sessions = [...draft.sessions]
    const [moved] = sessions[sourceSi].exercises.splice(source.index, 1)
    sessions[destSi].exercises.splice(destination.index, 0, moved)
    onChange({ sessions })
  }

  return (
    <div className="space-y-6">
      {draft.sessions.length === 0 && (
        <p className="border-line bg-surface-strong text-foreground/50 rounded-3xl border px-5 py-6 text-sm">
          Sin sesiones. Pulsa &quot;Agregar sesión&quot; para empezar.
        </p>
      )}
      <DragDropContext onDragEnd={handleDragEnd}>
        {draft.sessions.map((s, si) => (
          <div key={si} className="border-line bg-surface-strong rounded-3xl border p-5">
            <div className="mb-4 flex items-center gap-3">
              <input
                className="border-line bg-surface focus:ring-accent flex-1 rounded-xl border px-3 py-2 text-sm font-semibold focus:ring-1 focus:outline-none"
                value={s.name}
                onChange={(e) => updateSession(si, { name: e.target.value })}
                placeholder="Nombre de la sesión"
              />
              <input
                className="border-line bg-surface focus:ring-accent w-32 rounded-xl border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
                value={s.block}
                onChange={(e) => updateSession(si, { block: e.target.value })}
                placeholder="Bloque"
              />
              <select
                className="border-line bg-surface focus:ring-accent w-44 rounded-xl border px-2 py-1.5 text-xs focus:ring-1 focus:outline-none"
                onChange={(e) => {
                  if (e.target.value) applyPresetToSession(si, e.target.value)
                  e.target.value = ''
                }}
              >
                <option value="">— Aplicar preset —</option>
                {Object.entries(PERIODIZATION_PRESETS).map(([key, p]) => (
                  <option key={key} value={key}>
                    {p.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => removeSession(si)}
                className="border-danger/30 bg-danger/5 text-danger hover:bg-danger/10 rounded-xl border px-3 py-2 text-xs transition"
              >
                Borrar
              </button>
            </div>
            <Droppable droppableId={`exercises-${si}`} type="EXERCISE">
              {(provided) => (
                <div className="space-y-3" ref={provided.innerRef} {...provided.droppableProps}>
                  {s.exercises.map((ex, ei) => (
                    <Draggable key={ei} draggableId={`ex-${si}-${ei}`} index={ei}>
                      {(provided, snapshot) => (
                        <div ref={provided.innerRef} {...provided.draggableProps}>
                          <ExerciseRow
                            ex={ex}
                            onChange={(patch) => updateExercise(si, ei, patch)}
                            onRemove={() => removeExercise(si, ei)}
                            weeksCount={ex.weeks.length}
                            onAddWeek={() => addWeekToExercise(si, ei)}
                            onRemoveWeek={() => removeWeekFromExercise(si, ei)}
                            dragHandleProps={provided.dragHandleProps}
                            isDragging={snapshot.isDragging}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
            <button
              type="button"
              onClick={() => addExercise(si)}
              className="border-accent/30 bg-accent/5 text-accent hover:bg-accent/10 mt-4 rounded-2xl border px-4 py-2 text-sm font-medium transition"
            >
              + Ejercicio
            </button>
          </div>
        ))}
      </DragDropContext>
      <VolumeSummary draft={draft} />
      <button
        type="button"
        onClick={addSession}
        className="border-line text-foreground/60 hover:border-accent/40 hover:text-accent w-full rounded-3xl border border-dashed py-4 text-sm transition"
      >
        + Agregar sesión
      </button>
    </div>
  )
}

// ─── Volume Summary ───────────────────────────────────────────────────────────

function VolumeSummary({ draft }: { draft: PlanDraft }) {
  const [muscleMap, setMuscleMap] = useState<Record<string, string>>({})

  useEffect(() => {
    const names = draft.sessions.flatMap((s) => s.exercises.map((e) => e.exercise)).filter(Boolean)
    if (names.length === 0) return
    fetch('/api/exercises/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ names }),
    })
      .then((r) => r.json())
      .then((data) => {
        const map: Record<string, string> = {}
        data.exercises?.forEach((ex: { exercise: string; primaryMuscle: string }) => {
          map[ex.exercise] = ex.primaryMuscle
        })
        setMuscleMap(map)
      })
      .catch(() => {})
  }, [draft.sessions])

  const volumeByMuscle = useMemo(() => {
    const totals: Record<string, number> = {}
    draft.sessions.forEach((s) => {
      s.exercises.forEach((e) => {
        const muscle = muscleMap[e.exercise] || 'desconocido'
        const totalSets = e.weeks.reduce((sum, w) => sum + (w.sets || 0), 0)
        totals[muscle] = (totals[muscle] || 0) + totalSets
      })
    })
    return Object.entries(totals).sort((a, b) => b[1] - a[1])
  }, [draft.sessions, muscleMap])

  if (volumeByMuscle.length === 0) return null

  const maxSets = Math.max(...volumeByMuscle.map(([, sets]) => sets))

  return (
    <div className="border-line bg-surface-strong rounded-3xl border p-4">
      <p className="text-foreground/60 mb-3 text-xs font-medium">
        Volumen semanal por grupo muscular
      </p>
      <div className="space-y-2">
        {volumeByMuscle.map(([muscle, sets]) => (
          <div key={muscle} className="flex items-center gap-2">
            <span className="text-foreground w-24 text-xs">{muscle}</span>
            <div className="flex-1 rounded-full bg-white/5">
              <div
                className="bg-accent h-2 rounded-full transition-all"
                style={{ width: `${(sets / maxSets) * 100}%` }}
              />
            </div>
            <span className="text-foreground/50 w-8 text-right text-xs">{sets}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Step 3: Asignación ───────────────────────────────────────────────────────

type Athlete = { id: string; fullName: string }

function Step3({
  draft,
  athletes,
  onChange,
}: {
  draft: PlanDraft
  athletes: Athlete[]
  onChange: (d: Partial<PlanDraft>) => void
}) {
  const totalExercises = draft.sessions.reduce((acc, s) => acc + s.exercises.length, 0)
  const totalPrescriptions = draft.sessions.reduce(
    (acc, s) => acc + s.exercises.reduce((sum, e) => sum + e.weeks.length, 0),
    0
  )

  return (
    <div className="space-y-5">
      <div>
        <label className="text-foreground/80 mb-2 block text-sm font-medium">
          Asignar a atleta
        </label>
        <select
          className="border-line bg-surface-strong focus:ring-accent w-full rounded-2xl border px-4 py-3 text-sm focus:ring-1 focus:outline-none"
          value={draft.athleteId}
          onChange={(e) => onChange({ athleteId: e.target.value })}
        >
          <option value="">— Selecciona un atleta —</option>
          {athletes.map((a) => (
            <option key={a.id} value={a.id}>
              {a.fullName}
            </option>
          ))}
        </select>
      </div>
      <div className="border-line bg-surface-strong rounded-3xl border p-5">
        <p className="text-foreground/45 mb-1 text-xs">Resumen del mesociclo</p>
        <p className="text-foreground font-semibold">{draft.title || '(sin nombre)'}</p>
        <div className="text-foreground/60 mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <span>
            {draft.weeksCount} {draft.weeksCount === 1 ? 'semana' : 'semanas'}
          </span>
          <span>·</span>
          <span>
            {draft.sessions.length} {draft.sessions.length === 1 ? 'sesión' : 'sesiones'}
          </span>
          <span>·</span>
          <span>
            {totalExercises} {totalExercises === 1 ? 'ejercicio' : 'ejercicios'}
          </span>
          <span>·</span>
          <span>{totalPrescriptions} prescripciones</span>
        </div>
      </div>
    </div>
  )
}

// ─── page ─────────────────────────────────────────────────────────────────────

const STEPS = ['Datos del mesociclo', 'Sesiones y ejercicios', 'Asignar atleta']

const EMPTY_DRAFT: PlanDraft = {
  title: '',
  weeksCount: 4,
  athleteId: '',
  sessions: [],
}

export default function NewPlanPage() {
  const router = useRouter()
  const { pushToast } = useToast()
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState<PlanDraft>(EMPTY_DRAFT)
  const [athletes, setAthletesCache] = useState<Athlete[]>([])
  const [athletesLoaded, setAthletesLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveAsTemplate, setSaveAsTemplate] = useState(false)
  const [templateName, setTemplateName] = useState('')

  function update(patch: Partial<PlanDraft>) {
    setDraft((prev) => {
      const next = { ...prev, ...patch }
      // Si cambia weeksCount, ajustar todos los ejercicios
      if (patch.weeksCount && patch.weeksCount !== prev.weeksCount) {
        const target = patch.weeksCount
        next.sessions = prev.sessions.map((s) => ({
          ...s,
          exercises: s.exercises.map((e) => {
            const currentWeeks = e.weeks.length
            if (target === currentWeeks) return e
            if (target > currentWeeks) {
              return {
                ...e,
                weeks: [
                  ...e.weeks,
                  ...Array.from({ length: target - currentWeeks }, () => defaultWeekParams()),
                ],
              }
            }
            return { ...e, weeks: e.weeks.slice(0, target) }
          }),
        }))
      }
      return next
    })
  }

  // Cargar atletas al llegar al paso 3
  async function goToStep3() {
    if (!athletesLoaded) {
      try {
        const res = await fetch('/api/athletes')
        if (res.ok) {
          const data = await res.json()
          const arr = Array.isArray(data) ? data : (data?.athletes ?? [])
          setAthletesCache(
            (arr as { id: string; fullName?: string; name?: string }[]).map((a) => ({
              id: a.id,
              fullName: a.fullName ?? a.name ?? a.id,
            }))
          )
        }
      } catch {
        // sin problema
      }
      setAthletesLoaded(true)
    }
    setStep(2)
  }

  function canAdvance() {
    if (step === 0) return draft.title.trim().length > 0
    if (step === 1)
      return (
        draft.sessions.length > 0 &&
        draft.sessions.every(
          (s) => s.exercises.length > 0 && s.exercises.every((e) => e.exercise.trim().length > 0)
        )
      )
    if (step === 2) return draft.athleteId.length > 0
    return false
  }

  async function handleSave() {
    if (!canAdvance()) return
    setSaving(true)
    try {
      // Convertir al formato de API: un ExercisePrescription por semana
      const sessions = draft.sessions.map((s) => ({
        name: s.name,
        block: s.block,
        exercises: s.exercises.flatMap((ex) =>
          ex.weeks.map((w, wi) => ({
            exercise: ex.exercise,
            sets: w.sets,
            reps: w.reps,
            targetRir: w.targetRir,
            warmupSets: w.warmupSets,
            targetRpe: w.targetRpe,
            supersetGroup: ex.supersetGroup,
            progressionMethod: ex.progressionMethod,
            progressionIncrementKg: ex.progressionIncrementKg,
            repTargetMax: ex.repTargetMax,
            restSeconds: w.restSeconds,
            loadKg: w.loadKg,
            loadNote: w.loadNote,
            coachCue: ex.coachCue,
            progressionNote: ex.progressionNote,
            notes: ex.notes,
            technique: ex.technique,
            techniqueDetail: ex.techniqueDetail,
            tempoEcc: ex.tempoEcc,
            tempoPause: ex.tempoPause,
            tempoConc: ex.tempoConc,
            videoUrl: ex.videoUrl,
            weekNumber: wi + 1,
          }))
        ),
      }))

      const res = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          athleteId: draft.athleteId,
          title: draft.title,
          weeksCount: draft.weeksCount,
          sessions,
        }),
      })

      if (!res.ok) {
        const err: { error?: string } = await res.json().catch(() => ({}))
        pushToast({ title: err.error ?? 'Error al crear el plan', variant: 'error' })
        setSaving(false)
        return
      }

      const plan: { id: string } = await res.json()

      if (saveAsTemplate && templateName.trim()) {
        await fetch('/api/plans/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: templateName.trim(),
            payload: { sessions: draft.sessions, weeksCount: draft.weeksCount },
          }),
        })
      }

      pushToast({ title: 'Mesociclo creado correctamente', variant: 'success' })
      router.push(`/coach/athletes/${draft.athleteId}`)
      void plan
    } catch {
      pushToast({ title: 'Error inesperado', variant: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageShell className="max-w-2xl gap-6 px-4 py-8 sm:px-6">
      <SectionIntro
        eyebrow="Planes de entrenamiento"
        title="Nuevo mesociclo"
        description="Diseña un mesociclo multi-semana con parámetros por semana y asígnalo a un atleta."
      />

      {/* Steps bar */}
      <div className="flex gap-2">
        {STEPS.map((label, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              if (i < step) setStep(i)
            }}
            className={`flex-1 rounded-full py-2 text-xs font-semibold transition ${
              i === step
                ? 'bg-accent text-white'
                : i < step
                  ? 'bg-accent/20 text-accent'
                  : 'bg-surface-strong text-foreground/40'
            }`}
          >
            {i + 1}. {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="border-line bg-surface rounded-4xl border p-6 sm:p-8">
        {step === 0 && <Step1 draft={draft} onChange={update} />}
        {step === 1 && <Step2 draft={draft} onChange={update} />}
        {step === 2 && <Step3 draft={draft} athletes={athletes} onChange={update} />}

        {/* Guardar como plantilla (solo en paso 2 y 3) */}
        {step >= 1 && (
          <div className="border-line bg-surface-strong mt-6 rounded-3xl border p-4">
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={saveAsTemplate}
                onChange={(e) => setSaveAsTemplate(e.target.checked)}
                className="border-line accent-accent h-4 w-4 rounded"
              />
              <span className="text-foreground/75 text-sm font-medium">
                Guardar también como plantilla
              </span>
            </label>
            {saveAsTemplate && (
              <input
                className="border-line bg-surface focus:ring-accent mt-3 w-full rounded-xl border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
                placeholder="Nombre de la plantilla (ej. PPL Fuerza-Resistencia)"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />
            )}
          </div>
        )}
      </div>

      {/* Nav */}
      <div className="flex justify-between gap-4">
        <button
          type="button"
          disabled={step === 0}
          onClick={() => setStep(step - 1)}
          className="border-line bg-surface-strong hover:border-accent/30 rounded-2xl border px-6 py-3 text-sm font-medium transition disabled:opacity-40"
        >
          Atrás
        </button>
        {step < 2 ? (
          <button
            type="button"
            disabled={!canAdvance()}
            onClick={() => (step === 1 ? goToStep3() : setStep(step + 1))}
            className="bg-accent hover:bg-accent-strong rounded-2xl px-6 py-3 text-sm font-semibold text-white transition disabled:opacity-40"
          >
            Siguiente
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                const json = JSON.stringify(draft, null, 2)
                const blob = new Blob([json], { type: 'application/json' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `${draft.title || 'plan'}.json`
                a.click()
                URL.revokeObjectURL(url)
              }}
              className="border-line bg-surface-strong hover:border-accent/30 rounded-2xl border px-4 py-3 text-sm font-medium transition"
            >
              Exportar
            </button>
            <label className="border-line bg-surface-strong hover:border-accent/30 cursor-pointer rounded-2xl border px-4 py-3 text-sm font-medium transition">
              Importar
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  const reader = new FileReader()
                  reader.onload = (ev) => {
                    try {
                      const imported = JSON.parse(ev.target?.result as string) as PlanDraft
                      setDraft(imported)
                      setStep(0)
                      pushToast({ title: 'Plantilla importada', variant: 'success' })
                    } catch {
                      pushToast({ title: 'Error al leer el archivo', variant: 'error' })
                    }
                  }
                  reader.readAsText(file)
                }}
              />
            </label>
            <button
              type="button"
              disabled={!canAdvance() || saving}
              onClick={handleSave}
              className="bg-accent hover:bg-accent-strong rounded-2xl px-6 py-3 text-sm font-semibold text-white transition disabled:opacity-40"
            >
              {saving ? 'Guardando...' : 'Crear mesociclo'}
            </button>
          </div>
        )}
      </div>
    </PageShell>
  )
}
