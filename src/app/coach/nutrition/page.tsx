'use client'
export const dynamic = 'force-dynamic'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { FoodSearch } from '@/components/food-search'
import { useNutritionPlans, apiFetch, apiPost } from '@/lib/store'
import { parseNutritionCsv } from '@/lib/food-csv'
import { SplitLayout, PageShell, PageHeader } from '@/components/layout'
import type { Meal, MealFood, NutritionPlan } from '@/lib/domain'

// ── Types for the form ────────────────────────────────────────────────────────

type FoodDraft = Omit<MealFood, 'id'> & { _key: string }
type MealDraft = { _key: string; name: string; time: string; order: number; foods: FoodDraft[] }

type MealTemplate = {
  id?: string // presente si está guardado en BD
  name: string
  meals: Array<{
    name: string
    time: string
    foods: Array<{
      food: string
      quantity: number
      unit: string
      kcal?: number
      proteinG?: number
      carbsG?: number
      fatG?: number
    }>
  }>
}

function newFood(order: number): FoodDraft {
  return {
    _key: crypto.randomUUID(),
    food: '',
    quantity: 100,
    unit: 'g',
    kcal: undefined,
    proteinG: undefined,
    carbsG: undefined,
    fatG: undefined,
    order,
  }
}
function newMeal(order: number): MealDraft {
  return { _key: crypto.randomUUID(), name: '', time: '', order, foods: [newFood(0)] }
}

// ── Read-only plan view ───────────────────────────────────────────────────────

function PlanReadView({
  plan,
  onEdit,
  onDelete,
}: {
  plan: NutritionPlan
  onEdit: () => void
  onDelete: () => void
}) {
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null)

  return (
    <div className="border-line bg-surface space-y-4 rounded-2xl border p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-foreground font-semibold">{plan.title}</h3>
          <span className="text-foreground/50 text-xs">{plan.phase}</span>
          {plan.isActive && (
            <span className="bg-accent/15 text-accent ml-2 rounded-full px-2 py-0.5 text-xs">
              Activo
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="border-line text-foreground/70 hover:text-foreground rounded-lg border px-3 py-1.5 text-xs transition"
          >
            Editar
          </button>
          <button
            onClick={onDelete}
            className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs text-red-400 transition hover:bg-red-500/10"
          >
            Borrar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-center text-sm sm:grid-cols-4">
        <div className="bg-background/50 rounded-lg p-2">
          <div className="text-accent font-bold">{plan.kcalTarget}</div>
          <div className="text-foreground/40 text-xs">kcal</div>
        </div>
        <div className="rounded-lg bg-(--macro-protein)/10 p-2">
          <div className="font-bold text-(--macro-protein)">{plan.proteinG}g</div>
          <div className="text-foreground/40 text-xs">Prot.</div>
        </div>
        <div className="rounded-lg bg-(--macro-carbs)/10 p-2">
          <div className="font-bold text-(--macro-carbs)">{plan.carbsG}g</div>
          <div className="text-foreground/40 text-xs">Carbs</div>
        </div>
        <div className="rounded-lg bg-(--macro-fat)/10 p-2">
          <div className="font-bold text-(--macro-fat)">{plan.fatG}g</div>
          <div className="text-foreground/40 text-xs">Grasas</div>
        </div>
      </div>

      <div className="space-y-1">
        {plan.meals.map((meal) => (
          <div key={meal.id} className="border-line/50 rounded-lg border">
            <button
              onClick={() => setExpandedMeal(expandedMeal === meal.id ? null : meal.id)}
              className="flex w-full items-center justify-between px-3 py-2 text-left"
            >
              <span className="text-foreground text-sm font-medium">{meal.name}</span>
              <div className="text-foreground/40 flex items-center gap-2 text-xs">
                <span>{meal.time}</span>
                <span>{meal.foods.reduce((s, f) => s + (f.kcal ?? 0), 0)} kcal</span>
                <span>{expandedMeal === meal.id ? '▲' : '▼'}</span>
              </div>
            </button>
            {expandedMeal === meal.id && (
              <div className="border-line/40 border-t px-3 pb-2">
                {meal.foods.map((f) => (
                  <div
                    key={f.id}
                    className="text-foreground/70 flex items-center gap-2 py-1 text-xs"
                  >
                    <span className="flex-1">{f.food}</span>
                    <span>
                      {f.quantity} {f.unit}
                    </span>
                    <span className="text-(--macro-protein)">
                      {f.proteinG != null ? `P${f.proteinG}g` : ''}
                    </span>
                    <span className="text-(--macro-carbs)">
                      {f.carbsG != null ? `C${f.carbsG}g` : ''}
                    </span>
                    <span className="text-(--macro-fat)">
                      {f.fatG != null ? `G${f.fatG}g` : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Plan form (create / edit) ─────────────────────────────────────────────────

type FoodResolveResponse = {
  source: string
  item: {
    name: string
    unit: string
  } | null
  macros?: {
    kcal: number
    proteinG: number
    carbsG: number
    fatG: number
  }
}

type FoodSearchResponse = {
  source: string
  results: Array<{
    name: string
    unit: string
  }>
}

type FoodEquivalenceResponse = {
  source: string
  base: {
    name: string
    quantity: number
    unit: string
    kcal: number
  } | null
  items: Array<{
    name: string
    quantity: number
    unit: string
    kcal: number
  }>
}

function PlanForm({
  athleteId,
  initial,
  onSaved,
  onCancel,
}: {
  athleteId: string
  initial?: NutritionPlan
  onSaved: () => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [phase, setPhase] = useState(initial?.phase ?? 'Activo')
  const [kcal, setKcal] = useState(initial?.kcalTarget ?? 2000)
  const [prot, setProt] = useState(initial?.proteinG ?? 150)
  const [carbs, setCarbs] = useState(initial?.carbsG ?? 200)
  const [fat, setFat] = useState(initial?.fatG ?? 65)
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [meals, setMeals] = useState<MealDraft[]>(
    () =>
      initial?.meals.map((m) => ({
        _key: m.id,
        name: m.name,
        time: m.time,
        order: m.order,
        foods: m.foods.map((f) => ({
          _key: f.id,
          food: f.food,
          quantity: f.quantity,
          unit: f.unit,
          kcal: f.kcal ?? undefined,
          proteinG: f.proteinG ?? undefined,
          carbsG: f.carbsG ?? undefined,
          fatG: f.fatG ?? undefined,
          order: f.order,
        })),
      })) ?? [newMeal(0)]
  )
  const [saving, setSaving] = useState(false)
  const [resolvingKey, setResolvingKey] = useState<string | null>(null)
  const [equivByFoodKey, setEquivByFoodKey] = useState<Record<string, string[]>>({})
  const [csvText, setCsvText] = useState('')
  const [csvInfo, setCsvInfo] = useState<string | null>(null)
  const [calcWeight, setCalcWeight] = useState<number>(75)
  const [calcMode, setCalcMode] = useState<'cut' | 'maintain' | 'bulk'>('maintain')
  const [templateName, setTemplateName] = useState('')
  const [templates, setTemplates] = useState<MealTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [templatesSaving, setTemplatesSaving] = useState(false)
  const [foodHints, setFoodHints] = useState<Record<string, string[]>>({})
  const [catalogSource, setCatalogSource] = useState<string>('NEXUM-MFP')
  const [foodProvider, setFoodProvider] = useState<'auto' | 'mfp' | 'local'>('auto')

  useEffect(() => {
    apiFetch('/api/nutrition-templates')
      .then((rows: any) => {
        const arr = Array.isArray(rows) ? rows : rows?.items ?? rows ?? []
        const parsed: MealTemplate[] = (arr as Array<{ id: string; name: string; meals: unknown }>).map((r) => ({
          id: r.id,
          name: r.name,
          meals: r.meals as MealTemplate['meals'],
        }))
        setTemplates(parsed)
      })
      .catch(() => setTemplates([]))
  }, [])

  async function resolveFromCatalog(mealKey: string, food: FoodDraft) {
    const quantity = Number(food.quantity || 100)
    const q = encodeURIComponent(food.food)
    setResolvingKey(food._key)
    try {
      const data = await apiFetch<FoodResolveResponse>(
        `/api/food-catalog?action=resolve&provider=${foodProvider}&food=${q}&quantity=${quantity}`
      )
      setCatalogSource(data.source ?? 'NEXUM-MFP')
      if (!data.item || !data.macros) return

      updateFood(mealKey, food._key, {
        food: data.item.name,
        unit: data.item.unit,
        kcal: data.macros.kcal,
        proteinG: data.macros.proteinG,
        carbsG: data.macros.carbsG,
        fatG: data.macros.fatG,
      })
    } finally {
      setResolvingKey(null)
    }
  }

  async function loadEquivalences(food: FoodDraft) {
    const quantity = Number(food.quantity || 100)
    const q = encodeURIComponent(food.food)
    try {
      const data = await apiFetch<FoodEquivalenceResponse>(
        `/api/food-catalog?action=equivalences&provider=${foodProvider}&food=${q}&quantity=${quantity}`
      )
      setCatalogSource(data.source ?? 'NEXUM-MFP')
      if (!data.items?.length) {
        setEquivByFoodKey((prev) => ({ ...prev, [food._key]: [] }))
        return
      }
      const lines = data.items.map(
        (item) => `${item.quantity}${item.unit} ${item.name} (~${item.kcal} kcal)`
      )
      setEquivByFoodKey((prev) => ({ ...prev, [food._key]: lines }))
    } catch {}
  }

  async function suggestFoods(food: FoodDraft) {
    const q = food.food.trim()
    if (q.length < 2) {
      setFoodHints((prev) => ({ ...prev, [food._key]: [] }))
      return
    }

    try {
      const data = await apiFetch<FoodSearchResponse>(
        `/api/food-catalog?action=search&provider=${foodProvider}&q=${encodeURIComponent(q)}`
      )
      setCatalogSource(data.source ?? 'NEXUM-MFP')
      setFoodHints((prev) => ({
        ...prev,
        [food._key]: data.results.map((r) => r.name).slice(0, 5),
      }))
    } catch {}
  }

  function importCsvRows() {
    const rows = parseNutritionCsv(csvText)
    if (!rows.length) {
      setCsvInfo(
        'CSV sin filas válidas. Revisa cabeceras: meal, time, food, quantity, unit, kcal, protein, carbs, fat.'
      )
      return
    }

    const byMeal = new Map<string, typeof rows>()
    rows.forEach((row) => {
      const key = `${row.mealName}__${row.mealTime}`
      const bucket = byMeal.get(key) ?? []
      bucket.push(row)
      byMeal.set(key, bucket)
    })

    setMeals((prev) => {
      const next = [...prev]
      byMeal.forEach((foods, key) => {
        const [mealName, mealTime] = key.split('__')
        const existing = next.find(
          (m) =>
            m.name.toLowerCase() === mealName.toLowerCase() && (m.time || '') === (mealTime || '')
        )

        if (existing) {
          const startOrder = existing.foods.length
          const importedFoods = foods.map((f, idx) => ({
            _key: crypto.randomUUID(),
            food: f.food,
            quantity: f.quantity,
            unit: f.unit,
            kcal: f.kcal,
            proteinG: f.proteinG,
            carbsG: f.carbsG,
            fatG: f.fatG,
            order: startOrder + idx,
          }))
          existing.foods = [...existing.foods, ...importedFoods]
          return
        }

        const order = next.length
        next.push({
          _key: crypto.randomUUID(),
          name: mealName || `Comida ${order + 1}`,
          time: mealTime || '',
          order,
          foods: foods.map((f, idx) => ({
            _key: crypto.randomUUID(),
            food: f.food,
            quantity: f.quantity,
            unit: f.unit,
            kcal: f.kcal,
            proteinG: f.proteinG,
            carbsG: f.carbsG,
            fatG: f.fatG,
            order: idx,
          })),
        })
      })
      return next
    })

    setCsvInfo(`Importadas ${rows.length} filas en ${byMeal.size} comida(s).`)
    setCsvText('')
  }

  function autoCalculateMacros() {
    const weight = Math.max(40, Number(calcWeight) || 75)
    const kcalPerKg = calcMode === 'cut' ? 29 : calcMode === 'bulk' ? 38 : 33
    const proteinPerKg = calcMode === 'bulk' ? 2.0 : 2.2
    const fatPerKg = calcMode === 'cut' ? 0.8 : 0.9

    const nextKcal = Math.round(weight * kcalPerKg)
    const nextProtein = Math.round(weight * proteinPerKg)
    const nextFat = Math.round(weight * fatPerKg)
    const kcalFromProteinAndFat = nextProtein * 4 + nextFat * 9
    const nextCarbs = Math.max(0, Math.round((nextKcal - kcalFromProteinAndFat) / 4))

    setKcal(nextKcal)
    setProt(nextProtein)
    setFat(nextFat)
    setCarbs(nextCarbs)
  }

  async function saveCurrentAsTemplate() {
    const name = templateName.trim()
    if (!name) return

    const snapshot: MealTemplate = {
      name,
      meals: meals.map((m) => ({
        name: m.name,
        time: m.time,
        foods: m.foods.map((f) => ({
          food: f.food,
          quantity: f.quantity,
          unit: f.unit,
          kcal: f.kcal ?? undefined,
          proteinG: f.proteinG ?? undefined,
          carbsG: f.carbsG ?? undefined,
          fatG: f.fatG ?? undefined,
        })),
      })),
    }

    setTemplatesSaving(true)
    try {
      // Si ya existe con ese nombre, borrarlo primero
      const existing = templates.find((t) => t.name.toLowerCase() === name.toLowerCase())
      if (existing?.id) {
        await fetch(`/api/nutrition-templates/${existing.id}`, { method: 'DELETE' })
      }
      try {
        const saved = await apiPost<{ id: string; name: string; meals: unknown }>(
          '/api/nutrition-templates',
          { name, meals: snapshot.meals }
        )
        const withoutSameName = templates.filter((t) => t.name.toLowerCase() !== name.toLowerCase())
        setTemplates(
          [
            { id: saved.id, name: saved.name, meals: saved.meals as MealTemplate['meals'] },
            ...withoutSameName,
          ].slice(0, 20)
        )
      } catch (err) {
        // Ignore save errors; toast already handled elsewhere if desired
      }
    } finally {
      setTemplatesSaving(false)
    }
    setTemplateName('')
  }

  function applyTemplate(name: string) {
    const tpl = templates.find((t) => t.name === name)
    if (!tpl) return

    const nextMeals: MealDraft[] = tpl.meals.map((m, i) => ({
      _key: crypto.randomUUID(),
      name: m.name,
      time: m.time,
      order: i,
      foods: m.foods.map((f, j) => ({
        _key: crypto.randomUUID(),
        food: f.food,
        quantity: f.quantity,
        unit: f.unit,
        kcal: f.kcal,
        proteinG: f.proteinG,
        carbsG: f.carbsG,
        fatG: f.fatG,
        order: j,
      })),
    }))

    if (nextMeals.length > 0) setMeals(nextMeals)
  }

  async function deleteTemplate(name: string) {
    const tpl = templates.find((t) => t.name === name)
    if (tpl?.id) {
      await fetch(`/api/nutrition-templates/${tpl.id}`, { method: 'DELETE' })
    }
    setTemplates((prev) => prev.filter((t) => t.name !== name))
    if (selectedTemplate === name) setSelectedTemplate('')
  }

  function updateMeal(key: string, patch: Partial<MealDraft>) {
    setMeals((ms) => ms.map((m) => (m._key === key ? { ...m, ...patch } : m)))
  }

  function updateFood(mealKey: string, foodKey: string, patch: Partial<FoodDraft>) {
    setMeals((ms) =>
      ms.map((m) =>
        m._key === mealKey
          ? { ...m, foods: m.foods.map((f) => (f._key === foodKey ? { ...f, ...patch } : f)) }
          : m
      )
    )
  }

  function addFood(mealKey: string) {
    setMeals((ms) =>
      ms.map((m) =>
        m._key === mealKey ? { ...m, foods: [...m.foods, newFood(m.foods.length)] } : m
      )
    )
  }

  function removeFood(mealKey: string, foodKey: string) {
    setMeals((ms) =>
      ms.map((m) =>
        m._key === mealKey ? { ...m, foods: m.foods.filter((f) => f._key !== foodKey) } : m
      )
    )
  }

  function addMeal() {
    setMeals((ms) => [...ms, newMeal(ms.length)])
  }

  function removeMeal(key: string) {
    setMeals((ms) => ms.filter((m) => m._key !== key))
  }

  async function handleSave() {
    if (!title.trim()) return
    setSaving(true)
    try {
      const payload = {
        athleteId,
        title: title.trim(),
        phase,
        kcalTarget: kcal,
        proteinG: prot,
        carbsG: carbs,
        fatG: fat,
        notes: notes || undefined,
        meals: meals.map((m, i) => ({
          name: m.name,
          time: m.time,
          order: i,
          foods: m.foods.map((f, j) => ({
            food: f.food,
            quantity: f.quantity,
            unit: f.unit,
            kcal: f.kcal,
            proteinG: f.proteinG,
            carbsG: f.carbsG,
            fatG: f.fatG,
            order: j,
          })),
        })),
      }

      if (initial) {
        // For now delete + recreate (simplest approach)
        await fetch(`/api/nutrition-plans/${initial.id}`, { method: 'DELETE' })
        await apiPost('/api/nutrition-plans', payload)
      } else {
        await apiPost('/api/nutrition-plans', payload)
      }
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  const inputCls =
    'w-full rounded-lg border border-line bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/30 focus:border-accent/50 focus:outline-none'
  const numCls =
    'rounded-lg border border-line bg-background px-2 py-1.5 text-sm text-foreground text-right focus:border-accent/50 focus:outline-none w-20'

  return (
    <div className="border-accent/20 bg-surface space-y-5 rounded-2xl border p-5">
      <h3 className="text-foreground font-semibold">
        {initial ? 'Editar plan' : 'Nuevo plan nutricional'}
      </h3>

      {/* Meta */}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-foreground/50 mb-1 block text-xs">Título</label>
          <input
            className={inputCls}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: Dieta Volumen S8"
          />
        </div>
        <div>
          <label className="text-foreground/50 mb-1 block text-xs">Fase</label>
          <input
            className={inputCls}
            value={phase}
            onChange={(e) => setPhase(e.target.value)}
            placeholder="Volumen / Corte…"
          />
        </div>
        <div>
          <label className="text-foreground/50 mb-1 block text-xs">kcal objetivo</label>
          <input
            className={inputCls}
            type="number"
            value={kcal}
            onChange={(e) => setKcal(Number(e.target.value))}
          />
        </div>
      </div>

      {/* Macros */}
      <div className="grid grid-cols-3 gap-3">
        {(
          [
            ['Proteína (g)', prot, setProt],
            ['Carbos (g)', carbs, setCarbs],
            ['Grasas (g)', fat, setFat],
          ] as const
        ).map(([label, val, setter]) => (
          <div key={label}>
            <label className="text-foreground/50 mb-1 block text-xs">{label}</label>
            <input
              className={inputCls}
              type="number"
              value={val}
              onChange={(e) => (setter as (v: number) => void)(Number(e.target.value))}
            />
          </div>
        ))}
      </div>

      {/* Auto-cálculo */}
      <div className="border-line bg-background/40 rounded-xl border p-3">
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="text-foreground/50 mb-1 block text-xs">Peso atleta (kg)</label>
            <input
              type="number"
              className="border-line bg-background text-foreground focus:border-accent/50 w-28 rounded-lg border px-3 py-1.5 text-sm focus:outline-none"
              value={calcWeight}
              onChange={(e) => setCalcWeight(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="text-foreground/50 mb-1 block text-xs">Objetivo</label>
            <select
              className="border-line bg-background text-foreground focus:border-accent/50 rounded-lg border px-3 py-1.5 text-sm focus:outline-none"
              value={calcMode}
              onChange={(e) => setCalcMode(e.target.value as 'cut' | 'maintain' | 'bulk')}
            >
              <option value="cut">Corte</option>
              <option value="maintain">Mantenimiento</option>
              <option value="bulk">Volumen</option>
            </select>
          </div>
          <button
            onClick={autoCalculateMacros}
            className="border-accent/30 text-accent hover:bg-accent/10 rounded-lg border px-3 py-1.5 text-xs font-semibold"
          >
            Auto-calcular macros
          </button>
        </div>
      </div>

      {/* Plantillas */}
      <div className="border-line bg-background/40 rounded-xl border p-3">
        <p className="text-foreground/60 text-xs">Plantillas de comidas (guardadas en BD)</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="Nombre plantilla"
            className="border-line bg-background text-foreground focus:border-accent/50 rounded-lg border px-3 py-1.5 text-xs focus:outline-none"
          />
          <button
            onClick={saveCurrentAsTemplate}
            disabled={!templateName.trim() || templatesSaving}
            className="border-accent/30 text-accent hover:bg-accent/10 rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
          >
            {templatesSaving ? 'Guardando…' : 'Guardar plantilla'}
          </button>
          <select
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            className="border-line bg-background text-foreground focus:border-accent/50 rounded-lg border px-3 py-1.5 text-xs focus:outline-none"
          >
            <option value="">Seleccionar plantilla</option>
            {templates.map((tpl) => (
              <option key={tpl.name} value={tpl.name}>
                {tpl.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => applyTemplate(selectedTemplate)}
            disabled={!selectedTemplate}
            className="border-line text-foreground/70 hover:border-accent/30 hover:text-accent rounded-lg border px-3 py-1.5 text-xs disabled:opacity-40"
          >
            Cargar
          </button>
          <button
            onClick={() => deleteTemplate(selectedTemplate)}
            disabled={!selectedTemplate}
            className="border-danger/30 text-danger hover:bg-danger/10 rounded-lg border px-3 py-1.5 text-xs disabled:opacity-40"
          >
            Borrar
          </button>
        </div>
      </div>

      {/* Notas */}
      <div>
        <label className="text-foreground/50 mb-1 block text-xs">Notas coach</label>
        <textarea
          className={`${inputCls} resize-none`}
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Indicaciones adicionales…"
        />
      </div>

      {/* Comidas */}
      <div className="space-y-4">
        <div className="border-line bg-background/50 rounded-xl border p-3">
          <p className="text-foreground/70 text-xs">
            Importar CSV (MyFitnessPal-like): cabeceras soportadas
            <span className="text-accent ml-1 font-semibold">
              meal,time,food,quantity,unit,kcal,protein,carbs,fat
            </span>
          </p>
          <textarea
            rows={4}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            className="border-line bg-background text-foreground focus:border-accent/50 mt-2 w-full rounded-lg border px-3 py-2 text-xs focus:outline-none"
            placeholder={
              'meal,time,food,quantity,unit,kcal,protein,carbs,fat\nDesayuno,08:00,Avena,80,g,311,13.5,53.0,5.5\nDesayuno,08:00,Yogur griego 0%,200,g,118,20.6,7.2,0.8'
            }
          />
          <div className="mt-2 flex items-center justify-between">
            <button
              onClick={importCsvRows}
              disabled={!csvText.trim()}
              className="border-accent/30 text-accent hover:bg-accent/10 rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
            >
              Importar CSV
            </button>
            {csvInfo ? <span className="text-foreground/60 text-xs">{csvInfo}</span> : null}
          </div>
        </div>

        <div className="border-accent/20 bg-accent/5 text-foreground/70 rounded-xl border px-3 py-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span>
              MFP beta: usa MFP para autocalcular kcal/macros y Eq para equivalencias por calorías.
            </span>
            <span className="text-accent font-semibold">Fuente: {catalogSource}</span>
            <select
              value={foodProvider}
              onChange={(e) => setFoodProvider(e.target.value as 'auto' | 'mfp' | 'local')}
              className="border-line bg-background text-foreground rounded border px-1.5 py-0.5 text-[11px]"
              title="Proveedor de datos de alimentos"
            >
              <option value="auto">Auto</option>
              <option value="mfp">MyFitnessPal</option>
              <option value="local">Local</option>
            </select>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <h4 className="text-foreground/70 text-sm font-semibold">Comidas</h4>
          <button onClick={addMeal} className="text-accent text-xs hover:underline">
            + Añadir comida
          </button>
        </div>

        {meals.map((meal, mi) => (
          <div
            key={meal._key}
            className="border-line bg-background/40 space-y-3 rounded-xl border p-4"
          >
            <div className="flex items-center gap-2">
              <input
                className="border-line bg-background text-foreground focus:border-accent/50 flex-1 rounded-lg border px-3 py-1.5 text-sm focus:outline-none"
                placeholder={`Comida ${mi + 1} (ej: Desayuno)`}
                value={meal.name}
                onChange={(e) => updateMeal(meal._key, { name: e.target.value })}
              />
              <input
                className="border-line bg-background text-foreground focus:border-accent/50 w-24 rounded-lg border px-2 py-1.5 text-sm focus:outline-none"
                placeholder="Hora"
                value={meal.time}
                onChange={(e) => updateMeal(meal._key, { time: e.target.value })}
              />
              {meals.length > 1 && (
                <button
                  onClick={() => removeMeal(meal._key)}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Alimentos */}
            <div className="space-y-2">
              {meal.foods.map((food) => (
                <div key={food._key} className="space-y-1.5">
                  <div className="grid grid-cols-12 gap-1.5 text-xs">
                    <div className="col-span-3">
                      <FoodSearch
                        onSelect={(selectedFood) => {
                          updateFood(meal._key, food._key, {
                            food: selectedFood.name,
                            kcal: selectedFood.kcal,
                            proteinG: selectedFood.proteinG,
                            carbsG: selectedFood.carbsG,
                            fatG: selectedFood.fatG,
                          })
                        }}
                        provider="auto"
                        showFavorites={true}
                      />
                    </div>
                    <input
                      className="border-line bg-background text-foreground focus:border-accent/50 col-span-2 rounded border px-2 py-1 text-right focus:outline-none"
                      type="number"
                      placeholder="g/ml"
                      value={food.quantity}
                      onChange={(e) =>
                        updateFood(meal._key, food._key, { quantity: Number(e.target.value) })
                      }
                    />
                    <input
                      className="border-line bg-background text-foreground focus:border-accent/50 col-span-1 rounded border px-2 py-1 focus:outline-none"
                      placeholder="u"
                      value={food.unit}
                      onChange={(e) => updateFood(meal._key, food._key, { unit: e.target.value })}
                    />
                    <input
                      className="border-line bg-background text-foreground focus:border-accent/50 col-span-1 rounded border px-1 py-1 text-right focus:outline-none"
                      type="number"
                      placeholder="kcal"
                      value={food.kcal ?? ''}
                      onChange={(e) =>
                        updateFood(meal._key, food._key, {
                          kcal: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                    />
                    <input
                      className="border-success/20 bg-background text-success focus:border-success/50 col-span-1 rounded border px-1 py-1 text-right focus:outline-none"
                      type="number"
                      placeholder="P"
                      value={food.proteinG ?? ''}
                      onChange={(e) =>
                        updateFood(meal._key, food._key, {
                          proteinG: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                    />
                    <input
                      className="bg-background col-span-1 rounded border border-(--macro-carbs)/20 px-1 py-1 text-right text-(--macro-carbs) focus:border-(--macro-carbs)/50 focus:outline-none"
                      type="number"
                      placeholder="C"
                      value={food.carbsG ?? ''}
                      onChange={(e) =>
                        updateFood(meal._key, food._key, {
                          carbsG: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                    />
                    <input
                      className="border-warning/20 bg-background text-warning focus:border-warning/50 col-span-1 rounded border px-1 py-1 text-right focus:outline-none"
                      type="number"
                      placeholder="G"
                      value={food.fatG ?? ''}
                      onChange={(e) =>
                        updateFood(meal._key, food._key, {
                          fatG: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                    />
                    <div className="col-span-2 flex items-center justify-end gap-1">
                      <button
                        onClick={() => resolveFromCatalog(meal._key, food)}
                        disabled={!food.food.trim() || resolvingKey === food._key}
                        className="border-accent/30 text-accent hover:bg-accent/10 rounded border px-1.5 py-0.5 text-[10px] font-semibold disabled:opacity-40"
                        title="Autocalcular desde base tipo MyFitnessPal"
                      >
                        MFP
                      </button>
                      <button
                        onClick={() => loadEquivalences(food)}
                        disabled={!food.food.trim()}
                        className="border-line text-foreground/70 hover:border-accent/30 hover:text-accent rounded border px-1.5 py-0.5 text-[10px] disabled:opacity-40"
                        title="Ver equivalencias por kcal"
                      >
                        Eq
                      </button>
                      <button
                        onClick={() => removeFood(meal._key, food._key)}
                        className="text-danger text-center hover:opacity-80"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  {equivByFoodKey[food._key]?.length ? (
                    <div className="border-line bg-surface-strong text-foreground/60 rounded border px-2 py-1 text-[11px]">
                      <span className="text-foreground/80 mr-1 font-semibold">Equivalencias:</span>
                      {equivByFoodKey[food._key].join(' · ')}
                    </div>
                  ) : null}
                  {foodHints[food._key]?.length ? (
                    <div className="border-line bg-background text-foreground/60 rounded border px-2 py-1 text-[11px]">
                      <span className="text-foreground/80 mr-1 font-semibold">Sugerencias:</span>
                      {foodHints[food._key].map((hint) => (
                        <button
                          key={hint}
                          onClick={() => updateFood(meal._key, food._key, { food: hint })}
                          className="border-line hover:border-accent/30 hover:text-accent mr-1 inline-flex rounded border px-1.5 py-0.5"
                        >
                          {hint}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
              <button
                onClick={() => addFood(meal._key)}
                className="text-accent/70 hover:text-accent text-xs hover:underline"
              >
                + Alimento
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <button
          onClick={onCancel}
          className="border-line text-foreground/60 hover:text-foreground rounded-lg border px-4 py-2 text-sm transition"
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !title.trim()}
          className="bg-accent text-background hover:bg-accent/90 rounded-lg px-5 py-2 text-sm font-semibold transition disabled:opacity-50"
        >
          {saving ? 'Guardando…' : 'Guardar plan'}
        </button>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

function NutritionEditorContent() {
  const searchParams = useSearchParams()
  const athleteId = searchParams.get('athleteId') ?? ''

  const { plans, loading, refresh } = useNutritionPlans(athleteId || undefined)
  const { pushToast } = useToast()
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<NutritionPlan | null>(null)
  const [pendingDelete, setPendingDelete] = useState<NutritionPlan | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Si la URL contiene ?create=true y hay athleteId, abrir el formulario automáticamente
  useEffect(() => {
    try {
      const shouldCreate = searchParams.get('create') === 'true'
      if (shouldCreate && athleteId) setCreating(true)
    } catch {
      // ignore
    }
  }, [searchParams, athleteId])

  if (!athleteId) {
    return (
      <EmptyState
        title="Selecciona un atleta"
        description="Accede a nutrición desde el perfil detallado del atleta."
        className="mt-12"
      />
    )
  }

  if (loading) {
    return <Skeleton className="mt-4 h-40" />
  }

  async function handleDelete() {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      await fetch(`/api/nutrition-plans/${pendingDelete.id}`, { method: 'DELETE' })
      pushToast({
        title: 'Plan nutricional eliminado',
        description: pendingDelete.title,
        variant: 'success',
      })
      setPendingDelete(null)
      refresh()
    } catch {
      pushToast({ title: 'No se pudo eliminar el plan', variant: 'error' })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Eliminar plan nutricional"
        description={pendingDelete ? `Se eliminará \"${pendingDelete.title}\".` : ''}
        confirmLabel="Eliminar"
        tone="danger"
        busy={deleting}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleDelete}
      />

      {editing && (
        <PlanForm
          athleteId={athleteId}
          initial={editing}
          onSaved={() => {
            setEditing(null)
            refresh()
          }}
          onCancel={() => setEditing(null)}
        />
      )}

      {creating && !editing && (
        <PlanForm
          athleteId={athleteId}
          onSaved={() => {
            setCreating(false)
            refresh()
          }}
          onCancel={() => setCreating(false)}
        />
      )}

      {plans.map((plan) => (
        <PlanReadView
          key={plan.id}
          plan={plan}
          onEdit={() => {
            setCreating(false)
            setEditing(plan)
          }}
          onDelete={() => setPendingDelete(plan)}
        />
      ))}

      {plans.length === 0 && !creating && (
        <EmptyState
          title="Sin planes nutricionales"
          description="Crea el primer plan para este atleta."
          icon="🥗"
        />
      )}

      {!creating && !editing && (
        <button
          onClick={() => setCreating(true)}
          className="border-accent/30 text-accent hover:bg-accent/5 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed py-3 text-sm transition"
        >
          + Crear plan nutricional
        </button>
      )}
    </div>
  )
}

type AthleteListItem = { id: string; fullName: string; goal: string; planCount: number }

function NutritionEditorWithAside() {
  const searchParams = useSearchParams()
  const athleteId = searchParams.get('athleteId') ?? ''
  const [athletes, setAthletes] = useState<AthleteListItem[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    apiFetch('/api/athletes')
      .then((d: any) => {
        const arr = Array.isArray(d) ? d : d?.items ?? d?.athletes ?? []
        const mapped: AthleteListItem[] = (arr as Array<{ id: string; fullName: string; goal?: string }>).map((a) => ({
          id: a.id,
          fullName: a.fullName,
          goal: a.goal ?? '',
          planCount: 0,
        }))
        setAthletes(mapped)
      })
      .catch(() => {})
  }, [])

  const filtered = athletes.filter((a) => a.fullName.toLowerCase().includes(search.toLowerCase()))

  const selected = athletes.find((a) => a.id === athleteId)

  const aside = (
    <div className="border-line bg-surface max-h-[calc(100vh-160px)] space-y-2 overflow-y-auto rounded-2xl border p-4">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar atleta…"
        className="border-line bg-background text-foreground placeholder:text-foreground/35 focus:border-accent/50 w-full rounded-xl border px-3 py-2 text-sm focus:outline-none"
      />
      {filtered.length === 0 ? (
        <p className="text-foreground/40 py-4 text-center text-xs">Sin atletas</p>
      ) : (
        <div className="space-y-0.5 pt-1">
          {filtered.map((a) => {
            const isActive = a.id === athleteId
            const goalLabels: Record<string, string> = {
              VOLUMEN: 'Vol',
              DEFINICION: 'Def',
              MANTENIMIENTO: 'Man',
              PEAK_WEEK: 'Peak',
            }
            return (
              <a
                key={a.id}
                href={`/coach/nutrition?athleteId=${a.id}`}
                className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 transition ${isActive ? 'bg-accent/10 border-accent/20 border' : 'hover:bg-surface-strong'}`}
              >
                <div className="bg-accent/10 text-accent flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold">
                  {a.fullName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{a.fullName}</p>
                  <p className="text-foreground/45 text-xs">{goalLabels[a.goal] ?? a.goal}</p>
                </div>
              </a>
            )
          })}
        </div>
      )}
    </div>
  )

  const main = (
    <div className="space-y-4">
      {selected && (
        <div className="border-line bg-surface flex items-center gap-3 rounded-2xl border px-5 py-3">
          <div className="bg-accent/10 text-accent flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold">
            {selected.fullName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold">{selected.fullName}</p>
            <p className="text-foreground/45 text-xs">Planes nutricionales</p>
          </div>
        </div>
      )}
      <NutritionEditorContent />
    </div>
  )

  return <SplitLayout aside={aside} main={main} variant="wide-aside" />
}

export default function CoachNutritionPage() {
  return (
    <PageShell>
      <PageHeader eyebrow="Coach dashboard" title="Nutrición" />
      <Suspense fallback={<Skeleton className="h-40" />}>
        <NutritionEditorWithAside />
      </Suspense>
    </PageShell>
  )
}
