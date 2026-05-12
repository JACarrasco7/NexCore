'use client'

import Link from 'next/link'
import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { PageShell } from '@/components/layout'
import { SectionIntro } from '@/components/section-intro'
import { importDelimitedTrainingPlan } from '@/lib/plan-import'
import { useAthletes, useTrainingPlans } from '@/lib/store'
import { useCoachMe } from '@/lib/use-coach-me'
import { TECHNIQUE_LABELS } from '@/lib/domain'
import type { HighIntensityTechnique } from '@/lib/domain'
import type { ImportedPlanResult } from '@/lib/plan-import'

const DEFAULT_INPUT = `sesion;ejercicio;series;repeticiones;rir;descanso;carga_kg;carga_nota;tecnica;tecnica_detalle;tempo_exc;tempo_pausa;tempo_conc;cue;progresion;notas
Torso A;Press banca;4;6-8;2;150;90;75% RM;;;3;1;1;Codos 45 grados, no tocar el pecho. Escapulas retraidas todo el tiempo.;Si mayor de 8 reps con esa carga sumar 2.5 kg la semana siguiente;Top set con video obligatorio
Torso A;Remo con barra;4;8-10;2;120;80;;drop_set;2 drops de -10 kg sin descanso;;1;;Pecho al banco, no redondear lumbar. Tiron desde el codo.;Progresa en carga si adherencia mayor de 80%;Controlar lumbar, video cada 2 semanas
Torso A;Press inclinado mancuerna;3;10-12;1;90;;;rest_pause;Pausa 15s, 2 mini-sets adicionales;;;1;Trayectoria en arco, no recta. Manos neutras.;;Ultima serie cerca del fallo
Pierna A;Sentadilla;4;5-8;2;180;100;80% RM;;;;;;Rodillas en linea con pies, pecho arriba, mirada al frente;+2.5 kg si tecnica perfecta en las 4 series;Mantener tecnica, grabar vista lateral
Pierna A;Prensa 45;3;10-12;1;120;;;myo_reps;Activacion + 3-5 clusters de 3 reps;;1;;Recorrido completo, no bloquear rodillas;Anadir cluster si adherencia >90%;Control total en la bajada
Pierna A;Peso muerto rumano;3;8-10;2;150;70;;tempo;3-1-1 estricto;3;1;1;Bisagra de cadera, no squat. Sentir los isquios.;Progresa en carga solo si mantiene el tempo;No perder tension, pausa 1s abajo`

const TECHNIQUE_COLORS: Record<string, string> = {
  drop_set: 'bg-red-900/30 text-red-300 border-red-700/40',
  rest_pause: 'bg-amber-900/30 text-amber-300 border-amber-700/40',
  myo_reps: 'bg-violet-900/30 text-violet-300 border-violet-700/40',
  super_set: 'bg-emerald-900/30 text-emerald-300 border-emerald-700/40',
  giant_set: 'bg-emerald-900/30 text-emerald-300 border-emerald-700/40',
  cluster: 'bg-amber-900/30 text-amber-300 border-amber-700/40',
  tempo: 'bg-slate-700/30 text-slate-300 border-slate-600/40',
  pre_fatiga: 'bg-red-900/30 text-red-300 border-red-700/40',
  eccentrico: 'bg-slate-700/30 text-slate-300 border-slate-600/40',
  isometrico: 'bg-slate-700/30 text-slate-300 border-slate-600/40',
  amrap: 'bg-red-900/30 text-red-300 border-red-700/40',
}

function ImportLabContent() {
  const searchParams = useSearchParams()
  const preselectedAthleteId = searchParams.get('athleteId') ?? ''

  const { coach } = useCoachMe()
  const { athletes } = useAthletes(coach?.id)
  const { addPlan } = useTrainingPlans()
  const [raw, setRaw] = useState(DEFAULT_INPUT)
  const [selectedAthleteId, setSelectedAthleteId] = useState(preselectedAthleteId)
  const [weekLabel, setWeekLabel] = useState('Semana 1')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  let result: ImportedPlanResult | null = null
  let parseError = ''
  try {
    result = raw.trim() ? importDelimitedTrainingPlan(raw) : null
  } catch (e) {
    parseError = (e as Error).message
  }

  async function handleSave() {
    if (!result || !selectedAthleteId) return
    setSaving(true)
    await addPlan({
      ...result.plan,
      id: `plan-${Date.now()}`,
      athleteId: selectedAthleteId,
      title: `Plan importado — ${weekLabel}`,
      weekLabel,
    })
    setSaving(false)
    setSaved(true)
  }

  return (
    <PageShell>
      <SectionIntro
        eyebrow="Import CSV"
        title="Importación de rutinas"
        description="CSV/TSV con soporte para tecnicas de alta intensidad, tempo, cues tecnicos y criterios de progresion."
        aside={
          result ? `${result.detectedDelimiter} · ${result.rows.length} ejercicios` : undefined
        }
      />

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="border-accent/30 bg-accent/10 text-accent rounded-full border px-4 py-1.5">
          Import entrenamiento
        </span>
        <Link
          href="/coach/import-lab/nutrition"
          className="border-line text-foreground/70 hover:border-accent/30 hover:text-accent rounded-full border px-4 py-1.5"
        >
          Import nutrición
        </Link>
      </div>

      {/* Column reference */}
      <details className="border-line bg-surface-strong rounded-3xl border">
        <summary className="text-foreground/70 hover:text-foreground cursor-pointer px-5 py-3 text-sm font-medium select-none">
          Referencia de columnas del CSV
        </summary>
        <div className="px-5 pb-5">
          <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-3">
            {[
              { col: 'sesion', desc: 'Nombre de la sesion (agrupa ejercicios)' },
              { col: 'ejercicio', desc: 'Nombre del ejercicio' },
              { col: 'series', desc: 'Numero de series (ej. 4)' },
              { col: 'repeticiones', desc: 'Rango de reps (ej. 6-8 o 10)' },
              { col: 'rir', desc: 'Reps In Reserve objetivo (ej. 2)' },
              { col: 'descanso', desc: 'Descanso entre series en segundos' },
              { col: 'carga_kg', desc: 'Carga sugerida en kg' },
              { col: 'carga_nota', desc: 'Nota de intensidad (ej. 75% RM)' },
              {
                col: 'tecnica',
                desc: 'drop_set, rest_pause, myo_reps, super_set, giant_set, cluster, tempo, pre_fatiga, eccentrico, isometrico, amrap',
              },
              { col: 'tecnica_detalle', desc: 'Descripcion detallada de la tecnica aplicada' },
              { col: 'tempo_exc', desc: 'Fase excentrica en seg (ej. 3)' },
              { col: 'tempo_pausa', desc: 'Pausa abajo en seg (ej. 1)' },
              { col: 'tempo_conc', desc: 'Fase concentrica en seg (ej. 1)' },
              { col: 'cue', desc: 'Indicacion verbal tecnica del coach' },
              { col: 'progresion', desc: 'Criterio de progresion de carga/volumen' },
              { col: 'notas', desc: 'Notas adicionales de la sesion' },
            ].map(({ col, desc }) => (
              <div key={col} className="border-line bg-surface rounded-xl border px-3 py-2">
                <code className="text-accent font-semibold">{col}</code>
                <p className="text-foreground/50 mt-0.5 leading-tight">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </details>

      <section className="grid gap-6 xl:grid-cols-2">
        {/* Input panel */}
        <article className="border-line bg-surface flex flex-col gap-4 rounded-4xl border p-6">
          <h2 className="text-xl font-semibold">Entrada CSV</h2>
          <textarea
            rows={14}
            value={raw}
            onChange={(e) => {
              setRaw(e.target.value)
              setSaved(false)
            }}
            spellCheck={false}
            className="border-line bg-surface-strong text-foreground/80 focus:border-accent w-full resize-y rounded-3xl border px-4 py-3 font-mono text-xs leading-6 transition outline-none"
          />

          {parseError && (
            <div className="rounded-2xl border border-red-400/30 bg-red-900/10 px-4 py-3 text-sm text-red-400">
              {parseError}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-foreground/60 text-xs font-medium">Atleta destino</label>
              <select
                value={selectedAthleteId}
                onChange={(e) => setSelectedAthleteId(e.target.value)}
                className="border-line bg-surface-strong focus:border-accent w-full rounded-2xl border px-3 py-2.5 text-sm transition outline-none"
              >
                <option value="">— Selecciona atleta —</option>
                {athletes.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.fullName}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-foreground/60 text-xs font-medium">Etiqueta de semana</label>
              <input
                type="text"
                value={weekLabel}
                onChange={(e) => setWeekLabel(e.target.value)}
                className="border-line bg-surface-strong focus:border-accent w-full rounded-2xl border px-3 py-2.5 text-sm transition outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleSave}
              disabled={!result || saving || !selectedAthleteId}
              className="bg-accent hover:bg-accent-strong rounded-full px-6 py-3 text-sm font-semibold text-white transition disabled:pointer-events-none disabled:opacity-40"
            >
              {saving ? 'Guardando...' : 'Guardar plan'}
            </button>
            {saved && <span className="text-sm font-medium text-green-400">Plan guardado</span>}
            {!selectedAthleteId && result && (
              <span className="text-foreground/40 text-xs">Selecciona un atleta para guardar</span>
            )}
          </div>
        </article>

        {/* Output panel — siempre oscuro: es un panel de código tipo terminal */}
        <article className="max-h-[80vh] overflow-auto rounded-4xl border border-slate-700/50 bg-slate-950 p-6 text-slate-100">
          <h2 className="mb-5 text-xl font-semibold">Vista previa del plan</h2>
          {!result ? (
            <p className="text-sm text-slate-400">
              Pega contenido en el panel izquierdo para ver el resultado.
            </p>
          ) : (
            <div className="space-y-6">
              {result.plan.sessions.map((session) => (
                <div
                  key={session.id}
                  className="rounded-3xl border border-slate-700/50 bg-slate-900/60 p-5"
                >
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <h3 className="text-base font-bold">{session.name}</h3>
                    <span className="shrink-0 rounded-full border border-slate-600/50 px-3 py-1 text-xs tracking-widest text-slate-400 uppercase">
                      {session.exercises.length} ejercicios
                    </span>
                  </div>
                  <div className="space-y-3">
                    {session.exercises.map((ex, ei) => {
                      const techKey = ex.technique as HighIntensityTechnique
                      const techColor =
                        TECHNIQUE_COLORS[techKey] ??
                        'bg-slate-700/30 text-slate-300 border-slate-600/40'
                      const hasTempoFull = ex.tempoEcc && ex.tempoConc
                      const tempoStr = hasTempoFull
                        ? `${ex.tempoEcc ?? 'X'}-${ex.tempoPause ?? '0'}-${ex.tempoConc ?? 'X'}`
                        : null

                      return (
                        <div
                          key={ei}
                          className="space-y-2 rounded-2xl border border-slate-700/40 bg-slate-900/50 p-4"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-bold text-white">{ex.exercise}</span>
                            {ex.technique && (
                              <span
                                className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${techColor}`}
                              >
                                {TECHNIQUE_LABELS[techKey] ?? ex.technique}
                              </span>
                            )}
                            {ex.videoUrl && (
                              <a
                                href={ex.videoUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="ml-auto shrink-0 text-xs text-violet-400 hover:underline"
                              >
                                Demo
                              </a>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-1.5 text-xs">
                            <span className="rounded bg-slate-700/60 px-2.5 py-1 font-mono font-semibold text-white">
                              {ex.sets} x {ex.reps}
                            </span>
                            {ex.targetRir !== undefined && (
                              <span className="rounded bg-slate-700/60 px-2.5 py-1 text-slate-300">
                                RIR {ex.targetRir}
                              </span>
                            )}
                            {ex.loadKg && (
                              <span className="rounded bg-slate-700/60 px-2.5 py-1 text-slate-300">
                                {ex.loadKg} kg{ex.loadNote ? ` · ${ex.loadNote}` : ''}
                              </span>
                            )}
                            {tempoStr && (
                              <span className="rounded bg-slate-700/60 px-2.5 py-1 font-mono text-slate-300">
                                Tempo {tempoStr}
                              </span>
                            )}
                            {ex.restSeconds && (
                              <span className="rounded bg-slate-700/60 px-2.5 py-1 text-slate-300">
                                {ex.restSeconds}s descanso
                              </span>
                            )}
                          </div>

                          {ex.techniqueDetail && (
                            <div className="rounded-xl border border-red-700/40 bg-red-900/20 px-3 py-2 text-xs text-red-300">
                              {ex.techniqueDetail}
                            </div>
                          )}

                          {ex.coachCue && (
                            <div className="rounded-xl border border-slate-600/30 bg-slate-800/50 px-3 py-2 text-xs text-slate-400 italic">
                              &ldquo;{ex.coachCue}&rdquo;
                            </div>
                          )}

                          {ex.progressionNote && (
                            <div className="rounded-xl border border-emerald-700/30 bg-emerald-900/15 px-3 py-2 text-xs text-emerald-300">
                              {ex.progressionNote}
                            </div>
                          )}

                          {ex.notes && <p className="text-xs text-slate-400/70">{ex.notes}</p>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>
    </PageShell>
  )
}

export default function ImportLabPage() {
  return (
    <Suspense
      fallback={
        <PageShell className="max-w-2xl">
          <p className="text-foreground/50">Cargando...</p>
        </PageShell>
      }
    >
      <ImportLabContent />
    </Suspense>
  )
}
