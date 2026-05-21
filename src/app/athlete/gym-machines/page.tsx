'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { SectionIntro } from '@/components/section-intro'
import { useAthleteMe } from '@/lib/use-athlete-me'
import { DEFAULT_ATHLETE_CONTEXT, type GymMachineItem } from '@/lib/athlete-context'
import { AthleteAside } from '@/components/athlete-aside'

const MACHINE_GROUP_OPTIONS = [
  'Pierna',
  'Glúteo',
  'Espalda',
  'Pecho',
  'Hombro',
  'Bíceps',
  'Tríceps',
  'Core',
  'Cardio',
  'Otro',
] as const

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export default function AthleteGymMachinesPage() {
  const { athlete, loading: loadingAthlete, notFound } = useAthleteMe()
  const [machines, setMachines] = useState<GymMachineItem[]>([])
  const [query, setQuery] = useState('')
  const [groupFilter, setGroupFilter] = useState('all')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!athlete?.id) return
    fetch(`/api/athletes/${athlete.id}/context`)
      .then((r) => (r.ok ? r.json() : DEFAULT_ATHLETE_CONTEXT))
      .then((data) => setMachines(Array.isArray(data.gymMachines) ? data.gymMachines : []))
      .catch(() => setMachines([]))
  }, [athlete?.id])

  const visibleMachines = useMemo(() => {
    const q = query.trim().toLowerCase()
    return machines
      .filter((m) => {
        const groupOk = groupFilter === 'all' || (m.muscleGroup ?? '') === groupFilter
        const text =
          `${m.name ?? ''} ${m.brand ?? ''} ${m.model ?? ''} ${m.note ?? ''} ${m.muscleGroup ?? ''}`.toLowerCase()
        return groupOk && (!q || text.includes(q))
      })
      .slice()
      .sort((a, b) => {
        const g = (a.muscleGroup ?? 'Otro').localeCompare(b.muscleGroup ?? 'Otro', 'es', {
          sensitivity: 'base',
        })
        if (g !== 0) return g
        return (a.name ?? '').localeCompare(b.name ?? '', 'es', { sensitivity: 'base' })
      })
  }, [machines, groupFilter, query])

  function updateMachine(id: string, patch: Partial<GymMachineItem>) {
    setMachines((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)))
  }

  function addMachine() {
    setMachines((prev) => [
      ...prev,
      {
        id: uid('machine'),
        name: '',
        brand: '',
        model: '',
        muscleGroup: 'Pierna',
        note: '',
        imageUrl: '',
      },
    ])
  }

  function removeMachine(id: string) {
    setMachines((prev) => prev.filter((m) => m.id !== id))
  }

  function uploadMachineImage(id: string, file: File | null) {
    if (!file) return
    setError('')
    const maxBytes = 4 * 1024 * 1024
    if (!file.type.startsWith('image/')) {
      setError('El archivo debe ser una imagen.')
      return
    }
    if (file.size > maxBytes) {
      setError('La imagen supera 4MB. Usa una más ligera.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      updateMachine(id, { imageUrl: result })
    }
    reader.readAsDataURL(file)
  }

  async function saveMachines() {
    if (!athlete?.id) return
    setSaving(true)
    setError('')
    const deduped = machines
      .filter((m) => m.name?.trim())
      .filter(
        (m, idx, arr) =>
          arr.findIndex((x) => x.name.trim().toLowerCase() === m.name.trim().toLowerCase()) === idx
      )

    const res = await fetch(`/api/athletes/${athlete.id}/context`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gymMachines: deduped }),
    })

    if (!res.ok) {
      setError('No se pudo guardar la maquinaria.')
      setSaving(false)
      return
    }

    const updated = await res.json()
    setMachines(Array.isArray(updated.gymMachines) ? updated.gymMachines : [])
    setSaving(false)
  }

  if (loadingAthlete) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-foreground/50 text-sm">Cargando perfil...</p>
      </main>
    )
  }

  if (notFound || !athlete) {
    return (
      <main className="mx-auto flex w-full max-w-370 flex-1 flex-col items-center justify-center gap-3 px-6 py-12 text-center">
        <p className="text-lg font-semibold">Sin perfil de atleta</p>
        <Link
          href="/athlete/onboarding"
          className="bg-accent hover:bg-accent-strong rounded-full px-6 py-3 text-sm font-semibold text-white transition"
        >
          Completar onboarding
        </Link>
      </main>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-370 gap-6 px-6 py-8 md:px-10 lg:px-12">
      <main className="flex flex-1 flex-col gap-8">
        <SectionIntro
          eyebrow="Tu gimnasio"
          title="Maquinaria disponible"
          description="Cárgala tú mismo para que el coach te paute variantes compatibles con tu gym real."
        />

        <section className="border-line bg-surface space-y-4 rounded-4xl border p-6 shadow-[0_16px_48px_rgba(0,0,0,0.06)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-foreground/60 text-sm">
              Añade nombre, marca/modelo, grupo muscular e imagen opcional.
            </p>
            <button
              type="button"
              onClick={addMachine}
              className="border-line bg-surface-strong hover:border-accent/35 rounded-full border px-4 py-2 text-sm transition"
            >
              + Máquina
            </button>
          </div>

          <div className="grid gap-2 md:grid-cols-[1fr_220px]">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar máquina..."
              className="border-line bg-surface-strong focus:border-accent rounded-2xl border px-4 py-2.5 text-sm transition outline-none"
            />
            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              className="border-line bg-surface-strong focus:border-accent rounded-2xl border px-4 py-2.5 text-sm transition outline-none"
            >
              <option value="all">Todos los grupos</option>
              {MACHINE_GROUP_OPTIONS.map((group) => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            {visibleMachines.map((m) => (
              <div key={m.id} className="border-line bg-surface-strong rounded-2xl border p-3">
                <div className="grid gap-2 md:grid-cols-[1fr_160px_160px_220px_auto]">
                  <input
                    value={m.name}
                    onChange={(e) => updateMachine(m.id, { name: e.target.value })}
                    placeholder="Nombre máquina"
                    className="border-line bg-surface focus:border-accent rounded-2xl border px-3 py-2 text-sm transition outline-none"
                  />
                  <input
                    value={m.brand ?? ''}
                    onChange={(e) => updateMachine(m.id, { brand: e.target.value })}
                    placeholder="Marca"
                    className="border-line bg-surface focus:border-accent rounded-2xl border px-3 py-2 text-sm transition outline-none"
                  />
                  <input
                    value={m.model ?? ''}
                    onChange={(e) => updateMachine(m.id, { model: e.target.value })}
                    placeholder="Modelo"
                    className="border-line bg-surface focus:border-accent rounded-2xl border px-3 py-2 text-sm transition outline-none"
                  />
                  <select
                    value={m.muscleGroup ?? 'Otro'}
                    onChange={(e) => updateMachine(m.id, { muscleGroup: e.target.value })}
                    className="border-line bg-surface focus:border-accent rounded-2xl border px-3 py-2 text-sm transition outline-none"
                  >
                    {MACHINE_GROUP_OPTIONS.map((group) => (
                      <option key={group} value={group}>
                        {group}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeMachine(m.id)}
                    className="border-danger/30 text-danger hover:bg-danger/10 rounded-full border px-3 py-1.5 text-xs transition"
                  >
                    Quitar
                  </button>
                </div>

                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  <input
                    value={m.note ?? ''}
                    onChange={(e) => updateMachine(m.id, { note: e.target.value })}
                    placeholder="Nota opcional"
                    className="border-line bg-surface focus:border-accent rounded-2xl border px-3 py-2 text-sm transition outline-none"
                  />
                  <input
                    value={m.imageUrl ?? ''}
                    onChange={(e) => updateMachine(m.id, { imageUrl: e.target.value })}
                    placeholder="URL imagen (opcional)"
                    className="border-line bg-surface focus:border-accent rounded-2xl border px-3 py-2 text-sm transition outline-none"
                  />
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <label className="border-line bg-surface text-foreground/70 hover:border-accent/35 cursor-pointer rounded-full border px-3 py-1.5 text-xs transition">
                    Subir imagen
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => uploadMachineImage(m.id, e.target.files?.[0] ?? null)}
                    />
                  </label>
                  {m.imageUrl ? (
                    <span className="text-success text-xs">Imagen cargada</span>
                  ) : (
                    <span className="text-foreground/45 text-xs">Sin imagen</span>
                  )}
                </div>

                {m.imageUrl ? (
                  <div className="border-line bg-surface mt-2 overflow-hidden rounded-2xl border">
                    <img
                      src={m.imageUrl}
                      alt={m.name || 'Máquina'}
                      className="h-40 w-full object-cover"
                    />
                  </div>
                ) : null}
              </div>
            ))}

            {machines.length === 0 && (
              <p className="text-foreground/40 text-xs">No hay máquinas cargadas todavía.</p>
            )}
            {machines.length > 0 && visibleMachines.length === 0 && (
              <p className="text-foreground/40 text-xs">No hay resultados para ese filtro.</p>
            )}
            {error && <p className="text-danger text-xs">{error}</p>}
          </div>
        </section>

        <div className="flex flex-wrap justify-end gap-2">
          <Link
            href="/athlete/plan"
            className="border-line bg-surface-strong hover:border-accent/35 rounded-full border px-4 py-3 text-sm transition"
          >
            Volver al plan
          </Link>
          <button
            type="button"
            onClick={saveMachines}
            disabled={saving}
            className="bg-accent hover:bg-accent-strong rounded-full px-6 py-3 text-sm font-semibold text-white transition disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar maquinaria'}
          </button>
        </div>
      </main>
      <AthleteAside />
    </div>
  )
}
