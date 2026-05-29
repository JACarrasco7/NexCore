'use client'

import { useState } from 'react'
import { ChevronDown, GripVertical, Trash2, Plus } from 'lucide-react'
import { ExerciseCard } from './exercise-card'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import type { LocalExercise, LocalSession } from './types'

type SessionCardProps = {
  session: LocalSession
  onUpdate: (patch: Partial<LocalSession>) => void
  onRemove: () => void
  onAddExercise: () => void
  onUpdateExercise: (ei: number, patch: Partial<LocalExercise>) => void
  onRemoveExercise: (ei: number) => void
  isDragging?: boolean
  dragHandleProps?: any
}

export function SessionCard({
  session,
  onUpdate,
  onRemove,
  onAddExercise,
  onUpdateExercise,
  onRemoveExercise,
  isDragging,
  dragHandleProps,
}: SessionCardProps) {
  const [expanded, setExpanded] = useState(true)
  const totalSets = session.exercises.reduce((sum, e) => sum + (e.sets || 0), 0)

  return (
    <div
      className={`border-line rounded-3xl border transition-all duration-200 ${isDragging ? 'bg-accent/10 ring-accent shadow-md ring-2' : 'bg-surface-strong hover:bg-surface hover:shadow-sm'}`}
    >
      {/* Header with gradient background */}
      <div className="from-accent/10 flex items-center justify-between gap-3 bg-gradient-to-r to-transparent px-5 py-4">
        {/* Grip handle */}
        <div
          {...dragHandleProps}
          className="text-foreground/30 hover:text-foreground/50 flex-shrink-0 cursor-grab transition-colors active:cursor-grabbing"
        >
          <GripVertical size={18} />
        </div>

        {/* Title input - flex-1 */}
        <div className="min-w-0 flex-1">
          <input
            className="border-line bg-surface focus:ring-accent w-full rounded-xl border px-3 py-2 text-sm font-semibold focus:ring-1 focus:outline-none"
            value={session.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder="Nombre de la sesión"
          />
        </div>

        {/* Stats badge */}
        <div
          className="bg-accent/10 text-accent border-accent/20 rounded-full border px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap shadow-sm"
          title={`${session.exercises.length} ejercicios, ${totalSets} series totales`}
        >
          {session.exercises.length} ej • {totalSets} sets
        </div>

        {/* Toggle expand */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-foreground/60 hover:text-accent rounded-lg p-1.5 transition"
          title={expanded ? 'Colapsar' : 'Expandir'}
        >
          <ChevronDown
            size={18}
            className={`transition-transform ${expanded ? 'rotate-0' : '-rotate-90'}`}
          />
        </button>

        {/* Delete button */}
        <button
          type="button"
          onClick={onRemove}
          className="border-danger/30 bg-danger/5 text-danger hover:bg-danger/10 rounded-lg border p-1.5 transition"
          title="Eliminar sesión"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* Body - ejercicios */}
      <div
        className={`border-line overflow-hidden border-t transition-all duration-300 ease-in-out ${expanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <div className="p-5 pt-4">
          {session.exercises.length === 0 ? (
            <div className="text-foreground/40 bg-surface mb-4 rounded-2xl px-4 py-3 text-center text-sm">
              <p>Sin ejercicios aún</p>
              <p className="text-xs">Pulsa "+ Ejercicio" para comenzar</p>
            </div>
          ) : (
            <DragDropContext
              onDragEnd={(result) => {
                if (!result.destination) return
                const exercises = Array.from(session.exercises)
                const [reordered] = exercises.splice(result.source.index, 1)
                exercises.splice(result.destination.index, 0, reordered)
                onUpdate({ exercises })
              }}
            >
              <Droppable droppableId="exercises" type="EXERCISE">
                {(provided) => (
                  <div
                    className="mb-4 space-y-3"
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                  >
                    {session.exercises.map((ex, ei) => (
                      <Draggable key={ei} draggableId={`exercise-${ei}`} index={ei}>
                        {(provided, snapshot) => (
                          <div ref={provided.innerRef} {...provided.draggableProps}>
                            <ExerciseCard
                              ex={ex}
                              onChange={(patch) => onUpdateExercise(ei, patch)}
                              onRemove={() => onRemoveExercise(ei)}
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
            </DragDropContext>
          )}
          <button
            type="button"
            onClick={onAddExercise}
            className="border-accent/30 bg-accent/5 text-accent hover:bg-accent/15 flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-medium transition"
          >
            <Plus size={16} />
            Agregar ejercicio
          </button>
        </div>
      </div>
    </div>
  )
}
