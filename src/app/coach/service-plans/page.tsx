'use client'

import { useState } from 'react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { PageShell } from '@/components/layout'
import { SectionIntro } from '@/components/section-intro'
import { ViewModeToggle } from '@/components/ui/view-mode-toggle'
import { useServicePlans } from '@/lib/store'
import type { ServicePlan } from '@/lib/domain'

function PlanCard({ plan, onDelete }: { plan: ServicePlan; onDelete: () => void }) {
  return (
    <div className="border-line bg-surface rounded-4xl border p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-foreground font-semibold">{plan.name}</h3>
          {plan.description && (
            <p className="text-foreground/60 mt-1 text-sm">{plan.description}</p>
          )}
        </div>
        <div className="text-right">
          <div className="text-accent text-2xl font-bold">{plan.priceEur}€</div>
          <div className="text-foreground/40 text-xs">/ mes</div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="border-line text-foreground/60 rounded-full border px-3 py-1 text-xs">
          {plan.durationWeeks} semanas
        </span>
        <span className="border-line text-foreground/60 rounded-full border px-3 py-1 text-xs">
          Check-in cada {plan.checkinFreqDays} días
        </span>
        {plan.includesNutrition && (
          <span className="border-success/30 bg-success/10 text-success rounded-full border px-3 py-1 text-xs">
            Incluye nutricion
          </span>
        )}
        {plan._count && (
          <span className="border-line text-foreground/40 rounded-full border px-3 py-1 text-xs">
            {plan._count.athletes} atleta{plan._count.athletes !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="mt-4 flex justify-end">
        <button
          onClick={onDelete}
          className="border-danger/30 text-danger hover:bg-danger/10 rounded-full border px-3 py-1.5 text-xs transition"
        >
          Eliminar
        </button>
      </div>
    </div>
  )
}

function NewPlanForm({ onSaved, onCancel }: { onSaved: () => void; onCancel: () => void }) {
  const { addPlan } = useServicePlans()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState(149)
  const [weeks, setWeeks] = useState(4)
  const [checkinFreq, setCheckinFreq] = useState(7)
  const [nutrition, setNutrition] = useState(false)
  const [saving, setSaving] = useState(false)

  const inputCls =
    'w-full rounded-2xl border border-line bg-surface-strong px-4 py-2.5 text-sm text-foreground placeholder:text-foreground/30 outline-none transition focus:border-accent'

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    try {
      await addPlan({
        name: name.trim(),
        description: description || undefined,
        priceEur: price,
        durationWeeks: weeks,
        checkinFreqDays: checkinFreq,
        includesNutrition: nutrition,
      })
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="border-accent/20 bg-surface space-y-4 rounded-4xl border p-6">
      <h3 className="text-xl font-semibold">Nuevo plan de servicio</h3>

      <div>
        <label className="text-foreground/50 mb-1 block text-xs">Nombre</label>
        <input
          className={inputCls}
          placeholder="Ej: Plan Premium"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div>
        <label className="text-foreground/50 mb-1 block text-xs">Descripción</label>
        <textarea
          className={`${inputCls} resize-none`}
          rows={2}
          placeholder="¿Qué incluye este plan?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-foreground/50 mb-1 block text-xs">Precio (€)</label>
          <input
            className={inputCls}
            type="number"
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
          />
        </div>
        <div>
          <label className="text-foreground/50 mb-1 block text-xs">Duración (sem.)</label>
          <input
            className={inputCls}
            type="number"
            value={weeks}
            onChange={(e) => setWeeks(Number(e.target.value))}
          />
        </div>
        <div>
          <label className="text-foreground/50 mb-1 block text-xs">Check-in c/ (días)</label>
          <input
            className={inputCls}
            type="number"
            value={checkinFreq}
            onChange={(e) => setCheckinFreq(Number(e.target.value))}
          />
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-3">
        <div
          onClick={() => setNutrition((v) => !v)}
          className={`h-5 w-10 rounded-full transition-colors ${
            nutrition ? 'bg-accent' : 'bg-surface border-line border'
          } relative`}
        >
          <span
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
              nutrition ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </div>
        <span className="text-foreground/70 text-sm">Incluye plan nutricional</span>
      </label>

      <div className="flex justify-end gap-3">
        <button
          onClick={onCancel}
          className="border-line text-foreground/60 hover:text-foreground rounded-full border px-5 py-2 text-sm transition"
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="bg-accent hover:bg-accent-strong rounded-full px-6 py-2 text-sm font-semibold text-white transition disabled:opacity-50"
        >
          {saving ? 'Guardando…' : 'Crear plan'}
        </button>
      </div>
    </div>
  )
}

export default function ServicePlansPage() {
  const { plans, loading, removePlan, refresh } = useServicePlans()
  const { pushToast } = useToast()
  const [creating, setCreating] = useState(false)
  const [viewMode, setViewMode] = useState<'table' | 'list'>('table')
  const [pendingDelete, setPendingDelete] = useState<ServicePlan | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function confirmDelete() {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      await removePlan(pendingDelete.id)
      pushToast({ title: 'Plan eliminado', description: pendingDelete.name, variant: 'success' })
      setPendingDelete(null)
    } catch {
      pushToast({ title: 'No se pudo eliminar', variant: 'error' })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <PageShell>
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Eliminar plan"
        description={
          pendingDelete ? `Se eliminara "${pendingDelete.name}" y no se podra deshacer.` : ''
        }
        confirmLabel="Eliminar"
        tone="danger"
        busy={deleting}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />

      <div className="flex items-end justify-between gap-4">
        <SectionIntro
          eyebrow="Coach dashboard"
          title="Planes de servicio"
          description="Paquetes contratables por tus atletas."
        />
        <div className="flex items-center gap-3">
          {plans.length > 0 && !creating && (
            <ViewModeToggle
              value={viewMode}
              onChange={setViewMode}
              storageKey="service-plans-view-mode"
            />
          )}
          {!creating && (
            <button
              onClick={() => setCreating(true)}
              className="bg-accent hover:bg-accent-strong shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition"
            >
              + Nuevo plan
            </button>
          )}
        </div>
      </div>

      <div
        className={
          viewMode === 'table'
            ? 'grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'
            : 'space-y-3'
        }
      >
        {creating && (
          <NewPlanForm
            onSaved={() => {
              setCreating(false)
              refresh()
            }}
            onCancel={() => setCreating(false)}
          />
        )}

        {loading ? (
          <div className={viewMode === 'table' ? 'space-y-0' : 'space-y-3'}>
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-32 rounded-4xl" />
            ))}
          </div>
        ) : (
          <>
            {plans.map((plan) => (
              <div key={plan.id}>
                {viewMode === 'table' ? (
                  // TABLE VIEW: Card grid layout
                  <PlanCard plan={plan} onDelete={() => setPendingDelete(plan)} />
                ) : (
                  // LIST VIEW: Linear card with horizontal layout
                  <div className="border-line bg-surface-strong hover:border-accent/30 hover:bg-background/50 rounded-2xl border p-4 transition">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-foreground font-semibold">{plan.name}</h3>
                        {plan.description && (
                          <p className="text-foreground/60 mt-1 text-sm">{plan.description}</p>
                        )}
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          <span className="border-line text-foreground/60 rounded-full border px-2.5 py-1 text-xs">
                            {plan.durationWeeks} semanas
                          </span>
                          <span className="border-line text-foreground/60 rounded-full border px-2.5 py-1 text-xs">
                            Check-in cada {plan.checkinFreqDays} días
                          </span>
                          {plan.includesNutrition && (
                            <span className="border-success/30 bg-success/10 text-success rounded-full border px-2.5 py-1 text-xs">
                              Incluye nutrición
                            </span>
                          )}
                          {plan._count && (
                            <span className="border-line text-foreground/40 rounded-full border px-2.5 py-1 text-xs">
                              {plan._count.athletes} atleta{plan._count.athletes !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-accent text-2xl font-bold">{plan.priceEur}€</div>
                        <div className="text-foreground/40 text-xs">/ mes</div>
                        <button
                          onClick={() => setPendingDelete(plan)}
                          className="border-danger/30 text-danger hover:bg-danger/10 mt-3 w-full rounded-lg border px-3 py-1.5 text-xs transition"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {plans.length === 0 && !creating && (
              <EmptyState
                title="Sin planes definidos"
                description="Crea tu primer plan de servicio para empezar a asignarlo a atletas."
                icon="📋"
                action={
                  <button
                    onClick={() => setCreating(true)}
                    className="bg-accent hover:bg-accent-strong mt-2 rounded-full px-6 py-3 text-sm font-semibold text-white transition"
                  >
                    + Nuevo plan
                  </button>
                }
              />
            )}
          </>
        )}
      </div>
    </PageShell>
  )
}
