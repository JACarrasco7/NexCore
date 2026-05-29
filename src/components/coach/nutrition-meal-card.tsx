'use client'

import { useState, useMemo } from 'react'
import { ChevronDown, Trash2, Clock, GripVertical } from 'lucide-react'
import { FoodSearch } from '../food-search'
import type { NutritionFood, NutritionMeal } from './nutrition-day-card'

type NutritionMealCardProps = {
  meal: NutritionMeal
  onUpdate: (patch: Partial<NutritionMeal>) => void
  onRemove: () => void
  isDragging?: boolean
  dragHandleProps?: any
}

export function NutritionMealCard({
  meal,
  onUpdate,
  onRemove,
  isDragging,
  dragHandleProps,
}: NutritionMealCardProps) {
  const [expanded, setExpanded] = useState(meal.foods.length === 0)

  const macros = useMemo(() => {
    return meal.foods.reduce(
      (acc, f) => ({
        kcal: acc.kcal + (f.kcal ?? 0),
        protein: acc.protein + (f.proteinG ?? 0),
        carbs: acc.carbs + (f.carbsG ?? 0),
        fat: acc.fat + (f.fatG ?? 0),
      }),
      { kcal: 0, protein: 0, carbs: 0, fat: 0 }
    )
  }, [meal.foods])

  return (
    <div className="border-line bg-surface hover:bg-surface/80 rounded-2xl border transition-all duration-200 hover:shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 p-3.5">
        <div
          {...dragHandleProps}
          className="text-foreground/30 hover:text-foreground/50 flex-shrink-0 cursor-grab transition-colors active:cursor-grabbing"
        >
          <GripVertical size={14} />
        </div>
        <div className="min-w-0 flex-1">
          <input
            className="border-line bg-surface-strong focus:ring-accent/50 w-full rounded-lg border px-3 py-2 text-sm font-medium focus:ring-1 focus:outline-none"
            value={meal.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder="Nombre de la comida"
          />
        </div>

        {/* Tiempo (opcional) */}
        {meal.time && (
          <div className="text-foreground/40 flex items-center gap-1 text-xs">
            <Clock size={14} />
            {meal.time}
          </div>
        )}

        {/* Macros badge */}
        <div className="bg-accent/10 text-accent border-accent/20 rounded-full border px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap shadow-sm">
          {Math.round(macros.kcal)} kcal
        </div>

        {/* Toggle expand */}
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

        {/* Delete button */}
        <button
          type="button"
          onClick={onRemove}
          className="border-danger/30 bg-danger/5 text-danger hover:bg-danger/10 rounded-lg border p-1 transition"
          title="Eliminar comida"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Body - alimentos */}
      <div
        className={`border-line overflow-hidden border-t transition-all duration-300 ease-in-out ${expanded ? 'max-h-[1200px] opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <div className="bg-surface/50 p-4 pt-3">
          {meal.foods.length === 0 ? (
            <div className="text-foreground/40 bg-surface mb-4 rounded-2xl px-4 py-3 text-center text-sm">
              <p>Sin alimentos aún</p>
            </div>
          ) : (
            <div className="mb-4 space-y-2">
              {meal.foods.map((f, fi) => (
                <div
                  key={fi}
                  className="border-line bg-surface flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground truncate font-medium">{f.food}</p>
                    <p className="text-foreground/50 text-xs">
                      {f.quantity} {f.unit || 'g'} • {Math.round(f.kcal ?? 0)} kcal
                    </p>
                  </div>
                  <div className="text-foreground/60 ml-3 text-right text-xs whitespace-nowrap">
                    <div>P:{Math.round(f.proteinG ?? 0)}g</div>
                    <div>C:{Math.round(f.carbsG ?? 0)}g</div>
                    <div>G:{Math.round(f.fatG ?? 0)}g</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <FoodSearch
            onSelect={(food) => {
              const foods = [...meal.foods, { food: food.name, quantity: 100, unit: 'g', ...food }]
              onUpdate({ foods })
            }}
          />
        </div>
      </div>
    </div>
  )
}
