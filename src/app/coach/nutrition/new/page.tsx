'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PageShell } from '@/components/layout'
import { SectionIntro } from '@/components/section-intro'
import { useToast } from '@/components/ui/toast'
import { NutritionDayCard } from '@/components/coach/nutrition-day-card'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import type { NutritionDay } from '@/components/coach/nutrition-day-card'

type NutritionDraft = {
  title: string
  targetKcal?: number
  targetProtein?: number
  targetCarbs?: number
  targetFat?: number
  days: NutritionDay[]
}

export default function NewNutritionPage() {
  const router = useRouter()
  const { pushToast } = useToast()
  const [draft, setDraft] = useState<NutritionDraft>({
    title: '',
    days: [],
  })
  const [saving, setSaving] = useState(false)

  function addDay() {
    setDraft((prev) => ({
      ...prev,
      days: [...prev.days, { name: `Día ${prev.days.length + 1}`, meals: [] }],
    }))
  }

  function updateDay(di: number, patch: Partial<NutritionDay>) {
    setDraft((prev) => ({
      ...prev,
      days: prev.days.map((d, i) => (i === di ? { ...d, ...patch } : d)),
    }))
  }

  function removeDay(di: number) {
    setDraft((prev) => ({ ...prev, days: prev.days.filter((_, i) => i !== di) }))
  }

  function addMeal(di: number) {
    const days = [...draft.days]
    days[di] = {
      ...days[di],
      meals: [...days[di].meals, { name: `Comida ${days[di].meals.length + 1}`, foods: [] }],
    }
    setDraft((prev) => ({ ...prev, days }))
  }

  function updateMeal(di: number, mi: number, patch: Partial<{ name: string; foods: any[] }>) {
    const days = [...draft.days]
    days[di] = {
      ...days[di],
      meals: days[di].meals.map((m, i) => (i === mi ? { ...m, ...patch } : m)),
    }
    setDraft((prev) => ({ ...prev, days }))
  }

  function removeMeal(di: number, mi: number) {
    const days = [...draft.days]
    days[di] = { ...days[di], meals: days[di].meals.filter((_, i) => i !== mi) }
    setDraft((prev) => ({ ...prev, days }))
  }

  function handleDragEnd(result: any) {
    if (!result.destination) return
    const days = Array.from(draft.days)
    const [reordered] = days.splice(result.source.index, 1)
    days.splice(result.destination.index, 0, reordered)
    setDraft((prev) => ({ ...prev, days }))
  }

  async function handleSave() {
    if (!draft.title.trim()) {
      pushToast({ title: 'El nombre del plan es requerido', variant: 'error' })
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/nutrition-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: draft.title,
          targetKcal: draft.targetKcal,
          targetProtein: draft.targetProtein,
          targetCarbs: draft.targetCarbs,
          targetFat: draft.targetFat,
          days: draft.days,
        }),
      })
      if (!res.ok) throw new Error('Error al crear')
      pushToast({ title: 'Plan nutricional creado', variant: 'success' })
      router.push('/coach/nutrition')
    } catch {
      pushToast({ title: 'Error al crear el plan', variant: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageShell className="max-w-3xl gap-6 px-4 py-8 sm:px-6">
      <SectionIntro
        eyebrow="Nutrición"
        title="Nuevo plan nutricional"
        description="Crea un plan con días y comidas colapsables."
      />

      <div className="border-line bg-surface rounded-4xl border p-6 sm:p-8">
        <div className="mb-4">
          <label className="text-foreground/80 mb-1.5 block text-sm font-medium">
            Nombre del plan
          </label>
          <input
            className="border-line bg-surface-strong focus:ring-accent w-full rounded-2xl border px-4 py-3 text-sm focus:ring-1 focus:outline-none"
            placeholder="Ej. Semana 1 - Volumen"
            value={draft.title}
            onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
          />
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <label className="text-foreground/50 mb-1 block text-xs">Kcal objetivo</label>
            <input
              type="number"
              className="border-line bg-surface-strong focus:ring-accent w-full rounded-xl border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
              value={draft.targetKcal ?? ''}
              onChange={(e) =>
                setDraft((p) => ({
                  ...p,
                  targetKcal: e.target.value ? Number(e.target.value) : undefined,
                }))
              }
            />
          </div>
          <div>
            <label className="text-foreground/50 mb-1 block text-xs">Proteína (g)</label>
            <input
              type="number"
              className="border-line bg-surface-strong focus:ring-accent w-full rounded-xl border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
              value={draft.targetProtein ?? ''}
              onChange={(e) =>
                setDraft((p) => ({
                  ...p,
                  targetProtein: e.target.value ? Number(e.target.value) : undefined,
                }))
              }
            />
          </div>
          <div>
            <label className="text-foreground/50 mb-1 block text-xs">Carbs (g)</label>
            <input
              type="number"
              className="border-line bg-surface-strong focus:ring-accent w-full rounded-xl border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
              value={draft.targetCarbs ?? ''}
              onChange={(e) =>
                setDraft((p) => ({
                  ...p,
                  targetCarbs: e.target.value ? Number(e.target.value) : undefined,
                }))
              }
            />
          </div>
          <div>
            <label className="text-foreground/50 mb-1 block text-xs">Grasas (g)</label>
            <input
              type="number"
              className="border-line bg-surface-strong focus:ring-accent w-full rounded-xl border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
              value={draft.targetFat ?? ''}
              onChange={(e) =>
                setDraft((p) => ({
                  ...p,
                  targetFat: e.target.value ? Number(e.target.value) : undefined,
                }))
              }
            />
          </div>
        </div>

        <div className="space-y-6">
          {/* Header resumen */}
          {draft.days.length > 0 && (
            <div className="from-accent/5 to-accent/10 border-line rounded-3xl border bg-gradient-to-br p-5">
              <p className="text-foreground/60 mb-1 text-sm">Resumen del plan</p>
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-accent text-3xl font-bold">{draft.days.length}</p>
                  <p className="text-foreground/50 text-xs">Días</p>
                </div>
                <div>
                  <p className="text-accent text-3xl font-bold">
                    {draft.days.reduce((sum, d) => sum + d.meals.length, 0)}
                  </p>
                  <p className="text-foreground/50 text-xs">Comidas</p>
                </div>
              </div>
            </div>
          )}

          {/* Días lista */}
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="days" type="DAY">
              {(provided) => (
                <div className="space-y-4" ref={provided.innerRef} {...provided.droppableProps}>
                  {draft.days.map((day, di) => (
                    <Draggable key={di} draggableId={`day-${di}`} index={di}>
                      {(provided, snapshot) => (
                        <div ref={provided.innerRef} {...provided.draggableProps}>
                          <NutritionDayCard
                            day={day}
                            targetKcal={draft.targetKcal}
                            targetProtein={draft.targetProtein}
                            targetCarbs={draft.targetCarbs}
                            targetFat={draft.targetFat}
                            onUpdate={(patch) => updateDay(di, patch)}
                            onRemove={() => removeDay(di)}
                            onAddMeal={() => addMeal(di)}
                            onUpdateMeal={(mi, patch) => updateMeal(di, mi, patch)}
                            onRemoveMeal={(mi) => removeMeal(di, mi)}
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

          {draft.days.length === 0 && (
            <div className="border-line bg-surface-strong rounded-3xl border px-5 py-8 text-center">
              <p className="text-foreground/40 text-sm">Sin días aún</p>
              <p className="text-foreground/30 mt-1 text-xs">
                Pulsa "+ Agregar día" para comenzar a construir tu plan nutricional
              </p>
            </div>
          )}

          {/* Botón flotante agregar día */}
          <button
            type="button"
            onClick={addDay}
            className="border-accent/40 bg-accent hover:bg-accent/90 border-accent sticky bottom-6 flex w-full items-center justify-center gap-2 rounded-3xl border py-3.5 text-sm font-semibold text-white transition"
          >
            <span>＋</span>
            Agregar día
          </button>
        </div>
      </div>

      <div className="flex justify-between gap-4">
        <button
          type="button"
          onClick={() => router.push('/coach/nutrition')}
          className="border-line bg-surface-strong rounded-2xl border px-6 py-3 text-sm font-medium"
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="bg-accent rounded-2xl px-6 py-3 text-sm font-semibold text-white disabled:opacity-40"
        >
          {saving ? 'Guardando...' : 'Crear plan'}
        </button>
      </div>
    </PageShell>
  )
}
