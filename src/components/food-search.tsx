'use client'

import { useState, useEffect, useRef } from 'react'
import { apiFetch, apiPost } from '@/lib/store'
import { Search, Star, X } from 'lucide-react'

interface FoodSearchProps {
  onSelect: (food: FoodResult) => void
  onFavoriteToggle?: (foodName: string, source: string, isFavorite: boolean) => void
  showFavorites?: boolean
  provider?: 'auto' | 'off' | 'wger' | 'mfp' | 'local'
}

interface FoodResult {
  name: string
  source: 'off' | 'wger' | 'mfp' | 'local'
  kcal?: number
  proteinG?: number
  carbsG?: number
  fatG?: number
  imageUrl?: string
}

export type { FoodResult }

export function FoodSearch({
  onSelect,
  onFavoriteToggle,
  showFavorites = true,
  provider = 'auto',
}: FoodSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FoodResult[]>([])
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fetch favorites on mount
  useEffect(() => {
    if (showFavorites) {
      apiFetch('/api/favorites/foods')
        .then((data: any) => {
          const favList = (data.favorites || []).map(
            (f: any) => `${f.foodName}|${f.source}` as string
          )
          const favSet = new Set<string>(favList)
          setFavorites(favSet)
        })
        .catch(console.error)
    }
  }, [showFavorites])

  // Fetch foods based on query with AbortController
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }

    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new controller for this request
    abortControllerRef.current = new AbortController()
    setLoading(true)

    const url = `/api/food-catalog?action=search&query=${encodeURIComponent(
      query
    )}&provider=${provider}`

    fetch(url, { signal: abortControllerRef.current.signal })
      .then((r) => r.json())
      .then((data) => {
        const foods = (data.foods || data.results || [])
          .map((f: any) => ({
            name: f.name || f.foodName || f.description || '',
            source: f.source || 'local',
            kcal: f.kcal || f.calories,
            proteinG: f.proteinG || f.protein,
            carbsG: f.carbsG || f.carbs,
            fatG: f.fatG || f.fat,
            imageUrl: f.imageUrl || f.image,
          }))
          .slice(0, 8)
        setResults(foods)
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.error('Error fetching foods:', err)
        }
      })
      .finally(() => setLoading(false))
  }, [query, provider])

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

  const toggleFavorite = async (
    foodName: string,
    source: string,
    kcal: number | undefined,
    proteinG: number | undefined,
    carbsG: number | undefined,
    fatG: number | undefined,
    e: React.MouseEvent
  ) => {
    e.stopPropagation()

    const key = `${foodName}|${source}`
    const isFav = favorites.has(key)
    const method = isFav ? 'DELETE' : 'POST'
    const url = isFav
      ? `/api/favorites/foods?name=${encodeURIComponent(foodName)}&source=${encodeURIComponent(
          source
        )}`
      : '/api/favorites/foods'

    try {
      if (method === 'POST') {
        await apiPost('/api/favorites/foods', { foodName, source, kcal, proteinG, carbsG, fatG })
        const newFavs = new Set(favorites)
        newFavs.add(key)
        setFavorites(newFavs)
        onFavoriteToggle?.(foodName, source, true)
      } else {
        const res = await fetch(url, { method: 'DELETE' })
        if (res.ok) {
          const newFavs = new Set(favorites)
          newFavs.delete(key)
          setFavorites(newFavs)
          onFavoriteToggle?.(foodName, source, false)
        }
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
          placeholder="Buscar alimento..."
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
              <p className="mt-2">Buscando...</p>
            </div>
          )}

          {!loading && results.length === 0 && query && (
            <div className="text-foreground/40 px-4 py-6 text-center text-sm">
              No se encontraron alimentos
            </div>
          )}

          {results.map((food, idx) => (
            <button
              key={`${food.name}-${food.source}-${idx}`}
              onClick={() => {
                onSelect(food)
                setQuery('')
                setResults([])
                setOpen(false)
              }}
              className={`hover:bg-accent/5 flex w-full items-center justify-between px-4 py-3 text-left transition ${idx !== results.length - 1 ? 'border-line border-b' : ''}`}
            >
              <div className="min-w-0 flex-1">
                <div className="text-foreground truncate font-medium">{food.name}</div>
                <div className="text-foreground/50 mt-1 flex flex-wrap gap-2 text-xs">
                  {food.kcal && (
                    <span className="bg-accent/10 text-accent rounded px-2 py-0.5">
                      {Math.round(food.kcal)} kcal
                    </span>
                  )}
                  {food.proteinG && (
                    <span className="text-foreground/50 text-xs">
                      {food.proteinG.toFixed(1)}g prot
                    </span>
                  )}
                  {food.source && <span className="text-foreground/30 text-xs">{food.source}</span>}
                </div>
              </div>
              {showFavorites && (
                <button
                  onClick={(e) =>
                    toggleFavorite(
                      food.name,
                      food.source,
                      food.kcal,
                      food.proteinG,
                      food.carbsG,
                      food.fatG,
                      e
                    )
                  }
                  className="text-foreground/40 hover:text-accent ml-3 shrink-0 p-1 transition"
                  type="button"
                  title={
                    favorites.has(`${food.name}|${food.source}`)
                      ? 'Quitar de favoritos'
                      : 'Agregar a favoritos'
                  }
                >
                  <Star
                    className={`h-4 w-4 transition ${
                      favorites.has(`${food.name}|${food.source}`) ? 'fill-accent text-accent' : ''
                    }`}
                  />
                </button>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
