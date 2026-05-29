'use client'

import { useState, useMemo } from 'react'
import { ChevronDown, GripVertical, Trash2, Plus } from 'lucide-react'
import { NutritionMealCard } from './nutrition-meal-card'
import { MacroCounter } from './macro-counter'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'

export type NutritionFood = {
  food: string
  quantity: number
  unit?: string
  kcal?: number
  proteinG?: number
  carbsG?: number
  fatG?: number
}

export type NutritionMeal = {
  id?: string
  name: string
  time?: string
  foods: NutritionFood[]
}

export type NutritionDay = {
  id?: string
  name: string
  dayType?: 'standard' | 'high_carb' | 'low_carb' | 'refeed'
  meals: NutritionMeal[]
}

type NutritionDayCardProps = {
  day: NutritionDay
  targetKcal?: number
  targetProtein?: number
  targetCarbs?: number
  targetFat?: number
  onUpdate: (patch: Partial<NutritionDay>) => void
  onRemove: () => void
  onAddMeal: () => void
  onUpdateMeal: (mi: number, patch: Partial<NutritionMeal>) => void
  onRemoveMeal: (mi: number) => void
  isDragging?: boolean
  dragHandleProps?: any
}

export function NutritionDayCard({
  day,
  targetKcal,
  targetProtein,
  targetCarbs,
  targetFat,
  onUpdate,
  onRemove,
  onAddMeal,
  onUpdateMeal,
  onRemoveMeal,
  isDragging,
  dragHandleProps,
}: NutritionDayCardProps) {
  const [expanded, setExpanded] = useState(true)

  const macros = useMemo(() => {
    const total = day.meals.reduce(
      (acc, m) => {
        m.foods.forEach((f) => {
          acc.kcal += f.kcal ?? 0
          acc.protein += f.proteinG ?? 0
          acc.carbs += f.carbsG ?? 0
          acc.fat += f.fatG ?? 0
        })
        return acc
      },
      { kcal: 0, protein: 0, carbs: 0, fat: 0 }
    )
    return total
  }, [day.meals])

  return (
    <div
      className={`border-line rounded-3xl border transition-all duration-200 ${isDragging ? 'bg-accent/10 ring-accent shadow-md ring-2' : 'bg-surface-strong hover:bg-surface hover:shadow-sm'}`}
    >
      {/* Header with gradient */}
      <div className="from-accent/10 flex items-center justify-between gap-3 bg-gradient-to-r to-transparent px-5 py-4">
        {/* Grip handle */}
        <div
          {...dragHandleProps}
          className="text-foreground/30 hover:text-foreground/50 flex-shrink-0 cursor-grab transition-colors active:cursor-grabbing"
        >
          <GripVertical size={18} />
        </div>

        {/* Title input */}
        <div className="min-w-0 flex-1">
          <input
            className="border-line bg-surface focus:ring-accent w-full rounded-xl border px-3 py-2 text-sm font-semibold focus:ring-1 focus:outline-none"
            value={day.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder="Nombre del día"
          />
        </div>

        {/* Stats badge */}
        <div
          className="bg-accent/10 text-accent border-accent/20 rounded-full border px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap shadow-sm"
          title={`${day.meals.length} comidas, ${Math.round(macros.kcal)} kcal totales`}
        >
          {day.meals.length} com · {Math.round(macros.kcal)} kcal
        </div>

        {/* Day type badge */}
        <select
          className="border-line bg-surface-strong focus:ring-accent rounded-xl border px-2 py-1 text-xs focus:ring-1 focus:outline-none"
          value={day.dayType ?? 'standard'}
          onChange={(e) => onUpdate({ dayType: e.target.value as any })}
          title="Tipo de día"
        >
          <option value="standard">Normal</option>
          <option value="high_carb">🔴 High Carb</option>
          <option value="low_carb">🔵 Low Carb</option>
          <option value="refeed">🟢 Refeed</option>
        </select>

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
          title="Eliminar día"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* Macro summary bar */}
      <div
        className={`border-line overflow-hidden border-t transition-all duration-300 ease-in-out ${expanded ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <div className="bg-surface/50 px-5 py-3">
          <MacroCounter
            current={macros}
            target={{
              kcal: targetKcal,
              protein: targetProtein,
              carbs: targetCarbs,
              fat: targetFat,
            }}
          />
        </div>
      </div>

      {/* Body - comidas */}
      <div
        className={`border-line overflow-hidden border-t transition-all duration-300 ease-in-out ${expanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <div className="p-5">
          {day.meals.length === 0 ? (
            <div className="text-foreground/40 bg-surface mb-4 rounded-2xl px-4 py-3 text-center text-sm">
              <p>Sin comidas aún</p>
              <p className="text-xs">Pulsa "+ Comida" para comenzar</p>
            </div>
          ) : (
            <DragDropContext
              onDragEnd={(result) => {
                if (!result.destination) return
                const meals = Array.from(day.meals)
                const [reordered] = meals.splice(result.source.index, 1)
                meals.splice(result.destination.index, 0, reordered)
                onUpdate({ meals })
              }}
            >
              <Droppable droppableId="meals" type="MEAL">
                {(provided) => (
                  <div
                    className="mb-4 space-y-3"
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                  >
                    {day.meals.map((m, mi) => (
                      <Draggable key={mi} draggableId={`meal-${mi}`} index={mi}>
                        {(provided, snapshot) => (
                          <div ref={provided.innerRef} {...provided.draggableProps}>
                            <NutritionMealCard
                              meal={m}
                              onUpdate={(patch) => onUpdateMeal(mi, patch)}
                              onRemove={() => onRemoveMeal(mi)}
                              isDragging={snapshot.isDragging}
                              dragHandleProps={provided.dragHandleProps}
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
            onClick={onAddMeal}
            className="border-accent/30 bg-accent/5 text-accent hover:bg-accent/15 flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-medium transition"
          >
            <Plus size={16} />
            Agregar comida
          </button>
        </div>
      </div>
    </div>
  )
}
