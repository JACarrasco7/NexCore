'use client'

import { useId, useState, useEffect } from 'react'
import { useForm, FormProvider, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { SectionIntro } from '@/components/section-intro'
import { FormField } from '@/components/ui/form-field'
import { useCheckIns } from '@/lib/store'
import { useAthleteMe } from '@/lib/use-athlete-me'
import { AthleteAside } from '@/components/athlete-aside'
import type { CheckInEntry } from '@/lib/domain'

const checkInFormSchema = z.object({
  athleteId: z.string(),
  weekLabel: z.string(),
  adherencePct: z.string(),
  weightKg: z.string(),
  stepsAvg: z.string(),
  sleepHours: z.string(),
  sensations: z.string(),
  notes: z.string(),
})

type CheckInFormValues = z.infer<typeof checkInFormSchema>

function buildAutoSummary(f: CheckInFormValues): string {
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

function SummarySidebar({ control }: { control: any }) {
  const form = useWatch({ control }) as CheckInFormValues
  const summary = buildAutoSummary(form)

  return (
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
  )
}

export default function CheckInPage() {
  const formId = useId()
  const { athlete, loading: loadingMe, notFound } = useAthleteMe()
  const [preselectedAthleteId, setPreselectedAthleteId] = useState('')

  const methods = useForm<CheckInFormValues>({
    resolver: zodResolver(checkInFormSchema),
    defaultValues: {
      athleteId: '',
      weekLabel: '',
      adherencePct: '',
      weightKg: '',
      stepsAvg: '',
      sleepHours: '',
      sensations: '',
      notes: '',
    },
  })

  const {
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { isSubmitting },
  } = methods
  const currentAthleteId = watch('athleteId')
  const { addCheckIn, checkIns } = useCheckIns(currentAthleteId || undefined)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const selected = params.get('athleteId') ?? ''
    if (selected) setPreselectedAthleteId(selected)
  }, [])

  useEffect(() => {
    if (preselectedAthleteId) {
      setValue('athleteId', preselectedAthleteId)
      return
    }
    if (athlete) setValue('athleteId', athlete.id)
  }, [athlete, preselectedAthleteId, setValue])

  async function onSubmit(data: CheckInFormValues) {
    await addCheckIn({
      id: `ci-${Date.now()}`,
      athleteId: data.athleteId,
      weekLabel: data.weekLabel || 'Semana sin etiquetar',
      date: new Date().toISOString(),
      weightKg: data.weightKg ? parseFloat(data.weightKg) : 0,
      stepsAvg: data.stepsAvg ? parseInt(data.stepsAvg, 10) : 0,
      sleepHours: data.sleepHours ? parseFloat(data.sleepHours) : 0,
      adherencePct: parseFloat(data.adherencePct) || 0,
      sensations: data.sensations,
      notes: data.notes,
    })
    setSaved(true)
  }

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
    <FormProvider {...methods}>
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
              <form id={formId} onSubmit={handleSubmit(onSubmit)}>
                <div className="mt-5 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      name="weekLabel"
                      label="Semana"
                      placeholder="Ej: Semana 4 Bloque A"
                    />
                    <FormField
                      name="adherencePct"
                      label="Adherencia dieta (%)"
                      type="number"
                      placeholder="Ej: 90"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <FormField
                      name="weightKg"
                      label="Peso (kg)"
                      type="number"
                      placeholder="Ej: 82.5"
                    />
                    <FormField
                      name="sleepHours"
                      label="Sueño prom. (h)"
                      type="number"
                      placeholder="Ej: 7.5"
                    />
                    <FormField
                      name="stepsAvg"
                      label="Pasos/día prom."
                      type="number"
                      placeholder="Ej: 8500"
                    />
                  </div>

                  <FormField
                    name="sensations"
                    label="Sensaciones generales"
                    type="textarea"
                    placeholder="Como te has sentido esta semana..."
                  />
                  <FormField
                    name="notes"
                    label="Notas adicionales para el coach"
                    type="textarea"
                    placeholder="Incidencias, lesiones, viajes..."
                  />

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-accent hover:bg-accent-strong rounded-full px-6 py-3 text-sm font-semibold text-white transition disabled:opacity-50"
                    >
                      {isSubmitting ? 'Enviando...' : 'Enviar check-in'}
                    </button>
                    {saved && <span className="text-success text-sm font-medium">✓ Guardado</span>}
                  </div>
                </div>
              </form>
            </article>

            <SummarySidebar control={control} />
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
    </FormProvider>
  )
}
