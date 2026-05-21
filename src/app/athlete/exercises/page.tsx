'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import type { CatalogGroup, CatalogExercise } from '@/app/api/exercises/catalog/route'

// ─── Iconos y colores por grupo muscular ──────────────────────────────────────

const MUSCLE_META: Record<string, { icon: string; color: string }> = {
  pecho: { icon: '💪', color: 'bg-red-500/10 text-red-500 border-red-500/20' },
  espalda: { icon: '🏋️', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  cuadriceps: { icon: '🦵', color: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
  isquiotibiales: { icon: '🦵', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  gluteos: { icon: '🍑', color: 'bg-pink-500/10 text-pink-500 border-pink-500/20' },
  hombros: { icon: '🤸', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
  biceps: { icon: '💪', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  triceps: { icon: '💪', color: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20' },
  core: { icon: '⭕', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
  pantorrillas: { icon: '🦵', color: 'bg-lime-500/10 text-lime-500 border-lime-500/20' },
  cardio: { icon: '❤️', color: 'bg-rose-500/10 text-rose-500 border-rose-500/20' },
  funcional: { icon: '⚡', color: 'bg-violet-500/10 text-violet-500 border-violet-500/20' },
}

function getMeta(muscle: string) {
  const key = muscle.toLowerCase().replace(/[^a-záéíóú]/gi, '')
  for (const [k, v] of Object.entries(MUSCLE_META)) {
    if (key.includes(k) || k.includes(key)) return v
  }
  return { icon: '🏋️', color: 'bg-foreground/8 text-foreground/60 border-line' }
}

// ─── Exercise Card ────────────────────────────────────────────────────────────

function ExerciseCard({ exercise }: { exercise: CatalogExercise }) {
  const meta = getMeta(exercise.primaryMuscle)
  return (
    <Link
      href={`/athlete/exercise/${encodeURIComponent(exercise.name)}`}
      className="border-line bg-surface hover:border-accent/40 hover:bg-surface-strong group flex flex-col gap-2 rounded-3xl border p-4 transition-all hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border text-base ${meta.color}`}
        >
          {meta.icon}
        </span>
        <div className="min-w-0">
          <p className="group-hover:text-accent text-sm leading-snug font-semibold transition-colors">
            {exercise.name}
          </p>
          <p className="text-foreground/45 mt-0.5 text-xs capitalize">{exercise.primaryMuscle}</p>
        </div>
      </div>
      {exercise.secondaryMuscles.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {exercise.secondaryMuscles.slice(0, 3).map((m) => (
            <span
              key={m}
              className="border-line bg-surface-strong text-foreground/50 rounded-full border px-2 py-0.5 text-[10px] capitalize"
            >
              {m}
            </span>
          ))}
          {exercise.secondaryMuscles.length > 3 && (
            <span className="text-foreground/35 text-[10px]">
              +{exercise.secondaryMuscles.length - 3}
            </span>
          )}
        </div>
      )}
      <div className="flex items-center justify-end">
        <span className="text-accent/50 group-hover:text-accent text-xs transition-colors">
          Ver detalle →
        </span>
      </div>
    </Link>
  )
}

// ─── Muscle Group Section ─────────────────────────────────────────────────────

function MuscleSection({ group }: { group: CatalogGroup }) {
  const meta = getMeta(group.muscle)
  return (
    <section id={`muscle-${group.muscle}`}>
      <div className="mb-4 flex items-center gap-3">
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-2xl border text-lg ${meta.color}`}
        >
          {meta.icon}
        </span>
        <div>
          <h2 className="leading-tight font-semibold capitalize">{group.muscle}</h2>
          <p className="text-foreground/40 text-xs">{group.exercises.length} ejercicios</p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {group.exercises.map((ex) => (
          <ExerciseCard key={ex.id} exercise={ex} />
        ))}
      </div>
    </section>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ExercisesLibraryPage() {
  const [groups, setGroups] = useState<CatalogGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/exercises/catalog')
      .then((r) => r.json())
      .then((d) => setGroups(d.groups ?? []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const muscles = useMemo(() => groups.map((g) => g.muscle), [groups])

  const filtered = useMemo(() => {
    let result = groups
    if (activeFilter) result = result.filter((g) => g.muscle === activeFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result
        .map((g) => ({
          ...g,
          exercises: g.exercises.filter(
            (ex) =>
              ex.name.toLowerCase().includes(q) ||
              ex.primaryMuscle.toLowerCase().includes(q) ||
              ex.secondaryMuscles.some((m) => m.toLowerCase().includes(q))
          ),
        }))
        .filter((g) => g.exercises.length > 0)
    }
    return result
  }, [groups, search, activeFilter])

  const totalVisible = filtered.reduce((acc, g) => acc + g.exercises.length, 0)

  return (
    <main className="mx-auto flex w-full max-w-370 flex-1 flex-col gap-8 px-6 py-8 md:px-10 lg:px-12">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <p className="text-foreground/40 text-xs font-medium tracking-widest uppercase">
          Referencia
        </p>
        <h1 className="text-3xl font-bold">Biblioteca de ejercicios</h1>
        <p className="text-foreground/50 text-sm">
          {loading
            ? 'Cargando…'
            : `${groups.reduce((a, g) => a + g.exercises.length, 0)} ejercicios · ${groups.length} grupos musculares`}
        </p>
      </div>

      {/* Search + filtros */}
      <div className="flex flex-col gap-3">
        <div className="border-line bg-surface flex items-center gap-3 rounded-2xl border px-4 py-2.5">
          <span className="text-foreground/40 text-base">🔍</span>
          <input
            type="text"
            placeholder="Buscar ejercicio o músculo…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="placeholder:text-foreground/35 flex-1 bg-transparent text-sm outline-none"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="text-foreground/40 hover:text-foreground text-xs transition"
            >
              ✕
            </button>
          )}
        </div>

        {/* Chips por grupo muscular */}
        {!loading && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveFilter(null)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                activeFilter === null
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-line text-foreground/55 hover:border-accent/40'
              }`}
            >
              Todos
            </button>
            {muscles.map((m) => {
              const meta = getMeta(m)
              return (
                <button
                  key={m}
                  onClick={() => setActiveFilter(activeFilter === m ? null : m)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium capitalize transition ${
                    activeFilter === m
                      ? meta.color + ' font-semibold'
                      : 'border-line text-foreground/55 hover:border-accent/40'
                  }`}
                >
                  <span>{meta.icon}</span>
                  {m}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Resultados */}
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="bg-surface-strong h-24 animate-pulse rounded-3xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="border-line bg-surface-strong flex h-48 items-center justify-center rounded-4xl border border-dashed">
          <div className="text-center">
            <p className="text-foreground/40 text-sm">Sin resultados para «{search}»</p>
            <button
              onClick={() => {
                setSearch('')
                setActiveFilter(null)
              }}
              className="text-accent mt-2 text-xs hover:underline"
            >
              Limpiar filtros
            </button>
          </div>
        </div>
      ) : (
        <>
          {(search || activeFilter) && (
            <p className="text-foreground/40 -mt-4 text-xs">
              {totalVisible} ejercicio{totalVisible !== 1 ? 's' : ''} encontrado
              {totalVisible !== 1 ? 's' : ''}
            </p>
          )}
          <div className="flex flex-col gap-10">
            {filtered.map((group) => (
              <MuscleSection key={group.muscle} group={group} />
            ))}
          </div>
        </>
      )}

      {/* Nota al pie */}
      {!loading && (
        <div className="border-line bg-surface-strong mt-4 rounded-3xl border p-5 text-center">
          <p className="text-foreground/50 text-sm">
            Haz clic en cualquier ejercicio para ver demo en vídeo, músculos trabajados, progresión
            personal y notas técnicas.
          </p>
          <p className="text-foreground/30 mt-1 text-xs">
            Datos de músculos: base propia + wger.de · Vídeos: wger.de · GIFs: ExerciseDB (si
            configurado)
          </p>
        </div>
      )}
    </main>
  )
}
