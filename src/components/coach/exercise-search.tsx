'use client'

import { useState, useEffect, useRef } from 'react'
import { apiFetch } from '@/lib/store'
import { Search, X } from 'lucide-react'

interface CatalogExercise {
  id: string
  name: string
  primaryMuscle: string
  secondaryMuscles: string[]
  externalImageUrl?: string | null
}

interface ExerciseSearchProps {
  onSelect: (exerciseName: string) => void
  showFavorites?: boolean
}

function formatMuscleName(muscle: string): string {
  return muscle
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

const muscleColors: Record<string, string> = {
  pecho: 'bg-accent/10 text-accent',
  espalda: 'bg-accent/10 text-accent',
  hombro: 'bg-accent/10 text-accent',
  triceps: 'bg-accent/10 text-accent',
  bíceps: 'bg-accent/10 text-accent',
  pierna: 'bg-accent/10 text-accent',
  glúteos: 'bg-accent/10 text-accent',
  gemelos: 'bg-accent/10 text-accent',
  core: 'bg-accent/10 text-accent',
}

export function ExerciseSearch({ onSelect, showFavorites = false }: ExerciseSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CatalogExercise[]>([])
  const [catalog, setCatalog] = useState<CatalogExercise[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [activeMuscle, setActiveMuscle] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLoading(true)
    apiFetch<any>('/api/exercises/catalog')
      .then((data: any) => {
        const allExercises = data.groups?.flatMap((g: any) => g.exercises) || []
        setCatalog(allExercises)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!query.trim() && !activeMuscle) {
      setResults([])
      return
    }

    let filtered = catalog.filter(
      (ex) =>
        !query.trim() ||
        ex.name.toLowerCase().includes(query.toLowerCase()) ||
        ex.primaryMuscle.toLowerCase().includes(query.toLowerCase())
    )

    if (activeMuscle) {
      filtered = filtered.filter((ex) => ex.primaryMuscle === activeMuscle)
    }

    setResults(filtered.slice(0, 10))
  }, [query, catalog, activeMuscle])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const muscles = Array.from(new Set(catalog.map((ex) => ex.primaryMuscle)))

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div className="relative">
        <Search className="text-foreground/40 absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Buscar ejercicio..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          className="border-line bg-surface-strong focus:ring-accent/50 w-full rounded-xl border px-3 py-2.5 pr-10 pl-10 text-sm transition focus:ring-1 focus:outline-none"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('')
              setResults([])
              setOpen(false)
            }}
            className="text-foreground/40 hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 transition"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filtros por músculo */}
      {open && muscles.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          <button
            onClick={() => setActiveMuscle(null)}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
              !activeMuscle
                ? 'bg-accent text-white shadow-sm'
                : 'bg-surface-strong text-foreground/60 hover:bg-surface hover:text-foreground'
            }`}
          >
            Todos
          </button>
          {muscles.map((muscle) => (
            <button
              key={muscle}
              onClick={() => setActiveMuscle(muscle)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                activeMuscle === muscle
                  ? 'bg-accent text-white shadow-sm'
                  : 'bg-surface-strong text-foreground/60 hover:bg-surface hover:text-foreground'
              }`}
            >
              {formatMuscleName(muscle)}
            </button>
          ))}
        </div>
      )}

      {open && (
        <div className="border-line bg-surface absolute top-full right-0 left-0 z-50 mt-2 max-h-96 overflow-hidden overflow-y-auto rounded-2xl border shadow-md">
          {loading && (
            <div className="text-foreground/50 px-4 py-4 text-center text-sm">
              <div className="border-accent/30 border-t-accent inline-block h-4 w-4 animate-spin rounded-full border"></div>
              <p className="mt-2">Cargando catálogo...</p>
            </div>
          )}

          {!loading && results.length === 0 && query && (
            <div className="text-foreground/40 px-4 py-6 text-center text-sm">
              No se encontraron ejercicios
            </div>
          )}

          {results.map((ex, idx) => (
            <div
              key={ex.id}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  onSelect(ex.name)
                  setQuery(ex.name)
                  setResults([])
                  setOpen(false)
                }
              }}
              onClick={() => {
                onSelect(ex.name)
                setQuery(ex.name)
                setResults([])
                setOpen(false)
              }}
              className={`hover:bg-accent/5 flex cursor-pointer items-center gap-3 px-4 py-3 text-left transition ${idx !== results.length - 1 ? 'border-line border-b' : ''}`}
            >
              {ex.externalImageUrl && (
                <img
                  src={ex.externalImageUrl}
                  alt={ex.name}
                  className="h-12 w-12 rounded-lg object-cover"
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="text-foreground font-medium">{ex.name}</div>
                <div className="text-foreground/50 mt-0.5 text-xs">
                  {formatMuscleName(ex.primaryMuscle)}
                </div>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  muscleColors[ex.primaryMuscle] || 'bg-surface-strong text-foreground/60'
                }`}
              >
                {formatMuscleName(ex.primaryMuscle)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
