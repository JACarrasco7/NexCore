'use client'

import { useId, useState, useEffect } from 'react'
import { SectionIntro } from '@/components/section-intro'
import { useCheckIns } from '@/lib/store'
import { useAthleteMe } from '@/lib/use-athlete-me'
import { AthleteAside } from '@/components/athlete-aside'
import type { CheckInEntry } from '@/lib/domain'

type FormState = {
  athleteId: string
  weekLabel: string
  adherencePct: string
  weightKg: string
  stepsAvg: string
  sleepHours: string
  sensations: string
  notes: string
}

function buildAutoSummary(f: FormState): string {
  const lines: string[] = []
  const a = parseFloat(f.adherencePct)
  if (!isNaN(a)) {
    lines.push(
      a >= 85
        ? `Adherencia alta (${a}%) — buen cumplimiento semanal.`
        : `Adherencia baja (${a}%) — revisar causas.`
    )
  }
  if (f.weightKg) lines.push(`Peso: ${f.weightKg} kg.`)
  if (f.sleepHours) {
    const s = parseFloat(f.sleepHours)
    lines.push(
      s >= 7.5
        ? `Sueño óptimo: ${s}h/noche.`
        : s >= 6
          ? `Sueño aceptable: ${s}h/noche (meta 8h).`
          : `Sueño insuficiente: ${s}h/noche — priorizar descanso.`
    )
  }
  if (f.stepsAvg) {
    const st = parseInt(f.stepsAvg, 10)
    lines.push(
      st >= 10000
        ? `Pasos: ${st.toLocaleString()}/día — buen NEAT.`
        : `Pasos: ${st.toLocaleString()}/día (meta 10k).`
    )
  }
  if (f.sensations.trim()) lines.push(`Sensaciones: ${f.sensations.trim()}`)
  return lines.length > 0
    ? lines.join(' ')
    : 'Rellena los campos para generar el resumen automatico.'
}

const EMPTY: FormState = {
  athleteId: '',
  weekLabel: '',
  adherencePct: '',
  weightKg: '',
  stepsAvg: '',
  sleepHours: '',
  sensations: '',
  notes: '',
}

export default function CheckInPage() {
  const formId = useId()
  const { athlete, loading: loadingMe, notFound } = useAthleteMe()
  const [preselectedAthleteId, setPreselectedAthleteId] = useState('')
  const [form, setForm] = useState<FormState>(EMPTY)
  const { addCheckIn, checkIns } = useCheckIns(form.athleteId || undefined)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const selected = params.get('athleteId') ?? ''
    if (selected) setPreselectedAthleteId(selected)
  }, [])

  // Sincronizar athleteId cuando se resuelva el perfil
  useEffect(() => {
    if (preselectedAthleteId) {
      setForm((prev) => ({ ...prev, athleteId: preselectedAthleteId }))
      return
    }
    if (athlete) setForm((prev) => ({ ...prev, athleteId: athlete.id }))
  }, [athlete, preselectedAthleteId])

  function update(key: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  async function handleSave() {
    await addCheckIn({
      id: `ci-${Date.now()}`,
      athleteId: form.athleteId,
      weekLabel: form.weekLabel || 'Semana sin etiquetar',
      date: new Date().toISOString(),
      weightKg: form.weightKg ? parseFloat(form.weightKg) : 0,
      stepsAvg: form.stepsAvg ? parseInt(form.stepsAvg, 10) : 0,
      sleepHours: form.sleepHours ? parseFloat(form.sleepHours) : 0,
      adherencePct: parseFloat(form.adherencePct) || 0,
      sensations: form.sensations,
      notes: form.notes,
    })
    setSaved(true)
  }

  const summary = buildAutoSummary(form)

  if (loadingMe) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-foreground/50 text-sm">Cargando perfil...</p>
      </main>
    )
  }

  if (notFound) {
    return (
      <main className="flex flex-1 items-center justify-center px-6">
        <div className="max-w-sm text-center">
          <p className="text-foreground/60 text-sm">No tienes un perfil de atleta aun.</p>
          <p className="text-foreground/40 mt-2 text-xs">
            Pide a tu coach que complete tu onboarding.
          </p>
        </div>
      </main>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-370 gap-6 px-6 py-8 md:px-10 lg:px-12">
      <main className="flex min-w-0 flex-1 flex-col gap-8">
        <SectionIntro
          eyebrow="Revisión semanal"
          title="Revisión periódica para el coach"
          description="Cumplimiento, sensaciones y contexto semanal para ajustar la estrategia."
        />

        <section className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
          {/* Form */}
          <article className="border-line bg-surface rounded-4xl border p-6">
            <h2 className="text-xl font-semibold">Datos de la semana</h2>
            <div className="mt-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label
                    htmlFor={`${formId}-week`}
                    className="text-foreground/70 text-sm font-medium"
                  >
                    Semana
                  </label>
                  <input
                    id={`${formId}-week`}
                    type="text"
                    value={form.weekLabel}
                    onChange={(e) => update('weekLabel', e.target.value)}
                    placeholder="Ej: Semana 4 Bloque A"
                    className="border-line bg-surface-strong focus:border-accent w-full rounded-2xl border px-4 py-2.5 text-sm transition outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor={`${formId}-adherence`}
                    className="text-foreground/70 text-sm font-medium"
                  >
                    Adherencia dieta (%)
                  </label>
                  <input
                    id={`${formId}-adherence`}
                    type="number"
                    min="0"
                    max="100"
                    value={form.adherencePct}
                    onChange={(e) => update('adherencePct', e.target.value)}
                    placeholder="Ej: 90"
                    className="border-line bg-surface-strong focus:border-accent w-full rounded-2xl border px-4 py-2.5 text-sm transition outline-none"
                  />
                </div>
              </div>

              {/* Métricas físicas */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1">
                  <label
                    htmlFor={`${formId}-weight`}
                    className="text-foreground/70 text-sm font-medium"
                  >
                    Peso (kg)
                  </label>
                  <input
                    id={`${formId}-weight`}
                    type="number"
                    step="0.1"
                    min="30"
                    max="250"
                    value={form.weightKg}
                    onChange={(e) => update('weightKg', e.target.value)}
                    placeholder="Ej: 82.5"
                    className="border-line bg-surface-strong focus:border-accent w-full rounded-2xl border px-4 py-2.5 text-sm transition outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor={`${formId}-sleep`}
                    className="text-foreground/70 text-sm font-medium"
                  >
                    Sueño prom. (h)
                  </label>
                  <input
                    id={`${formId}-sleep`}
                    type="number"
                    step="0.25"
                    min="0"
                    max="14"
                    value={form.sleepHours}
                    onChange={(e) => update('sleepHours', e.target.value)}
                    placeholder="Ej: 7.5"
                    className="border-line bg-surface-strong focus:border-accent w-full rounded-2xl border px-4 py-2.5 text-sm transition outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor={`${formId}-steps`}
                    className="text-foreground/70 text-sm font-medium"
                  >
                    Pasos/día prom.
                  </label>
                  <input
                    id={`${formId}-steps`}
                    type="number"
                    step="100"
                    min="0"
                    value={form.stepsAvg}
                    onChange={(e) => update('stepsAvg', e.target.value)}
                    placeholder="Ej: 8500"
                    className="border-line bg-surface-strong focus:border-accent w-full rounded-2xl border px-4 py-2.5 text-sm transition outline-none"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label
                  htmlFor={`${formId}-sensations`}
                  className="text-foreground/70 text-sm font-medium"
                >
                  Sensaciones generales
                </label>
                <textarea
                  id={`${formId}-sensations`}
                  rows={2}
                  value={form.sensations}
                  onChange={(e) => update('sensations', e.target.value)}
                  placeholder="Como te has sentido esta semana..."
                  className="border-line bg-surface-strong focus:border-accent w-full resize-none rounded-2xl border px-4 py-2.5 text-sm transition outline-none"
                />
              </div>
              <div className="space-y-1">
                <label
                  htmlFor={`${formId}-notes`}
                  className="text-foreground/70 text-sm font-medium"
                >
                  Notas adicionales para el coach
                </label>
                <textarea
                  id={`${formId}-notes`}
                  rows={2}
                  value={form.notes}
                  onChange={(e) => update('notes', e.target.value)}
                  placeholder="Incidencias, lesiones, viajes..."
                  className="border-line bg-surface-strong focus:border-accent w-full resize-none rounded-2xl border px-4 py-2.5 text-sm transition outline-none"
                />
              </div>
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleSave}
                  className="bg-accent hover:bg-accent-strong rounded-full px-6 py-3 text-sm font-semibold text-white transition"
                >
                  Enviar check-in
                </button>
                {saved && <span className="text-success text-sm font-medium">✓ Guardado</span>}
              </div>
            </div>
          </article>

          {/* Auto-summary */}
          <article
            className="rounded-4xl border p-6"
            style={{
              background: 'var(--card-alt-bg)',
              borderColor: 'var(--card-alt-item-border)',
              color: 'var(--card-alt-text)',
            }}
          >
            <h2 className="text-xl font-semibold">Resumen automatico</h2>
            <div
              className="mt-5 rounded-2xl p-5 text-sm leading-7"
              style={{
                border: '1px solid var(--card-alt-item-border)',
                background: 'var(--card-alt-item-bg)',
                color: 'var(--card-alt-muted)',
              }}
            >
              {summary}
            </div>

            {/* Live metric chips */}
            <div className="mt-5 grid grid-cols-2 gap-3">
              {[
                { label: 'Semana', value: form.weekLabel || '—' },
                { label: 'Adherencia', value: form.adherencePct ? `${form.adherencePct}%` : '—' },
                { label: 'Peso', value: form.weightKg ? `${form.weightKg} kg` : '—' },
                { label: 'Sueño', value: form.sleepHours ? `${form.sleepHours} h` : '—' },
                {
                  label: 'Pasos/día',
                  value: form.stepsAvg ? Number(form.stepsAvg).toLocaleString() : '—',
                },
                { label: 'Notas', value: form.notes ? 'Cargadas' : '—' },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl p-3 text-sm"
                  style={{
                    border: '1px solid var(--card-alt-item-border)',
                    background: 'var(--card-alt-item-bg)',
                  }}
                >
                  <p className="text-xs" style={{ color: 'var(--card-alt-muted)' }}>
                    {item.label}
                  </p>
                  <p className="mt-1 text-lg font-semibold">{item.value}</p>
                </div>
              ))}
            </div>
          </article>
        </section>

        {/* Check-in history with coach notes */}
        {checkIns.length > 0 && (
          <section className="border-line bg-surface rounded-4xl border p-6">
            <h2 className="mb-5 text-xl font-semibold">Historial y feedback del coach</h2>
            <ul className="space-y-3">
              {checkIns
                .slice()
                .reverse()
                .map((ci: CheckInEntry) => {
                  const adh = ci.adherencePct
                  const adhClass =
                    adh >= 80 ? 'text-success' : adh >= 60 ? 'text-warning' : 'text-danger'
                  return (
                    <li
                      key={ci.id}
                      className="border-line bg-surface-strong rounded-2xl border px-4 py-3 text-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold">{ci.weekLabel}</span>
                        <span className="text-foreground/40 text-xs">
                          {new Date(ci.date).toLocaleDateString('es-ES')}
                        </span>
                      </div>
                      <div className="text-foreground/60 mt-2 flex flex-wrap gap-3 text-xs">
                        <span className={`font-semibold ${adhClass}`}>
                          ✓ {ci.adherencePct}% adherencia
                        </span>
                        {ci.weightKg > 0 && <span>⚖ {ci.weightKg} kg</span>}
                        {ci.sleepHours > 0 && <span>😴 {ci.sleepHours}h sueño</span>}
                        {ci.stepsAvg > 0 && (
                          <span>👟 {ci.stepsAvg.toLocaleString()} pasos/día</span>
                        )}
                      </div>
                      {ci.sensations && (
                        <p className="border-line bg-surface text-foreground/50 mt-2 rounded-xl border px-3 py-2 text-xs italic">
                          &ldquo;{ci.sensations}&rdquo;
                        </p>
                      )}
                      {ci.coachNote && (
                        <div className="border-accent/20 bg-accent/5 mt-2 rounded-xl border px-3 py-2">
                          <p className="text-accent/80 mb-1 text-xs font-semibold">
                            Nota del coach
                          </p>
                          <p className="text-foreground/70 text-xs">{ci.coachNote}</p>
                        </div>
                      )}
                    </li>
                  )
                })}
            </ul>
          </section>
        )}
      </main>
      <AthleteAside />
    </div>
  )
}
