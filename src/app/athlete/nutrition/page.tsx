'use client'
export const dynamic = 'force-dynamic'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useNutritionPlans } from '@/lib/store'
import { SectionIntro } from '@/components/section-intro'
import { Skeleton } from '@/components/ui/skeleton'
import type { Meal, NutritionPlan } from '@/lib/domain'

function FoodSearch({
  onSelect,
}: {
  onSelect: (food: {
    food: string
    kcal?: number
    proteinG?: number
    carbsG?: number
    fatG?: number
  }) => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const search = async (q: string) => {
    if (!q.trim()) return
    setLoading(true)
    try {
      const res = await fetch(`/api/food-catalog?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setResults(data.results || [])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative">
      <input
        type="text"
        placeholder="Buscar alimento..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && search(query)}
        className="border-line bg-surface focus:border-accent w-full rounded-xl border px-3 py-2 text-sm outline-none"
      />
      {loading && <div className="absolute top-2.5 right-3 text-xs">🔍</div>}
      {results.length > 0 && (
        <div className="border-line bg-surface absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border shadow-lg">
          {results.map((r, i) => (
            <button
              key={i}
              onClick={() => {
                onSelect({
                  food: r.food,
                  kcal: r.kcal,
                  proteinG: r.proteinG,
                  carbsG: r.carbsG,
                  fatG: r.fatG,
                })
                setResults([])
                setQuery('')
              }}
              className="hover:bg-accent-soft w-full px-3 py-2 text-left text-sm"
            >
              {r.food} {r.kcal && `· ${r.kcal} kcal`}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function MacroBar({
  label,
  value,
  max,
  color,
}: {
  label: string
  value: number
  max: number
  color: string
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div>
      <div className="text-foreground/60 mb-1 flex justify-between text-xs">
        <span>{label}</span>
        <span>{value}g</span>
      </div>
      <div className="bg-surface h-2 w-full rounded-full">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function MealCard({
  meal,
  onQuickAdd,
}: {
  meal: Meal
  onQuickAdd?: (
    mealId: string,
    food: string,
    macros?: { kcal?: number; proteinG?: number; carbsG?: number; fatG?: number }
  ) => void
}) {
  const [open, setOpen] = useState(false)

  const mealKcal = meal.foods.reduce((s, f) => s + (f.kcal ?? 0), 0)
  const mealProt = meal.foods.reduce((s, f) => s + (f.proteinG ?? 0), 0)
  const mealCarbs = meal.foods.reduce((s, f) => s + (f.carbsG ?? 0), 0)
  const mealFat = meal.foods.reduce((s, f) => s + (f.fatG ?? 0), 0)

  return (
    <div className="border-line bg-surface overflow-hidden rounded-3xl border">
      <button
        onClick={() => setOpen((v) => !v)}
        className="hover:bg-accent-soft flex w-full items-center justify-between px-5 py-4 text-left transition"
      >
        <div className="flex items-center gap-3">
          <span className="text-foreground text-sm font-semibold">{meal.name}</span>
          {meal.time && <span className="text-foreground/40 text-xs">{meal.time}</span>}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-foreground/50 text-xs">{mealKcal} kcal</span>
          <span className="text-accent/60 text-xs">
            P {Math.round(mealProt)}g · C {Math.round(mealCarbs)}g · G {Math.round(mealFat)}g
          </span>
          <span className="text-foreground/40">{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {open && (
        <div className="border-line border-t">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-foreground/40">
                <th className="px-4 py-2 text-left font-normal">Alimento</th>
                <th className="px-3 py-2 text-right font-normal">Cantidad</th>
                <th className="px-3 py-2 text-right font-normal">kcal</th>
                <th className="px-3 py-2 text-right font-normal">P</th>
                <th className="px-3 py-2 text-right font-normal">C</th>
                <th className="px-3 py-2 text-right font-normal">G</th>
              </tr>
            </thead>
            <tbody>
              {meal.foods.map((f) => (
                <tr key={f.id} className="border-line/40 border-t">
                  <td className="text-foreground px-4 py-2">{f.food}</td>
                  <td className="text-foreground/60 px-3 py-2 text-right">
                    {f.quantity} {f.unit}
                  </td>
                  <td className="text-foreground/60 px-3 py-2 text-right">{f.kcal ?? '—'}</td>
                  <td className="text-success px-3 py-2 text-right">
                    {f.proteinG != null ? `${f.proteinG}g` : '—'}
                  </td>
                  <td className="px-3 py-2 text-right text-(--macro-carbs)">
                    {f.carbsG != null ? `${f.carbsG}g` : '—'}
                  </td>
                  <td className="text-warning px-3 py-2 text-right">
                    {f.fatG != null ? `${f.fatG}g` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {onQuickAdd && (
            <div className="border-line/40 space-y-2 border-t p-3">
              <FoodSearch
                onSelect={(food) =>
                  onQuickAdd(meal.id, food.food, {
                    kcal: food.kcal,
                    proteinG: food.proteinG,
                    carbsG: food.carbsG,
                    fatG: food.fatG,
                  })
                }
              />
              <input
                type="text"
                placeholder="Añadir alimento rápido..."
                className="border-line bg-surface-strong focus:border-accent w-full rounded-xl border px-3 py-2 text-xs transition outline-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    onQuickAdd(meal.id, e.currentTarget.value.trim())
                    e.currentTarget.value = ''
                  }
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function PlanSelector({
  plans,
  selected,
  onSelect,
}: {
  plans: NutritionPlan[]
  selected: NutritionPlan
  onSelect: (p: NutritionPlan) => void
}) {
  if (plans.length <= 1) return null
  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {plans.map((p) => (
        <button
          key={p.id}
          onClick={() => onSelect(p)}
          className={`rounded-full border px-4 py-1.5 text-sm transition ${
            p.id === selected.id
              ? 'border-accent/30 bg-accent/10 text-accent'
              : 'border-line text-foreground/60 hover:border-line/60 hover:text-foreground'
          }`}
        >
          {p.title}
        </button>
      ))}
    </div>
  )
}

function NutritionContent() {
  const searchParams = useSearchParams()
  const athleteIdParam = searchParams.get('athleteId') ?? undefined

  const { plans, activePlan, loading, addFoodToMeal } = useNutritionPlans(athleteIdParam)
  const [selectedPlan, setSelectedPlan] = useState<NutritionPlan | null>(null)

  const plan = selectedPlan ?? activePlan

  // Quick add food handler - connects to API
  const handleQuickAdd = async (
    mealId: string,
    food: string,
    macros?: { kcal?: number; proteinG?: number; carbsG?: number; fatG?: number }
  ) => {
    if (!plan) return
    try {
      await addFoodToMeal(plan.id, mealId, { food, quantity: 100, unit: 'g', ...macros })
    } catch (err) {
      console.error('Error adding food:', err)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="flex h-60 flex-col items-center justify-center gap-3 text-center">
        <div className="text-4xl">🥗</div>
        <p className="text-foreground/60">No tienes ningún plan nutricional asignado aún.</p>
        <p className="text-foreground/40 text-sm">Tu coach lo creará en breve.</p>
      </div>
    )
  }

  const totalKcal = plan.meals.reduce(
    (s, m) => s + m.foods.reduce((fs, f) => fs + (f.kcal ?? 0), 0),
    0
  )
  const totalProt = plan.meals.reduce(
    (s, m) => s + m.foods.reduce((fs, f) => fs + (f.proteinG ?? 0), 0),
    0
  )
  const totalCarbs = plan.meals.reduce(
    (s, m) => s + m.foods.reduce((fs, f) => fs + (f.carbsG ?? 0), 0),
    0
  )
  const totalFat = plan.meals.reduce(
    (s, m) => s + m.foods.reduce((fs, f) => fs + (f.fatG ?? 0), 0),
    0
  )

  return (
    <div className="space-y-6">
      <PlanSelector plans={plans} selected={plan} onSelect={setSelectedPlan} />

      {/* Header plan */}
      <div className="border-line bg-surface rounded-4xl border p-6">
        <div className="mb-1 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-foreground text-lg font-semibold">{plan.title}</h2>
            <span className="text-foreground/50 text-sm">{plan.phase}</span>
          </div>
          <div className="text-right">
            <div className="text-accent text-2xl font-bold">{plan.kcalTarget}</div>
            <div className="text-foreground/40 text-xs">kcal objetivo</div>
          </div>
        </div>

        {plan.notes && (
          <p className="bg-background/50 text-foreground/70 mt-3 rounded-lg px-4 py-3 text-sm">
            {plan.notes}
          </p>
        )}

        {/* Macros */}
        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          <div className="bg-success/10 rounded-xl p-3">
            <div className="text-success text-xl font-bold">{plan.proteinG}g</div>
            <div className="text-foreground/50 text-xs">Proteína</div>
          </div>
          <div className="rounded-xl bg-(--macro-carbs)/10 p-3">
            <div className="text-xl font-bold text-(--macro-carbs)">{plan.carbsG}g</div>
            <div className="text-foreground/50 text-xs">Carbos</div>
          </div>
          <div className="bg-warning/10 rounded-xl p-3">
            <div className="text-warning text-xl font-bold">{plan.fatG}g</div>
            <div className="text-foreground/50 text-xs">Grasas</div>
          </div>
        </div>

        {/* Barras de macros reales vs objetivo */}
        <div className="mt-4 space-y-2">
          <MacroBar
            label="Proteína real"
            value={Math.round(totalProt)}
            max={plan.proteinG}
            color="bg-success"
          />
          <MacroBar
            label="Carbos reales"
            value={Math.round(totalCarbs)}
            max={plan.carbsG}
            color="bg-(--macro-carbs)"
          />
          <MacroBar
            label="Grasas reales"
            value={Math.round(totalFat)}
            max={plan.fatG}
            color="bg-warning"
          />
        </div>

        <p className="text-foreground/40 mt-3 text-right text-xs">
          Total calculado: {Math.round(totalKcal)} kcal · P {Math.round(totalProt)}g · C{' '}
          {Math.round(totalCarbs)}g · G {Math.round(totalFat)}g
        </p>
      </div>

      {/* Comidas */}
      <div className="space-y-3">
        <h3 className="text-foreground/40 text-sm font-semibold tracking-wider uppercase">
          {plan.meals.length} comidas
        </h3>
        {plan.meals.map((meal) => (
          <MealCard key={meal.id} meal={meal} onQuickAdd={handleQuickAdd} />
        ))}
      </div>
    </div>
  )
}

export default function NutritionPage() {
  return (
    <main className="mx-auto flex w-full max-w-370 flex-1 flex-col gap-8 px-6 py-8 md:px-10 lg:px-12">
      <SectionIntro
        eyebrow="Nutricion"
        title="Plan nutricional"
        description="Dieta personalizada creada por tu coach."
      />
      <Suspense
        fallback={
          <div className="space-y-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        }
      >
        <NutritionContent />
      </Suspense>
    </main>
  )
}
