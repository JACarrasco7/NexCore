'use client'

import { useState, useEffect, useRef } from 'react'
import { apiFetch, apiPost } from '@/lib/store'
import { Search, Star, X } from 'lucide-react'

interface CatalogExercise {
  name: string
  primaryMuscle: string
}

interface ExerciseSearchProps {
  onSelect: (exerciseName: string) => void
  onFavoriteToggle?: (exerciseName: string, isFavorite: boolean) => void
  showFavorites?: boolean
}

export function ExerciseSearch({
  onSelect,
  onFavoriteToggle,
  showFavorites = true,
}: ExerciseSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CatalogExercise[]>([])
  const [catalog, setCatalog] = useState<CatalogExercise[]>([])
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Load catalog once on mount
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

  // Fetch favorites on mount (graceful: only keep if OK)
  useEffect(() => {
    if (!showFavorites) return
    let mounted = true
    ;(async () => {
      try {
        const data = await apiFetch<any>('/api/favorites/exercises').catch(() => null)
        if (!mounted || !data) return
        const favList = (data.favorites || []).map((f: any) => String(f.exerciseName))
        const favSet = new Set<string>(favList)
        setFavorites(favSet)
      } catch (err) {
        // ignore network errors
      }
    })()
    return () => {
      mounted = false
    }
  }, [showFavorites])

  // Filter catalog based on query (local filtering)
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }

    const filtered = catalog
      .filter(
        (ex) =>
          ex.name.toLowerCase().includes(query.toLowerCase()) ||
          ex.primaryMuscle.toLowerCase().includes(query.toLowerCase())
      )
      .slice(0, 10)
    setResults(filtered)
  }, [query, catalog])

  // Handle click-outside to close dropdown
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

  const toggleFavorite = async (exerciseName: string, e: React.MouseEvent) => {
    e.stopPropagation()

    const isFav = favorites.has(exerciseName)
    const method = isFav ? 'DELETE' : 'POST'
    const url = isFav
      ? `/api/favorites/exercises?name=${encodeURIComponent(exerciseName)}`
      : '/api/favorites/exercises'

    try {
      const res = await fetch(url, {
        method,
        ...(method === 'POST' && {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ exerciseName }),
        }),
      })

      if (res.ok) {
        const newFavs = new Set(favorites)
        if (isFav) newFavs.delete(exerciseName)
        else newFavs.add(exerciseName)
        setFavorites(newFavs)
        onFavoriteToggle?.(exerciseName, !isFav)
      }
    } catch (err) {
      console.error('Error toggling favorite:', err)
    }
  }

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

      {open && (
        <div className="border-line bg-surface absolute top-full right-0 left-0 z-50 mt-2 max-h-96 overflow-hidden overflow-y-auto rounded-2xl border shadow-md">
          {loading && (
            <div className="text-foreground/50 px-4 py-4 text-center text-sm">
              <div className="border-accent/30 border-t-accent inline-block h-4 w-4 animate-spin rounded-full border"></div>
              <p className="mt-2">Cargando...</p>
            </div>
          )}

          {!loading && results.length === 0 && query && (
            <div className="text-foreground/40 px-4 py-6 text-center text-sm">
              No se encontraron ejercicios
            </div>
          )}

          {results.map((ex, idx) => (
            <div
              key={ex.name}
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
              className={`flex items-center justify-between px-4 py-3 text-left transition ${idx !== results.length - 1 ? 'border-line border-b' : ''} hover:bg-accent/5 cursor-pointer`}
            >
              <div className="min-w-0 flex-1">
                <div className="text-foreground font-medium">{ex.name}</div>
                <div className="text-foreground/50 mt-0.5 text-xs capitalize">
                  {ex.primaryMuscle}
                </div>
              </div>
              {showFavorites && (
                <button
                  onClick={(e) => toggleFavorite(ex.name, e)}
                  className="text-foreground/40 hover:text-accent ml-3 shrink-0 p-1 transition"
                  type="button"
                  title={favorites.has(ex.name) ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                >
                  <Star
                    className={`h-4 w-4 transition ${
                      favorites.has(ex.name) ? 'fill-accent text-accent' : ''
                    }`}
                  />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
