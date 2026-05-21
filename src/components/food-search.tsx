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
          const favList = (data.favorites || []).map((f: any) => `${f.foodName}|${f.source}` as string)
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
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar alimento..."
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
            <div className="px-4 py-3 text-sm text-gray-500">Buscando...</div>
          )}

          {!loading && results.length === 0 && query && (
            <div className="px-4 py-3 text-sm text-gray-500">
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
              className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50 border-b last:border-0"
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 truncate">{food.name}</div>
                <div className="text-xs text-gray-500">
                  {food.kcal && `${food.kcal} kcal`}
                  {food.proteinG && ` • ${food.proteinG}g prot`}
                </div>
              </div>
              {showFavorites && (
                <button
                  onClick={(e) =>
                    toggleFavorite(food.name, food.source, food.kcal, food.proteinG, food.carbsG, food.fatG, e)
                  }
                  className="ml-2 p-1 hover:bg-gray-200 rounded shrink-0"
                >
                  <Star
                    className={`h-4 w-4 ${
                      favorites.has(`${food.name}|${food.source}`)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-gray-400'
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
