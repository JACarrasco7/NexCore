'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { EmptyState } from '@/components/ui/empty-state'
import { Modal } from '@/components/ui/modal'
import { FormField } from '@/components/ui/form-field'
import { useToast } from '@/components/ui/toast'
import { ViewModeToggle } from '@/components/ui/view-mode-toggle'
import { PageShell, PageHeader } from '@/components/layout'
import { useAthletes, apiFetch } from '@/lib/store'
import { useCoachMe } from '@/lib/use-coach-me'
import type { AthleteProfile } from '@/lib/domain'

type CatalogGoal = { code: string; label: string; isVisible: boolean }

const editAthleteSchema = z.object({
  fullName: z.string().min(1, 'El nombre es obligatorio'),
  goal: z.enum(['volumen', 'definicion', 'mantenimiento', 'peak-week']),
  phaseLabel: z.string(),
})

type EditAthleteForm = z.infer<typeof editAthleteSchema>

// Visual tones stay local — not in the catalog API
const GOAL_TONES: Record<string, string> = {
  volumen: 'bg-success/10 text-success border-success/30',
  definicion: 'bg-warning/10 text-warning border-warning/30',
  mantenimiento: 'bg-surface-strong text-foreground/50 border-line',
  'peak-week': 'bg-danger/10 text-danger border-danger/30',
}

const FALLBACK_GOALS: CatalogGoal[] = [
  { code: 'volumen', label: 'Volumen', isVisible: true },
  { code: 'definicion', label: 'Definición', isVisible: true },
  { code: 'mantenimiento', label: 'Mantenimiento', isVisible: true },
  { code: 'peak-week', label: 'Peak Week', isVisible: true },
]

// ─── Edit Modal ───────────────────────────────────────────────────────────────

function EditAthleteModal({
  athlete,
  goals,
  onSave,
  onClose,
}: {
  athlete: AthleteProfile
  goals: CatalogGoal[]
  onSave: (id: string, data: Partial<AthleteProfile>) => Promise<void>
  onClose: () => void
}) {
  const methods = useForm<EditAthleteForm>({
    resolver: zodResolver(editAthleteSchema),
    defaultValues: {
      fullName: athlete.fullName,
      goal: athlete.goal,
      phaseLabel: athlete.phaseLabel,
    },
  })

  const {
    handleSubmit,
    formState: { isSubmitting },
  } = methods

  async function onSubmit(data: EditAthleteForm) {
    await onSave(athlete.id, {
      fullName: data.fullName,
      goal: data.goal,
      phaseLabel: data.phaseLabel,
    })
    onClose()
  }

  return (
    <FormProvider {...methods}>
      <Modal
        open
        onClose={onClose}
        size="sm"
        title="Editar atleta"
        description="Actualiza los datos principales del atleta."
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="border-line hover:bg-surface-strong rounded-full border px-5 py-3 text-sm font-medium transition"
            >
              Cancelar
            </button>
            <button
              form="edit-athlete-form"
              type="submit"
              disabled={isSubmitting}
              className="bg-accent hover:bg-accent-strong rounded-full px-5 py-3 text-sm font-semibold text-white transition disabled:opacity-50"
            >
              {isSubmitting ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        }
      >
        <form id="edit-athlete-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField name="fullName" label="Nombre completo" />
          <FormField name="goal" label="Objetivo" type="select">
            {goals
              .filter((g) => g.isVisible)
              .map((g) => (
                <option key={g.code} value={g.code}>
                  {g.label}
                </option>
              ))}
          </FormField>
          <FormField
            name="phaseLabel"
            label="Etiqueta de fase"
            placeholder="ej. Semana 4 · Acumulación"
          />
        </form>
      </Modal>
    </FormProvider>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AthletesPage() {
  const { coach } = useCoachMe()
  const { athletes, updateAthlete } = useAthletes(coach?.id)
  const { pushToast } = useToast()
  const [editTarget, setEditTarget] = useState<AthleteProfile | null>(null)
  const [search, setSearch] = useState('')
  const [goalFilter, setGoalFilter] = useState('')
  const [viewMode, setViewMode] = useState<'table' | 'list'>('list')
  const [catalogGoals, setCatalogGoals] = useState<CatalogGoal[]>(FALLBACK_GOALS)

  useEffect(() => {
    apiFetch<{ goals?: Array<{ code: string; label: string; isVisible: boolean }> }>(
      '/api/teams/catalog'
    )
      .then((data) => {
        if (!data?.goals?.length) return
        // API returns codes in UPPERCASE; normalize to lowercase-dash for matching athlete.goal
        const mapped: CatalogGoal[] = data.goals.map((g) => ({
          code: g.code.toLowerCase().replace('_', '-'),
          label: g.label,
          isVisible: g.isVisible,
        }))
        setCatalogGoals(mapped)
      })
      .catch(() => void 0)
  }, [])

  const filtered = athletes.filter((a) => {
    const matchSearch = a.fullName.toLowerCase().includes(search.toLowerCase())
    const matchGoal = goalFilter ? a.goal === goalFilter : true
    return matchSearch && matchGoal
  })

  async function handleSave(id: string, data: Partial<AthleteProfile>) {
    await updateAthlete(id, data)
    pushToast({ title: 'Atleta actualizado', variant: 'success' })
  }

  return (
    <>
      {editTarget && (
        <EditAthleteModal
          athlete={editTarget}
          goals={catalogGoals}
          onSave={handleSave}
          onClose={() => setEditTarget(null)}
        />
      )}

      <PageShell>
        <PageHeader
          eyebrow="Coach dashboard"
          title="Atletas"
          actions={
            <>
              <ViewModeToggle
                value={viewMode}
                onChange={setViewMode}
                storageKey="athletes-view-mode"
              />
              <Link
                href="/athlete/onboarding"
                className="bg-accent hover:bg-accent-strong shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition"
              >
                + Alta atleta
              </Link>
            </>
          }
        />

        {/* Split layout: aside filtros + main lista */}
        <div className="grid gap-5 xl:grid-cols-[260px_minmax(0,1fr)] xl:items-start">
          {/* Aside: filtros */}
          <aside className="space-y-4 xl:sticky xl:top-24">
            <div className="border-line bg-surface-strong space-y-3 rounded-2xl border p-4">
              <p className="text-foreground/45 text-xs tracking-widest uppercase">Buscar</p>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nombre del atleta..."
                className="border-line bg-background focus:border-accent w-full rounded-xl border px-3 py-2 text-sm transition outline-none"
              />
            </div>

            <div className="border-line bg-surface-strong space-y-2 rounded-2xl border p-4">
              <p className="text-foreground/45 mb-1 text-xs tracking-widest uppercase">Objetivo</p>
              <button
                onClick={() => setGoalFilter('')}
                className={`w-full rounded-xl px-3 py-2 text-left text-sm transition ${!goalFilter ? 'bg-accent/10 text-accent font-semibold' : 'hover:bg-background'}`}
              >
                Todos ({athletes.length})
              </button>
              {catalogGoals
                .filter((g) => g.isVisible)
                .map((g) => {
                  const count = athletes.filter((a) => a.goal === g.code).length
                  return (
                    <button
                      key={g.code}
                      onClick={() => setGoalFilter(goalFilter === g.code ? '' : g.code)}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition ${goalFilter === g.code ? 'bg-accent/10 text-accent font-semibold' : 'hover:bg-background'}`}
                    >
                      <span>{g.label}</span>
                      <span className="text-foreground/40 text-xs">{count}</span>
                    </button>
                  )
                })}
            </div>

            {(search || goalFilter) && (
              <button
                onClick={() => {
                  setSearch('')
                  setGoalFilter('')
                }}
                className="border-line text-foreground/50 hover:text-foreground w-full rounded-xl border py-2 text-xs transition"
              >
                Limpiar filtros
              </button>
            )}
          </aside>

          {/* Main: lista compacta */}
          <div>
            {athletes.length === 0 ? (
              <EmptyState
                title="Sin atletas todavía"
                description="Da de alta al primer atleta desde el flujo de onboarding."
                icon="👥"
                action={
                  <Link
                    href="/athlete/onboarding"
                    className="bg-accent hover:bg-accent-strong mt-2 rounded-full px-6 py-3 text-sm font-semibold text-white transition"
                  >
                    Añadir nuevo atleta
                  </Link>
                }
                className="rounded-2xl py-20"
              />
            ) : filtered.length === 0 ? (
              <EmptyState
                title="Sin resultados"
                description="Prueba otra búsqueda o limpia los filtros."
                className="rounded-2xl py-12"
              />
            ) : (
              <>
                {viewMode === 'table' ? (
                  // TABLE VIEW
                  <div className="border-line bg-surface-strong overflow-hidden rounded-2xl border">
                    <div className="border-line text-foreground/40 hidden grid-cols-[1fr_120px_120px_auto] gap-4 border-b px-5 py-2.5 text-[11px] tracking-widest uppercase sm:grid">
                      <span>Atleta</span>
                      <span>Objetivo</span>
                      <span>Fase</span>
                      <span></span>
                    </div>
                    <div className="divide-line divide-y">
                      {filtered.map((athlete) => {
                        const goalMeta = catalogGoals.find((g) => g.code === athlete.goal)
                        return (
                          <div
                            key={athlete.id}
                            className="hover:bg-background/40 grid grid-cols-[1fr_auto] items-center gap-3 px-5 py-3.5 transition sm:grid-cols-[1fr_120px_120px_auto]"
                          >
                            {/* Name + avatar */}
                            <div className="flex items-center gap-3">
                              <div className="bg-accent/10 text-accent flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold">
                                {athlete.fullName.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm leading-tight font-semibold">
                                  {athlete.fullName}
                                </p>
                                {athlete.healthConnections.length > 0 && (
                                  <p className="text-foreground/40 text-xs">
                                    {athlete.healthConnections.join(', ')}
                                  </p>
                                )}
                              </div>
                            </div>
                            {/* Goal badge */}
                            <span
                              className={`hidden rounded-full border px-2.5 py-0.5 text-xs font-semibold sm:inline-block ${GOAL_TONES[athlete.goal] ?? 'bg-surface-strong text-foreground/50 border-line'}`}
                            >
                              {goalMeta?.label ?? athlete.goal}
                            </span>
                            {/* Phase */}
                            <span className="text-foreground/60 hidden text-xs sm:inline-block">
                              {athlete.phaseLabel}
                            </span>
                            {/* Actions */}
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/coach/athletes/${athlete.id}`}
                                className="border-line text-foreground/60 hover:text-accent rounded-lg border px-2.5 py-1 text-xs transition"
                              >
                                Ver
                              </Link>
                              <button
                                onClick={() => setEditTarget(athlete)}
                                className="border-line text-foreground/60 hover:text-accent rounded-lg border px-2.5 py-1 text-xs transition"
                              >
                                Editar
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  // LIST VIEW
                  <div className="space-y-2">
                    {filtered.map((athlete) => {
                      const goalMeta = catalogGoals.find((g) => g.code === athlete.goal)
                      return (
                        <Link
                          key={athlete.id}
                          href={`/coach/athletes/${athlete.id}`}
                          className="border-line bg-surface-strong hover:border-accent/30 hover:bg-background/50 flex items-center justify-between gap-4 rounded-2xl border p-4 transition"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="bg-accent/10 text-accent flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold">
                              {athlete.fullName.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-semibold">{athlete.fullName}</p>
                              <div className="mt-1 flex flex-wrap gap-1.5">
                                <span
                                  className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${GOAL_TONES[athlete.goal] ?? 'bg-surface text-foreground/50 border-line'}`}
                                >
                                  {goalMeta?.label ?? athlete.goal}
                                </span>
                                <span className="border-line bg-surface text-foreground/50 rounded-full border px-2 py-0.5 text-xs">
                                  {athlete.phaseLabel}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                setEditTarget(athlete)
                              }}
                              className="border-line text-foreground/60 hover:text-accent rounded-lg border px-3 py-1.5 text-xs transition"
                            >
                              ✎
                            </button>
                            <span className="text-foreground/30">→</span>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </PageShell>
    </>
  )
}
