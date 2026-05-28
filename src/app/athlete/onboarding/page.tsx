'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useId, useMemo, useState } from 'react'
import { SectionIntro } from '@/components/section-intro'
import { useAthletes } from '@/lib/store'
import { useCoachMe } from '@/lib/use-coach-me'

type Goal = string

type CatalogGoal = {
  id: string | null
  code: string
  label: string
  description: string | null | undefined
  isVisible: boolean
  isDefault?: boolean
}

type CatalogPhase = {
  id: string
  code: string
  label: string
}

type FormData = {
  fullName: string
  phone: string
  contactEmail: string
  primaryComment: string
  goal: Goal
  phaseLabel: string
  coachId: string
  teamId: string | null
  healthConnections: string[]
}

type TeamCoach = {
  coachId: string
  displayName: string
  email: string
  phone: string | null
  role: string
}

const FALLBACK_GOALS: CatalogGoal[] = [
  {
    id: null,
    code: 'VOLUMEN',
    label: 'Volumen',
    description: 'Construir masa muscular con superávit controlado.',
    isVisible: true,
    isDefault: true,
  },
  {
    id: null,
    code: 'DEFINICION',
    label: 'Definición',
    description: 'Reducir grasa preservando músculo en déficit.',
    isVisible: true,
    isDefault: true,
  },
  {
    id: null,
    code: 'MANTENIMIENTO',
    label: 'Mantenimiento',
    description: 'Mantener composición corporal actual.',
    isVisible: true,
    isDefault: true,
  },
  {
    id: null,
    code: 'PEAK_WEEK',
    label: 'Peak Week',
    description: 'Puesta a punto previa a competición.',
    isVisible: true,
    isDefault: true,
  },
]

const STEPS = ['Datos personales y objetivo', 'Contrato legal', 'Confirmación']

const EMPTY_FORM: FormData = {
  fullName: '',
  phone: '',
  contactEmail: '',
  primaryComment: '',
  goal: 'VOLUMEN',
  phaseLabel: '',
  coachId: '',
  teamId: null,
  healthConnections: [],
}

export default function OnboardingPage() {
  const router = useRouter()
  const { coach, loading: loadingCoach } = useCoachMe()
  const { addAthlete } = useAthletes(coach?.id)
  const formId = useId()
  const [step, setStep] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [teamCoaches, setTeamCoaches] = useState<TeamCoach[]>([])
  const [catalogGoals, setCatalogGoals] = useState<CatalogGoal[]>(FALLBACK_GOALS)
  const [catalogPhases, setCatalogPhases] = useState<CatalogPhase[]>([])
  const [phaseMode, setPhaseMode] = useState<'catalog' | 'custom'>('catalog')
  const [contractTemplate, setContractTemplate] = useState<string>('')
  const [consentAccepted, setConsentAccepted] = useState(false)
  const [consentSignature, setConsentSignature] = useState('')

  useEffect(() => {
    async function load() {
      try {
        // Primero intentar obtener coaches (caso coach y admin con teamId)
        let coachesData: { teamId: string | null; coaches: TeamCoach[] } | null = null
        try {
          const res = await fetch('/api/teams/coaches')
          if (res.ok)
            coachesData = (await res.json()) as { teamId: string | null; coaches: TeamCoach[] }
        } catch (_) {
          coachesData = null
        }

        // Si no hay coaches, intentar resolver por equipos disponibles (útil para ADMIN)
        if (
          !coachesData ||
          !Array.isArray(coachesData.coaches) ||
          coachesData.coaches.length === 0
        ) {
          try {
            const teamsRes = await fetch('/api/teams')
            if (teamsRes.ok) {
              const teams = (await teamsRes.json()) as Array<{ id: string }>
              if (Array.isArray(teams) && teams.length > 0) {
                for (const t of teams) {
                  try {
                    const r = await fetch(`/api/teams/coaches?teamId=${t.id}`)
                    if (!r.ok) continue
                    const d = await r.json()
                    if (d && Array.isArray(d.coaches) && d.coaches.length > 0) {
                      coachesData = d
                      break
                    }
                  } catch (_) {
                    continue
                  }
                }
              }
            }
          } catch (_) {
            // ignore
          }
        }

        if (coachesData) {
          setTeamCoaches(coachesData.coaches ?? [])
          setForm((prev) => ({
            ...prev,
            teamId: coachesData.teamId ?? prev.teamId,
            coachId:
              prev.coachId ||
              (coachesData.coaches.find((c) => c.coachId === coach?.id)?.coachId ??
                coachesData.coaches[0]?.coachId ??
                ''),
          }))
        }

        // Cargar catalog y contrato (independiente)
        try {
          const [catalogRes, contractRes] = await Promise.all([
            fetch('/api/teams/catalog'),
            fetch('/api/teams/contract'),
          ])
          if (catalogRes.ok) {
            const catalogData = await catalogRes.json()
            const visibleGoals = (catalogData.goals ?? []).filter((g: any) => g.isVisible !== false)
            if (visibleGoals.length > 0) setCatalogGoals(visibleGoals)
            if ((catalogData.phases ?? []).length > 0) {
              setCatalogPhases(catalogData.phases)
              setPhaseMode('catalog')
            }
          }
          if (contractRes.ok) {
            const contractData = await contractRes.json()
            if (contractData?.template) setContractTemplate(contractData.template)
          }
        } catch (_) {
          // ignore
        }
      } catch (_) {
        // ignore
      }
    }

    void load()
  }, [coach?.id])

  const selectedCoach = useMemo(
    () => teamCoaches.find((c) => c.coachId === form.coachId) ?? null,
    [teamCoaches, form.coachId]
  )

  function update<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit() {
    const goalApiValue = form.goal.toLowerCase().replace('_', '-')
    const created = await addAthlete({
      fullName: form.fullName,
      goal: goalApiValue as 'volumen' | 'definicion' | 'mantenimiento' | 'peak-week',
      phaseLabel: form.phaseLabel || 'Semana 1',
      coachName: selectedCoach?.displayName ?? coach?.displayName ?? 'Coach',
      coachUserId: null,
      userId: null,
      phone: form.phone || null,
      contactEmail: form.contactEmail || null,
      primaryComment: form.primaryComment || null,
      teamId: form.teamId,
      healthConnections: [],
      coachId: form.coachId || coach?.id,
    })

    if (consentAccepted && created?.id) {
      await fetch(`/api/athletes/${created.id}/consent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signatureRef: consentSignature.trim() || null }),
      }).catch(() => void 0)
    }

    setSubmitted(true)
  }

  if (submitted) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-8 px-6 py-20 text-center">
        <div className="bg-accent flex h-20 w-20 items-center justify-center rounded-full text-4xl text-white">
          ✓
        </div>
        <div>
          <h1 className="text-3xl font-semibold">Alta completada</h1>
          <p className="text-foreground/70 mt-3">
            <strong>{form.fullName}</strong> dado de alta — objetivo: <strong>{form.goal}</strong>.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => router.push('/coach/athletes')}
            className="bg-accent hover:bg-accent-strong rounded-full px-6 py-3 text-sm font-semibold text-white transition"
          >
            Ver atletas
          </button>
          <button
            onClick={() => {
              setSubmitted(false)
              setStep(0)
              setForm({
                ...EMPTY_FORM,
                coachId: teamCoaches[0]?.coachId ?? '',
                teamId: form.teamId,
              })
            }}
            className="border-line bg-surface hover:bg-surface-strong rounded-full border px-6 py-3 text-sm font-semibold transition"
          >
            Dar de alta otro
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto flex w-full max-w-[1480px] flex-1 flex-col gap-8 px-6 py-8 md:px-10 lg:px-12">
      <SectionIntro
        eyebrow="Onboarding del atleta"
        title="Alta operativa sin formularios dispersos"
        description={
          loadingCoach
            ? 'Cargando perfil coach...'
            : coach
              ? `Equipo de ${coach.displayName}`
              : 'Rellena los datos una sola vez. Sin PDFs, sin WhatsApp, sin carpetas.'
        }
      />

      {/* Progress */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex flex-1 flex-col items-center gap-1">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition ${
                i < step
                  ? 'bg-accent text-white'
                  : i === step
                    ? 'border-accent text-accent border-2'
                    : 'border-line text-foreground/40 border'
              }`}
            >
              {i < step ? '✓' : i + 1}
            </div>
            <span
              className={`hidden text-xs md:block ${i === step ? 'text-accent font-medium' : 'text-foreground/50'}`}
            >
              {label}
            </span>
          </div>
        ))}
      </div>

      <div className="border-line bg-surface rounded-4xl border p-6 md:p-8">
        {step === 0 && (
          <div className="space-y-5">
            <h2 className="text-xl font-semibold">Datos personales y objetivo</h2>
            <div className="space-y-1">
              <label htmlFor={`${formId}-name`} className="text-foreground/70 text-sm font-medium">
                Nombre completo
              </label>
              <input
                id={`${formId}-name`}
                type="text"
                value={form.fullName}
                onChange={(e) => update('fullName', e.target.value)}
                placeholder="Ej: Carlos Ruiz"
                className="border-line bg-surface-strong focus:border-accent w-full rounded-2xl border px-4 py-3 text-sm transition outline-none"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor={`${formId}-email`} className="text-foreground/70 text-sm font-medium">
                Email del atleta
              </label>
              <input
                id={`${formId}-email`}
                type="email"
                value={form.contactEmail}
                onChange={(e) => update('contactEmail', e.target.value)}
                placeholder="Ej: atleta@email.com"
                className="border-line bg-surface-strong focus:border-accent w-full rounded-2xl border px-4 py-3 text-sm transition outline-none"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor={`${formId}-phone`} className="text-foreground/70 text-sm font-medium">
                Telefono del atleta
              </label>
              <input
                id={`${formId}-phone`}
                type="tel"
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
                placeholder="Ej: +34 600 000 000"
                className="border-line bg-surface-strong focus:border-accent w-full rounded-2xl border px-4 py-3 text-sm transition outline-none"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor={`${formId}-coach-select`}
                className="text-foreground/70 text-sm font-medium"
              >
                Coach del equipo
              </label>
              <select
                id={`${formId}-coach-select`}
                value={form.coachId}
                onChange={(e) => update('coachId', e.target.value)}
                className="border-line bg-surface-strong focus:border-accent w-full rounded-2xl border px-4 py-3 text-sm transition outline-none"
              >
                {teamCoaches.length === 0 ? (
                  <option value="">Sin coaches en el equipo</option>
                ) : (
                  teamCoaches.map((c) => (
                    <option key={c.coachId} value={c.coachId}>
                      {c.displayName} · {c.email} · {c.phone || 'sin telefono'}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {catalogGoals.map((g) => (
                <button
                  key={g.code}
                  type="button"
                  onClick={() => update('goal', g.code)}
                  className={`rounded-3xl border p-4 text-left transition ${
                    form.goal === g.code
                      ? 'border-accent bg-accent-soft'
                      : 'border-line bg-surface-strong hover:border-accent/50'
                  }`}
                >
                  <p className="text-sm font-semibold">{g.label}</p>
                  {g.description ? (
                    <p className="text-foreground/60 mt-1 text-xs">{g.description}</p>
                  ) : null}
                </button>
              ))}
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label
                  htmlFor={`${formId}-phase`}
                  className="text-foreground/70 text-sm font-medium"
                >
                  Fase / etiqueta de semana
                </label>
                {catalogPhases.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setPhaseMode((m) => (m === 'catalog' ? 'custom' : 'catalog'))
                      update('phaseLabel', '')
                    }}
                    className="text-accent text-xs hover:underline"
                  >
                    {phaseMode === 'catalog' ? 'Escribir personalizada' : 'Usar catálogo'}
                  </button>
                )}
              </div>
              {catalogPhases.length > 0 && phaseMode === 'catalog' ? (
                <select
                  id={`${formId}-phase`}
                  value={form.phaseLabel}
                  onChange={(e) => update('phaseLabel', e.target.value)}
                  className="border-line bg-surface-strong focus:border-accent w-full rounded-2xl border px-4 py-3 text-sm transition outline-none"
                >
                  <option value="">Seleccionar fase del equipo…</option>
                  {catalogPhases.map((p) => (
                    <option key={p.id} value={p.label}>
                      {p.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={`${formId}-phase`}
                  type="text"
                  value={form.phaseLabel}
                  onChange={(e) => update('phaseLabel', e.target.value)}
                  placeholder="Ej: Semana 3 Bloque A"
                  className="border-line bg-surface-strong focus:border-accent w-full rounded-2xl border px-4 py-3 text-sm transition outline-none"
                />
              )}
            </div>

            <div className="space-y-1">
              <label
                htmlFor={`${formId}-comment`}
                className="text-foreground/70 text-sm font-medium"
              >
                Comentario primario
              </label>
              <textarea
                id={`${formId}-comment`}
                value={form.primaryComment}
                onChange={(e) => update('primaryComment', e.target.value)}
                placeholder="Contexto inicial del atleta, observaciones del coach, etc."
                rows={3}
                className="border-line bg-surface-strong focus:border-accent w-full resize-none rounded-2xl border px-4 py-3 text-sm transition outline-none"
              />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-xl font-semibold">Contrato legal</h2>
            <p className="text-foreground/60 text-sm">
              El atleta debe leer y aceptar los términos antes de finalizar el alta.
            </p>
            <div className="border-line bg-surface-strong text-foreground/80 max-h-72 overflow-y-auto rounded-2xl border p-4 text-sm whitespace-pre-wrap">
              {contractTemplate || 'Cargando contrato…'}
            </div>
            <div className="border-line bg-surface-strong space-y-3 rounded-2xl border p-4">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={consentAccepted}
                  onChange={(e) => setConsentAccepted(e.target.checked)}
                  className="accent-accent mt-0.5 h-4 w-4"
                />
                <span className="text-sm">
                  He leído y acepto los términos del contrato de coaching.
                </span>
              </label>
              {consentAccepted && (
                <div className="space-y-1">
                  <label className="text-foreground/60 text-xs font-medium">
                    Firma (nombre completo del atleta)
                  </label>
                  <input
                    type="text"
                    value={consentSignature}
                    onChange={(e) => setConsentSignature(e.target.value)}
                    placeholder="Escribe tu nombre completo"
                    className="border-line bg-surface focus:border-accent w-full rounded-xl border px-4 py-2 text-sm transition outline-none"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-xl font-semibold">Confirmacion</h2>
            <ul className="space-y-3 text-sm">
              {(
                [
                  ['Nombre', form.fullName],
                  ['Email atleta', form.contactEmail || 'No indicado'],
                  ['Telefono atleta', form.phone || 'No indicado'],
                  [
                    'Coach',
                    selectedCoach
                      ? `${selectedCoach.displayName} (${selectedCoach.email})`
                      : 'No seleccionado',
                  ],
                  ['Objetivo', form.goal],
                  ['Fase', form.phaseLabel || 'Semana 1'],
                  [
                    'Contrato aceptado',
                    consentAccepted
                      ? `Sí — "${consentSignature || 'Sin firma tipada'}"`
                      : 'No aceptado',
                  ],
                ] as [string, string][]
              ).map(([label, value]) => (
                <li
                  key={label}
                  className="border-line bg-surface-strong flex items-start justify-between gap-4 rounded-2xl border px-4 py-3"
                >
                  <span className="text-foreground/60">{label}</span>
                  <span className="text-right font-medium">{value}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="flex justify-between gap-3">
        <button
          type="button"
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 0}
          className="border-line bg-surface hover:bg-surface-strong rounded-full border px-6 py-3 text-sm font-semibold transition disabled:pointer-events-none disabled:opacity-40"
        >
          Anterior
        </button>
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            disabled={
              (step === 0 && (!form.fullName.trim() || !form.coachId)) ||
              (step === 1 && !consentAccepted)
            }
            className="bg-accent hover:bg-accent-strong rounded-full px-6 py-3 text-sm font-semibold text-white transition disabled:pointer-events-none disabled:opacity-40"
          >
            Siguiente
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            className="bg-accent hover:bg-accent-strong rounded-full px-6 py-3 text-sm font-semibold text-white transition"
          >
            Completar alta
          </button>
        )}
      </div>
    </main>
  )
}
