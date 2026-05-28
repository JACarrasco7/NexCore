'use client'
export const dynamic = 'force-dynamic'

import { Suspense, useEffect, useId, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useForm, FormProvider, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { SectionIntro } from '@/components/section-intro'
import { FormField } from '@/components/ui/form-field'
import { useAthleteMe } from '@/lib/use-athlete-me'
import { useDailyLogs } from '@/lib/store'
import { Sparkline } from '@/components/sparkline'
import { AthleteAside } from '@/components/athlete-aside'
import type { DailyLogEntry } from '@/lib/domain'

const dailyLogFormSchema = z.object({
  athleteId: z.string(),
  weightKg: z.string(),
  steps: z.string(),
  sleepHours: z.string(),
  waistCm: z.string(),
  bodyFatPct: z.string(),
  notes: z.string(),
})

type DailyLogFormValues = z.infer<typeof dailyLogFormSchema>

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-line bg-surface rounded-2xl border p-3 text-sm">
      <p className="text-foreground/50 text-xs">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  )
}

function DailyLogContent() {
  const formId = useId()
  const searchParams = useSearchParams()
  const preselectedAthleteId = searchParams.get('athleteId') ?? ''
  const { athlete, loading: loadingMe, notFound } = useAthleteMe()

  const methods = useForm<DailyLogFormValues>({
    resolver: zodResolver(dailyLogFormSchema),
    defaultValues: {
      athleteId: '',
      weightKg: '',
      steps: '',
      sleepHours: '',
      waistCm: '',
      bodyFatPct: '',
      notes: '',
    },
  })

  const {
    handleSubmit,
    setValue,
    watch,
    control,
    resetField,
    formState: { isSubmitting },
  } = methods
  const athleteId = preselectedAthleteId || watch('athleteId')
  const { dailyLogs, addDailyLog } = useDailyLogs(athleteId || undefined)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (preselectedAthleteId) {
      setValue('athleteId', preselectedAthleteId)
      return
    }
    if (athlete?.id) {
      setValue('athleteId', athlete.id)
    }
  }, [athlete?.id, preselectedAthleteId, setValue])

  async function onSubmit(data: DailyLogFormValues) {
    if (!data.athleteId) return
    await addDailyLog({
      id: `dl-${Date.now()}`,
      athleteId: data.athleteId,
      date: new Date().toISOString(),
      weightKg: data.weightKg ? parseFloat(data.weightKg) : null,
      steps: data.steps ? parseInt(data.steps, 10) : null,
      sleepHours: data.sleepHours ? parseFloat(data.sleepHours) : null,
      waistCm: data.waistCm ? parseFloat(data.waistCm) : null,
      bodyFatPct: data.bodyFatPct ? parseFloat(data.bodyFatPct) : null,
      notes: data.notes,
    })
    setSaved(true)
    resetField('notes')
  }

  if (loadingMe && !preselectedAthleteId) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-foreground/50 text-sm">Cargando perfil...</p>
      </main>
    )
  }

  if (notFound && !preselectedAthleteId) {
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
            eyebrow="Registro diario"
            title="Métricas rápidas del día"
            description="Peso, pasos, sueño y medidas para seguimiento de tendencia diaria."
          />

          <section className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
            <article className="border-line bg-surface rounded-4xl border p-6">
              <h2 className="text-xl font-semibold">Nuevo registro</h2>
              <form id={formId} onSubmit={handleSubmit(onSubmit)}>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <FormField
                    name="weightKg"
                    label="Peso (kg)"
                    type="number"
                    placeholder="Ej: 82.4"
                  />
                  <FormField name="steps" label="Pasos" type="number" placeholder="Ej: 9000" />
                  <FormField
                    name="sleepHours"
                    label="Sueño (h)"
                    type="number"
                    placeholder="Ej: 7.5"
                  />
                  <FormField
                    name="waistCm"
                    label="Cintura (cm)"
                    type="number"
                    placeholder="Ej: 84"
                  />
                  <FormField
                    name="bodyFatPct"
                    label="Grasa corporal (%)"
                    type="number"
                    placeholder="Ej: 16.8"
                    className="sm:col-span-2"
                  />
                  <FormField
                    name="notes"
                    label="Notas"
                    type="textarea"
                    placeholder="Observaciones breves del día..."
                    className="sm:col-span-2"
                  />
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-accent hover:bg-accent-strong rounded-full px-6 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50"
                  >
                    {isSubmitting ? 'Guardando...' : 'Guardar registro'}
                  </button>
                  {saved && <span className="text-success text-sm font-medium">✓ Guardado</span>}
                </div>
              </form>
            </article>

            <SummarySidebar control={control} />
          </section>

          {dailyLogs.length > 0 && (
            <section className="border-line bg-surface rounded-4xl border p-6">
              <h2 className="mb-1 text-xl font-semibold">Historial diario</h2>
              {/* Sparkline tendencia de peso */}
              {(() => {
                const sorted = dailyLogs
                  .slice()
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                const weightData = sorted
                  .map((l) => l.weightKg)
                  .filter((v): v is number => v !== null && v !== undefined)
                if (weightData.length < 2) return null
                const first = weightData[0]
                const last = weightData[weightData.length - 1]
                const minW = Math.min(...weightData)
                const maxW = Math.max(...weightData)
                const diff = +(last - first).toFixed(1)
                const diffLabel = diff > 0 ? `+${diff}` : String(diff)
                const diffColor =
                  diff < 0 ? 'text-success' : diff > 0 ? 'text-warning' : 'text-foreground/50'
                const firstDate = sorted[0]?.date
                  ? new Date(sorted[0].date).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'short',
                    })
                  : ''
                const lastDate = sorted[sorted.length - 1]?.date
                  ? new Date(sorted[sorted.length - 1].date).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'short',
                    })
                  : ''
                return (
                  <div className="border-line bg-surface-strong mt-4 mb-5 space-y-3 rounded-2xl border p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-foreground/50 text-xs tracking-widest uppercase">
                          Tendencia de peso
                        </p>
                        <p className="mt-1 text-3xl font-bold tabular-nums">
                          {last} <span className="text-foreground/40 text-sm font-normal">kg</span>
                        </p>
                        <p className={`text-xs font-semibold ${diffColor}`}>
                          {diffLabel} kg vs inicio
                        </p>
                      </div>
                      <div className="text-foreground/40 space-y-1 text-right text-xs">
                        <p>
                          Máx: <span className="text-warning font-semibold">{maxW} kg</span>
                        </p>
                        <p>
                          Mín: <span className="text-success font-semibold">{minW} kg</span>
                        </p>
                        <p>{weightData.length} mediciones</p>
                      </div>
                    </div>
                    <Sparkline
                      data={weightData}
                      width={600}
                      height={60}
                      color="var(--accent)"
                      fill="var(--accent-soft)"
                      className="w-full"
                    />
                    <div className="text-foreground/35 flex justify-between text-xs">
                      <span>{firstDate}</span>
                      <span>{lastDate}</span>
                    </div>
                  </div>
                )
              })()}
              <ul className="space-y-3">
                {dailyLogs
                  .slice()
                  .reverse()
                  .map((log: DailyLogEntry) => (
                    <li
                      key={log.id}
                      className="border-line bg-surface-strong rounded-2xl border px-4 py-3 text-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold">
                          {new Date(log.date).toLocaleDateString('es-ES', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                        <span className="text-foreground/40 text-xs">Registro diario</span>
                      </div>
                      <div className="text-foreground/60 mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                        <span>⚖️ {log.weightKg ?? '—'} kg</span>
                        <span>👟 {log.steps?.toLocaleString('es-ES') ?? '—'} pasos</span>
                        <span>😴 {log.sleepHours ?? '—'} h sueño</span>
                        <span>📏 {log.waistCm ?? '—'} cm cintura</span>
                      </div>
                      {log.notes && (
                        <p className="border-line bg-surface text-foreground/60 mt-2 rounded-xl border px-3 py-2 text-xs">
                          {log.notes}
                        </p>
                      )}
                    </li>
                  ))}
              </ul>
            </section>
          )}
        </main>
        <AthleteAside />
      </div>
    </FormProvider>
  )
}

function SummarySidebar({ control }: { control: any }) {
  const form = useWatch({ control }) as DailyLogFormValues

  return (
    <article className="border-line bg-surface-strong rounded-4xl border p-6">
      <h2 className="text-xl font-semibold">Resumen hoy</h2>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <MetricCard label="Peso" value={form.weightKg ? `${form.weightKg} kg` : '—'} />
        <MetricCard
          label="Pasos"
          value={form.steps ? Number(form.steps).toLocaleString('es-ES') : '—'}
        />
        <MetricCard label="Sueño" value={form.sleepHours ? `${form.sleepHours} h` : '—'} />
        <MetricCard label="Grasa" value={form.bodyFatPct ? `${form.bodyFatPct}%` : '—'} />
      </div>
    </article>
  )
}

export default function DailyLogPage() {
  return (
    <Suspense
      fallback={
        <main className="flex flex-1 items-center justify-center">
          <p className="text-foreground/50 text-sm">Cargando...</p>
        </main>
      }
    >
      <DailyLogContent />
    </Suspense>
  )
}
