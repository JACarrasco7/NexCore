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
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar ejercicio..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          className="w-full rounded-lg border border-gray-300 bg-white pl-10 pr-10 py-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('')
              setResults([])
              setOpen(false)
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-lg border border-gray-200 bg-white shadow-lg max-h-96 overflow-y-auto">
          {loading && (
            <div className="px-4 py-3 text-sm text-gray-500">Cargando catálogo...</div>
          )}

          {!loading && results.length === 0 && query && (
            <div className="px-4 py-3 text-sm text-gray-500">
              No se encontraron ejercicios
            </div>
          )}

          {results.map((ex) => (
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
              className="flex w-full items-center justify-between px-4 py-2 text-left hover:bg-gray-50 border-b last:border-0"
            >
              <div className="flex-1">
                <div className="font-medium text-gray-900">{ex.name}</div>
                <div className="text-xs text-gray-500 capitalize">{ex.primaryMuscle}</div>
              </div>
              {showFavorites && (
                <button
                  onClick={(e) => toggleFavorite(ex.name, e)}
                  className="ml-2 p-1 hover:bg-gray-200 rounded shrink-0"
                  type="button"
                >
                  <Star
                    className={`h-4 w-4 ${
                      favorites.has(ex.name)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-gray-400'
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
