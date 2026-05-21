'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PageShell } from '@/components/layout'
import { SectionIntro } from '@/components/section-intro'
import { useToast } from '@/components/ui/toast'
import { ExerciseSearch } from '@/components/exercise-search'
import { apiFetch } from '@/lib/store'

// ─── tipos locales ────────────────────────────────────────────────────────────

type LocalExercise = {
  exercise: string
  sets: number
  reps: string
  targetRir?: string
  restSeconds?: number
  notes?: string
  loadKg?: number
  loadNote?: string
  coachCue?: string
  progressionNote?: string
}

type LocalSession = {
  name: string
  exercises: LocalExercise[]
}

type PlanDraft = {
  title: string
  weekLabel: string
  athleteId: string
  block: string
  sessions: LocalSession[]
}

// ─── step components ──────────────────────────────────────────────────────────

function Step1({
  draft,
  onChange,
}: {
  draft: PlanDraft
  onChange: (d: Partial<PlanDraft>) => void
}) {
  return (
    <div className="space-y-5">
      <div>
        <label className="text-foreground/80 mb-1.5 block text-sm font-medium">
          Nombre del plan
        </label>
        <input
          className="border-line bg-surface-strong focus:ring-accent w-full rounded-2xl border px-4 py-3 text-sm focus:ring-1 focus:outline-none"
          placeholder="Ej. PPL Volumen - Semana 1"
          value={draft.title}
          onChange={(e) => onChange({ title: e.target.value })}
        />
      </div>
      <div>
        <label className="text-foreground/80 mb-1.5 block text-sm font-medium">
          Etiqueta de semana
        </label>
        <input
          className="border-line bg-surface-strong focus:ring-accent w-full rounded-2xl border px-4 py-3 text-sm focus:ring-1 focus:outline-none"
          placeholder="Ej. Semana 1"
          value={draft.weekLabel}
          onChange={(e) => onChange({ weekLabel: e.target.value })}
        />
      </div>
      <div>
        <label className="text-foreground/80 mb-1.5 block text-sm font-medium">
          Bloque (aplicado a todas las sesiones)
        </label>
        <input
          className="border-line bg-surface-strong focus:ring-accent w-full rounded-2xl border px-4 py-3 text-sm focus:ring-1 focus:outline-none"
          placeholder="Ej. Bloque A"
          value={draft.block}
          onChange={(e) => onChange({ block: e.target.value })}
        />
      </div>
    </div>
  )
}

function ExerciseRow({
  ex,
  onChange,
  onRemove,
}: {
  ex: LocalExercise
  onChange: (patch: Partial<LocalExercise>) => void
  onRemove: () => void
}) {
  return (
    <div className="border-line bg-surface rounded-3xl border p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex-1">
          <ExerciseSearch
            onSelect={(name) => onChange({ exercise: name })}
            showFavorites={false}
          />
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="border-danger/30 bg-danger/5 text-danger hover:bg-danger/10 rounded-xl border px-3 py-2 text-xs transition"
        >
          Quitar
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <label className="text-foreground/50 mb-1 block text-xs">Series</label>
          <input
            type="number"
            min={1}
            className="border-line bg-surface-strong focus:ring-accent w-full rounded-xl border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
            value={ex.sets}
            onChange={(e) => onChange({ sets: Number(e.target.value) })}
          />
        </div>
        <div>
          <label className="text-foreground/50 mb-1 block text-xs">Reps</label>
          <input
            className="border-line bg-surface-strong focus:ring-accent w-full rounded-xl border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
            placeholder="8-10"
            value={ex.reps}
            onChange={(e) => onChange({ reps: e.target.value })}
          />
        </div>
        <div>
          <label className="text-foreground/50 mb-1 block text-xs">RIR objetivo</label>
          <input
            className="border-line bg-surface-strong focus:ring-accent w-full rounded-xl border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
            placeholder="2"
            value={ex.targetRir ?? ''}
            onChange={(e) => onChange({ targetRir: e.target.value || undefined })}
          />
        </div>
        <div>
          <label className="text-foreground/50 mb-1 block text-xs">Descanso (seg)</label>
          <input
            type="number"
            min={0}
            className="border-line bg-surface-strong focus:ring-accent w-full rounded-xl border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
            placeholder="90"
            value={ex.restSeconds ?? ''}
            onChange={(e) =>
              onChange({ restSeconds: e.target.value ? Number(e.target.value) : undefined })
            }
          />
        </div>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-foreground/50 mb-1 block text-xs">Carga sugerida (kg)</label>
          <input
            type="number"
            min={0}
            className="border-line bg-surface-strong focus:ring-accent w-full rounded-xl border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
            placeholder="80"
            value={ex.loadKg ?? ''}
            onChange={(e) =>
              onChange({ loadKg: e.target.value ? Number(e.target.value) : undefined })
            }
          />
        </div>
        <div>
          <label className="text-foreground/50 mb-1 block text-xs">Nota de carga</label>
          <input
            className="border-line bg-surface-strong focus:ring-accent w-full rounded-xl border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
            placeholder="75% RM / RPE 8"
            value={ex.loadNote ?? ''}
            onChange={(e) => onChange({ loadNote: e.target.value || undefined })}
          />
        </div>
        <div>
          <label className="text-foreground/50 mb-1 block text-xs">Coach cue</label>
          <input
            className="border-line bg-surface-strong focus:ring-accent w-full rounded-xl border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
            placeholder="Codos 45 grados"
            value={ex.coachCue ?? ''}
            onChange={(e) => onChange({ coachCue: e.target.value || undefined })}
          />
        </div>
        <div>
          <label className="text-foreground/50 mb-1 block text-xs">Criterio de progresion</label>
          <input
            className="border-line bg-surface-strong focus:ring-accent w-full rounded-xl border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
            placeholder="Si >8 reps, +2.5 kg"
            value={ex.progressionNote ?? ''}
            onChange={(e) => onChange({ progressionNote: e.target.value || undefined })}
          />
        </div>
      </div>
      <div className="mt-3">
        <label className="text-foreground/50 mb-1 block text-xs">Notas</label>
        <textarea
          rows={2}
          className="border-line bg-surface-strong focus:ring-accent w-full rounded-xl border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
          placeholder="Tecnica, variantes..."
          value={ex.notes ?? ''}
          onChange={(e) => onChange({ notes: e.target.value || undefined })}
        />
      </div>
    </div>
  )
}

function Step2({
  draft,
  onChange,
}: {
  draft: PlanDraft
  onChange: (d: Partial<PlanDraft>) => void
}) {
  function addSession() {
    onChange({
      sessions: [
        ...draft.sessions,
        { name: `Sesion ${draft.sessions.length + 1}`, exercises: [] },
      ],
    })
  }

  function removeSession(si: number) {
    onChange({ sessions: draft.sessions.filter((_, i) => i !== si) })
  }

  function updateSession(si: number, patch: Partial<LocalSession>) {
    onChange({ sessions: draft.sessions.map((s, i) => (i === si ? { ...s, ...patch } : s)) })
  }

  function addExercise(si: number) {
    const sessions = [...draft.sessions]
    sessions[si] = {
      ...sessions[si],
      exercises: [...sessions[si].exercises, { exercise: '', sets: 3, reps: '8-10' }],
    }
    onChange({ sessions })
  }

  function updateExercise(si: number, ei: number, patch: Partial<LocalExercise>) {
    const sessions = [...draft.sessions]
    sessions[si] = {
      ...sessions[si],
      exercises: sessions[si].exercises.map((e, i) => (i === ei ? { ...e, ...patch } : e)),
    }
    onChange({ sessions })
  }

  function removeExercise(si: number, ei: number) {
    const sessions = [...draft.sessions]
    sessions[si] = {
      ...sessions[si],
      exercises: sessions[si].exercises.filter((_, i) => i !== ei),
    }
    onChange({ sessions })
  }

  return (
    <div className="space-y-6">
      {draft.sessions.length === 0 && (
        <p className="border-line bg-surface-strong text-foreground/50 rounded-3xl border px-5 py-6 text-sm">
          Sin sesiones. Pulsa "Agregar sesion" para empezar.
        </p>
      )}
      {draft.sessions.map((s, si) => (
        <div key={si} className="border-line bg-surface-strong rounded-3xl border p-5">
            <div className="mb-4 flex items-center gap-3">
            <input
              className="border-line bg-surface focus:ring-accent flex-1 rounded-xl border px-3 py-2 text-sm font-semibold focus:ring-1 focus:outline-none"
              value={s.name}
              onChange={(e) => updateSession(si, { name: e.target.value })}
              placeholder="Nombre de la sesion"
            />
            <button
              type="button"
              onClick={() => removeSession(si)}
              className="border-danger/30 bg-danger/5 text-danger hover:bg-danger/10 rounded-xl border px-3 py-2 text-xs transition"
            >
              Borrar
            </button>
          </div>
          <div className="space-y-3">
            {s.exercises.map((ex, ei) => (
              <ExerciseRow
                key={ei}
                ex={ex}
                onChange={(patch) => updateExercise(si, ei, patch)}
                onRemove={() => removeExercise(si, ei)}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => addExercise(si)}
            className="border-accent/30 bg-accent/5 text-accent hover:bg-accent/10 mt-4 rounded-2xl border px-4 py-2 text-sm font-medium transition"
          >
            + Ejercicio
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addSession}
        className="border-line text-foreground/60 hover:border-accent/40 hover:text-accent w-full rounded-3xl border border-dashed py-4 text-sm transition"
      >
        + Agregar sesion
      </button>
    </div>
  )
}

type Athlete = { id: string; fullName: string }

function Step3({
  draft,
  athletes,
  onChange,
}: {
  draft: PlanDraft
  athletes: Athlete[]
  onChange: (d: Partial<PlanDraft>) => void
}) {
  return (
    <div className="space-y-5">
      <div>
        <label className="text-foreground/80 mb-2 block text-sm font-medium">
          Asignar a atleta
        </label>
        <select
          className="border-line bg-surface-strong focus:ring-accent w-full rounded-2xl border px-4 py-3 text-sm focus:ring-1 focus:outline-none"
          value={draft.athleteId}
          onChange={(e) => onChange({ athleteId: e.target.value })}
        >
          <option value="">— Selecciona un atleta —</option>
          {athletes.map((a) => (
            <option key={a.id} value={a.id}>
              {a.fullName}
            </option>
          ))}
        </select>
      </div>
      <div className="border-line bg-surface-strong rounded-3xl border p-5">
        <p className="text-foreground/45 mb-1 text-xs">Resumen del plan</p>
        <p className="text-foreground font-semibold">{draft.title || '(sin nombre)'}</p>
        <p className="text-foreground/60 mt-1 text-sm">{draft.weekLabel}</p>
        <p className="text-foreground/60 mt-3 text-sm">
          {draft.sessions.length} sesion{draft.sessions.length !== 1 ? 'es' : ''} ·{' '}
          {draft.sessions.reduce((acc, s) => acc + s.exercises.length, 0)} ejercicios
        </p>
      </div>
    </div>
  )
}

// ─── page ─────────────────────────────────────────────────────────────────────

const STEPS = ['Datos del plan', 'Sesiones y ejercicios', 'Asignar atleta']

const EMPTY_DRAFT: PlanDraft = {
  title: '',
  weekLabel: 'Semana 1',
  athleteId: '',
  block: 'Bloque A',
  sessions: [],
}

export default function NewPlanPage() {
  const router = useRouter()
  const { pushToast } = useToast()
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState<PlanDraft>(EMPTY_DRAFT)
  const [athletes, setAthletesCache] = useState<Athlete[]>([])
  const [athletesLoaded, setAthletesLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveAsTemplate, setSaveAsTemplate] = useState(false)
  const [templateName, setTemplateName] = useState('')

  function update(patch: Partial<PlanDraft>) {
    setDraft((prev) => ({ ...prev, ...patch }))
  }

  // Cargar atletas al llegar al paso 3
  async function goToStep3() {
    if (!athletesLoaded) {
      try {
        const data = await apiFetch<any>('/api/athletes')
        const arr = Array.isArray(data) ? data : (data?.items ?? data?.athletes ?? [])
        setAthletesCache(
          (arr as { id: string; fullName?: string; name?: string }[]).map((a) => ({
            id: a.id,
            fullName: a.fullName ?? a.name ?? a.id,
          }))
        )
      } catch {
        // sin problema
      }
      setAthletesLoaded(true)
    }
    setStep(2)
  }

  function canAdvance() {
    if (step === 0) return draft.title.trim().length > 0 && draft.weekLabel.trim().length > 0
    if (step === 1)
      return (
        draft.sessions.length > 0 &&
        draft.sessions.every(
          (s) => s.exercises.length > 0 && s.exercises.every((e) => e.exercise.trim().length > 0)
        )
      )
    if (step === 2) return draft.athleteId.length > 0
    return false
  }

  async function handleSave() {
    if (!canAdvance()) return
    setSaving(true)
    try {
      const res = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          athleteId: draft.athleteId,
          title: draft.title,
          weekLabel: draft.weekLabel,
          block: draft.block,
          sessions: draft.sessions,
        }),
      })

      if (!res.ok) {
        const err: { error?: string } = await res.json().catch(() => ({}))
        pushToast({ title: err.error ?? 'Error al crear el plan', variant: 'error' })
        setSaving(false)
        return
      }

      const plan: { id: string } = await res.json()

      if (saveAsTemplate && templateName.trim()) {
        await fetch('/api/plans/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: templateName.trim(),
            payload: { sessions: draft.sessions, block: draft.block },
          }),
        })
      }

      pushToast({ title: 'Plan creado correctamente', variant: 'success' })
      router.push(`/coach/athletes/${draft.athleteId}`)
      void plan
    } catch {
      pushToast({ title: 'Error inesperado', variant: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageShell className="max-w-2xl gap-6 px-4 py-8 sm:px-6">
      <SectionIntro
        eyebrow="Planes de entrenamiento"
        title="Nuevo plan"
        description="Crea un plan manualmente paso a paso y asignalo a un atleta."
      />

      {/* Steps bar */}
      <div className="flex gap-2">
        {STEPS.map((label, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              if (i < step) setStep(i)
            }}
            className={`flex-1 rounded-full py-2 text-xs font-semibold transition ${
              i === step
                ? 'bg-accent text-white'
                : i < step
                  ? 'bg-accent/20 text-accent'
                  : 'bg-surface-strong text-foreground/40'
            }`}
          >
            {i + 1}. {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="border-line bg-surface rounded-4xl border p-6 sm:p-8">
        {step === 0 && <Step1 draft={draft} onChange={update} />}
        {step === 1 && <Step2 draft={draft} onChange={update} />}
        {step === 2 && <Step3 draft={draft} athletes={athletes} onChange={update} />}

        {/* Guardar como template (solo en paso 2 y 3) */}
        {step >= 1 && (
          <div className="border-line bg-surface-strong mt-6 rounded-3xl border p-4">
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={saveAsTemplate}
                onChange={(e) => setSaveAsTemplate(e.target.checked)}
                className="border-line accent-accent h-4 w-4 rounded"
              />
              <span className="text-foreground/75 text-sm font-medium">
                Guardar tambien como plantilla
              </span>
            </label>
            {saveAsTemplate && (
              <input
                className="border-line bg-surface focus:ring-accent mt-3 w-full rounded-xl border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
                placeholder="Nombre de la plantilla (ej. PPL Volumen)"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />
            )}
          </div>
        )}
      </div>

      {/* Nav */}
      <div className="flex justify-between gap-4">
        <button
          type="button"
          disabled={step === 0}
          onClick={() => setStep(step - 1)}
          className="border-line bg-surface-strong hover:border-accent/30 rounded-2xl border px-6 py-3 text-sm font-medium transition disabled:opacity-40"
        >
          Atras
        </button>
        {step < 2 ? (
          <button
            type="button"
            disabled={!canAdvance()}
            onClick={() => (step === 1 ? goToStep3() : setStep(step + 1))}
            className="bg-accent hover:bg-accent-strong rounded-2xl px-6 py-3 text-sm font-semibold text-white transition disabled:opacity-40"
          >
            Siguiente
          </button>
        ) : (
          <button
            type="button"
            disabled={!canAdvance() || saving}
            onClick={handleSave}
            className="bg-accent hover:bg-accent-strong rounded-2xl px-6 py-3 text-sm font-semibold text-white transition disabled:opacity-40"
          >
            {saving ? 'Guardando...' : 'Crear plan'}
          </button>
        )}
      </div>
    </PageShell>
  )
}
