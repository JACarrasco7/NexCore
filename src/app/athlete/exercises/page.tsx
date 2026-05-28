'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { ViewModeToggle } from '@/components/ui/view-mode-toggle'
import { Skeleton } from '@/components/ui/skeleton'
import { apiFetch } from '@/lib/store'
import type { CatalogGroup, CatalogExercise } from '@/app/api/exercises/catalog/route'

const TYPE_LABELS: Record<string, string> = {
  exercise: 'Ejercicio',
  stretch: 'Estiramiento',
  technique: 'Técnica',
  warmup: 'Calentamiento',
}
const DIFFICULTY_LABELS: Record<string, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
}
const SORT_OPTIONS = [
  { value: 'muscle', label: 'Por músculo' },
  { value: 'name', label: 'Alfabético' },
]

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

// ─── Cards ────────────────────────────────────────────────────────────────────
function ExerciseCard({ exercise }: { exercise: CatalogExercise }) {
  const meta = getMeta(exercise.primaryMuscle)
  return (
    <Link
      href={`/athlete/exercise/${encodeURIComponent(exercise.name)}`}
      className="border-line bg-surface hover:border-accent/40 hover:bg-surface-strong group flex flex-col gap-2 rounded-3xl border p-4 transition-all hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        {exercise.externalImageUrl ? (
          <img
            src={exercise.externalImageUrl}
            alt={exercise.name}
            className="border-line bg-surface-strong h-12 w-12 shrink-0 rounded-2xl border object-cover"
            loading="lazy"
          />
        ) : (
          <span
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border text-lg ${meta.color}`}
          >
            {meta.icon}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="group-hover:text-accent text-sm leading-snug font-semibold transition-colors">
            {exercise.name}
          </p>
          <p className="text-foreground/45 mt-0.5 text-xs capitalize">{exercise.primaryMuscle}</p>
          {exercise.equipment && (
            <span className="bg-surface-strong text-foreground/40 mt-1 inline-block rounded-full px-2 py-0.5 text-[10px]">
              {exercise.equipment}
            </span>
          )}
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
    </Link>
  )
}

function ExerciseRow({
  exercise,
  showMuscle,
}: {
  exercise: CatalogExercise
  showMuscle?: boolean
}) {
  const meta = getMeta(exercise.primaryMuscle)
  return (
    <Link
      href={`/athlete/exercise/${encodeURIComponent(exercise.name)}`}
      className="border-line bg-surface hover:border-accent/40 hover:bg-surface-strong flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all"
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-sm ${meta.color}`}
      >
        {meta.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{exercise.name}</p>
        {showMuscle && (
          <p className="text-foreground/45 text-xs capitalize">{exercise.primaryMuscle}</p>
        )}
      </div>
      <span className="text-foreground/30 text-xs capitalize">{exercise.equipment ?? '—'}</span>
      <span className="text-accent/50 text-xs">→</span>
    </Link>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ExercisesLibraryPage() {
  const [viewMode, setViewMode] = useState<'table' | 'list'>('table')
  const [search, setSearch] = useState('')
  const [activeMuscle, setActiveMuscle] = useState<string | null>(null)
  const [activeType, setActiveType] = useState<string | null>(null)
  const [activeEquipment, setActiveEquipment] = useState<string | null>(null)
  const [activeDifficulty, setActiveDifficulty] = useState<string | null>(null)
  const [sort, setSort] = useState('muscle')
  const [filtersOpen, setFiltersOpen] = useState(false)

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['exercises-catalog'],
    queryFn: async () => {
      const d = await apiFetch<{ groups: CatalogGroup[] }>('/api/exercises/catalog')
      return d.groups ?? []
    },
    staleTime: 5 * 60 * 1000,
  })

  const allExercises = useMemo(() => groups.flatMap((g) => g.exercises), [groups])
  const muscles = useMemo(() => groups.map((g) => g.muscle), [groups])
  const types = useMemo(
    () => [...new Set(allExercises.map((e) => e.exerciseType ?? 'exercise').filter(Boolean))],
    [allExercises]
  )
  const equipments = useMemo(
    () => [...new Set(allExercises.map((e) => e.equipment).filter(Boolean))].sort(),
    [allExercises]
  )
  const difficulties = useMemo(
    () => [...new Set(allExercises.map((e) => e.difficulty).filter(Boolean))].sort(),
    [allExercises]
  )

  const filtered = useMemo(() => {
    let result = groups
    if (activeMuscle) result = result.filter((g) => g.muscle === activeMuscle)
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
    if (activeType || activeEquipment || activeDifficulty) {
      result = result
        .map((g) => ({
          ...g,
          exercises: g.exercises.filter((ex) => {
            if (activeType && (ex.exerciseType ?? 'exercise') !== activeType) return false
            if (activeEquipment && ex.equipment !== activeEquipment) return false
            if (activeDifficulty && ex.difficulty !== activeDifficulty) return false
            return true
          }),
        }))
        .filter((g) => g.exercises.length > 0)
    }
    if (sort === 'name') {
      result = result.map((g) => ({
        ...g,
        exercises: [...g.exercises].sort((a, b) => a.name.localeCompare(b.name, 'es')),
      }))
    }
    return result
  }, [groups, search, activeMuscle, activeType, activeEquipment, activeDifficulty, sort])

  const totalVisible = filtered.reduce((acc, g) => acc + g.exercises.length, 0)
  const totalAll = groups.reduce((a, g) => a + g.exercises.length, 0)
  const clearFilters = () => {
    setSearch('')
    setActiveMuscle(null)
    setActiveType(null)
    setActiveEquipment(null)
    setActiveDifficulty(null)
  }
  const hasFilters = !!(search || activeMuscle || activeType || activeEquipment || activeDifficulty)

  return (
    <main className="mx-auto flex w-full max-w-370 flex-1 flex-col gap-5 px-6 py-8 md:px-10 lg:px-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-foreground/40 text-xs font-medium tracking-widest uppercase">
            Referencia
          </p>
          <h1 className="text-3xl font-bold">Biblioteca de ejercicios</h1>
          <p className="text-foreground/50 mt-1 text-sm">
            {totalAll} ejercicios · {groups.length} grupos
          </p>
        </div>
        <ViewModeToggle value={viewMode} onChange={setViewMode} storageKey="exercises-view-mode" />
      </div>

      {/* Search + filter toggle */}
      <div className="flex gap-2">
        <div className="border-line bg-surface flex flex-1 items-center gap-3 rounded-2xl border px-4 py-2.5">
          <span className="text-foreground/40">🔍</span>
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
              className="text-foreground/40 hover:text-foreground text-xs"
            >
              ✕
            </button>
          )}
        </div>
        <button
          onClick={() => setFiltersOpen(!filtersOpen)}
          className={`shrink-0 rounded-2xl border px-4 py-2.5 text-sm transition ${filtersOpen || hasFilters ? 'border-accent bg-accent/10 text-accent' : 'border-line bg-surface text-foreground/60 hover:border-accent/40'}`}
        >
          Filtros {hasFilters && `(${totalVisible})`}
        </button>
      </div>

      {/* Collapsible filter panel */}
      {filtersOpen && (
        <div className="border-line bg-surface space-y-4 rounded-3xl border p-4">
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setActiveMuscle(null)}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${!activeMuscle ? 'border-accent bg-accent/10 text-accent' : 'border-line text-foreground/55 hover:border-accent/40'}`}
            >
              Todos
            </button>
            {muscles.map((m) => {
              const meta = getMeta(m)
              return (
                <button
                  key={m}
                  onClick={() => setActiveMuscle(activeMuscle === m ? null : m)}
                  className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium capitalize transition ${activeMuscle === m ? meta.color + ' font-semibold' : 'border-line text-foreground/55 hover:border-accent/40'}`}
                >
                  <span className="text-[10px]">{meta.icon}</span>
                  {m}
                </button>
              )
            })}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={activeType ?? ''}
              onChange={(e) => setActiveType(e.target.value || null)}
              className="border-line bg-surface-strong focus:border-accent rounded-full border px-3 py-1.5 text-xs outline-none"
            >
              <option value="">Tipo: todos</option>
              {types.map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABELS[t] ?? t}
                </option>
              ))}
            </select>
            <select
              value={activeEquipment ?? ''}
              onChange={(e) => setActiveEquipment(e.target.value || null)}
              className="border-line bg-surface-strong focus:border-accent rounded-full border px-3 py-1.5 text-xs outline-none"
            >
              <option value="">Equipo: todo</option>
              {equipments.map((e) => (
                <option key={e} value={e} className="capitalize">
                  {e}
                </option>
              ))}
            </select>
            <select
              value={activeDifficulty ?? ''}
              onChange={(e) => setActiveDifficulty(e.target.value || null)}
              className="border-line bg-surface-strong focus:border-accent rounded-full border px-3 py-1.5 text-xs outline-none"
            >
              <option value="">Dificultad: todas</option>
              {difficulties.map((d) => (
                <option key={d} value={d}>
                  {DIFFICULTY_LABELS[d] ?? d}
                </option>
              ))}
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="border-line bg-surface-strong focus:border-accent rounded-full border px-3 py-1.5 text-xs outline-none"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="text-accent ml-auto text-xs hover:underline"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>
      )}

      {/* Results */}
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-3xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="border-line bg-surface-strong flex h-48 items-center justify-center rounded-4xl border border-dashed">
          <div className="text-center">
            <p className="text-foreground/40 text-sm">
              {hasFilters ? 'Sin resultados' : 'No hay ejercicios aún'}
            </p>
            <button onClick={clearFilters} className="text-accent mt-2 text-xs hover:underline">
              Limpiar filtros
            </button>
          </div>
        </div>
      ) : viewMode === 'table' ? (
        <div className="flex flex-col gap-10">
          {hasFilters && (
            <p className="text-foreground/40 -mb-6 text-xs">
              {totalVisible} ejercicio{totalVisible !== 1 ? 's' : ''}
            </p>
          )}
          {filtered.map((group) => (
            <section key={group.muscle} id={`muscle-${group.muscle}`}>
              <div className="mb-4 flex items-center gap-3">
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-2xl border text-lg ${getMeta(group.muscle).color}`}
                >
                  {getMeta(group.muscle).icon}
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
          ))}
        </div>
      ) : (
        <div className="space-y-1">
          {hasFilters && (
            <p className="text-foreground/40 text-xs">
              {totalVisible} ejercicio{totalVisible !== 1 ? 's' : ''}
            </p>
          )}
          {filtered.flatMap((group) =>
            group.exercises.map((ex) => <ExerciseRow key={ex.id} exercise={ex} showMuscle />)
          )}
        </div>
      )}
    </main>
  )
}
