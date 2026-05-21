/**
 * wger-food-provider.ts
 *
 * Provider de búsqueda de alimentos usando wger.de/api/v2/ingredient/
 * La base de datos de wger sincroniza desde Open Food Facts (~3M productos).
 *
 * Datos disponibles por ingrediente:
 *   name, common_name, brand
 *   energy (kcal/100g), protein, carbohydrates, fat
 *   fiber, sodium, carbohydrates_sugar, fat_saturated
 *   nutriscore, is_vegan, is_vegetarian
 *   source_name ("Open Food Facts"), source_url
 *
 * No requiere API key. Rate limit generoso (uso público permitido).
 */

export type WgerFoodItem = {
  id: number
  name: string
  common_name: string
  brand: string
  energy: number | null // kcal/100g
  protein: string | null // g/100g (como string en la API)
  carbohydrates: string | null // g/100g
  fat: string | null // g/100g
  fiber: string | null
  sodium: string | null
  carbohydrates_sugar: string | null
  fat_saturated: string | null
  nutriscore: string | null // "a" | "b" | "c" | "d" | "e" | null
  is_vegan: boolean | null
  is_vegetarian: boolean | null
  source_name: string
  source_url: string
  language: number
}

export type WgerFoodResult = {
  id: number
  name: string
  brand?: string
  kcalPer100: number
  proteinPer100: number
  carbsPer100: number
  fatPer100: number
  fiberPer100?: number
  sodiumPer100?: number
  nutriscore?: string
  isVegan?: boolean
  isVegetarian?: boolean
  unit: 'g'
  source: 'wger'
}

const BASE = 'https://wger.de/api/v2'

function toFloat(v: string | number | null | undefined): number {
  if (v == null) return 0
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function normalize(item: WgerFoodItem): WgerFoodResult | null {
  if (!item.name?.trim()) return null
  const kcal = toFloat(item.energy)
  if (kcal <= 0) return null

  return {
    id: item.id,
    name: item.name.trim(),
    brand: item.brand?.trim() || undefined,
    kcalPer100: kcal,
    proteinPer100: toFloat(item.protein),
    carbsPer100: toFloat(item.carbohydrates),
    fatPer100: toFloat(item.fat),
    fiberPer100: item.fiber != null ? toFloat(item.fiber) : undefined,
    sodiumPer100: item.sodium != null ? toFloat(item.sodium) : undefined,
    nutriscore: item.nutriscore ?? undefined,
    isVegan: item.is_vegan ?? undefined,
    isVegetarian: item.is_vegetarian ?? undefined,
    unit: 'g',
    source: 'wger',
  }
}

/**
 * Busca alimentos en wger.de por nombre
 * @param query  Texto de búsqueda
 * @param limit  Máximo de resultados (default 12)
 * @param lang   Idioma (default 2 = inglés, para mayor cobertura)
 */
export async function searchWgerFoods(
  query: string,
  limit = 12,
  lang = 2
): Promise<WgerFoodResult[]> {
  if (!query.trim()) return []

  const url = new URL(`${BASE}/ingredient/`)
  url.searchParams.set('format', 'json')
  url.searchParams.set('name', query.trim())
  url.searchParams.set('language', String(lang))
  url.searchParams.set('limit', String(limit))

  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
      next: { revalidate: 3600 }, // cache 1h
    })

    if (!res.ok) {
      console.error(`[wger-food] HTTP ${res.status}`)
      return []
    }

    const data: { count: number; results: WgerFoodItem[] } = await res.json()

    return data.results.map(normalize).filter((x): x is WgerFoodResult => x !== null)
  } catch (err) {
    console.error('[wger-food] Error searching foods:', err)
    return []
  }
}

/**
 * Busca un alimento en inglés Y español y combina resultados únicos
 * Útil para términos en español que pueden tener entradas en inglés
 */
export async function searchWgerFoodsBilingual(
  query: string,
  limit = 10
): Promise<WgerFoodResult[]> {
  const [enResults, esResults] = await Promise.allSettled([
    searchWgerFoods(query, limit, 2), // inglés
    searchWgerFoods(query, limit, 4), // español
  ])

  const en = enResults.status === 'fulfilled' ? enResults.value : []
  const es = esResults.status === 'fulfilled' ? esResults.value : []

  // Combinar y deduplicar por id
  const seen = new Set<number>()
  const combined: WgerFoodResult[] = []

  for (const item of [...es, ...en]) {
    if (!seen.has(item.id)) {
      seen.add(item.id)
      combined.push(item)
    }
  }

  return combined.slice(0, limit)
}

/**
 * Obtiene información completa de un ingrediente por ID
 */
export async function getWgerFoodById(id: number): Promise<WgerFoodResult | null> {
  try {
    const res = await fetch(`${BASE}/ingredient/${id}/?format=json`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(4000),
      next: { revalidate: 86400 }, // cache 24h
    })

    if (!res.ok) return null

    const item: WgerFoodItem = await res.json()
    return normalize(item)
  } catch {
    return null
  }
}

/**
 * Convierte WgerFoodResult a macros para una cantidad dada (en gramos)
 */
export function macrosForWgerFood(
  food: WgerFoodResult,
  quantityG: number
): {
  kcal: number
  proteinG: number
  carbsG: number
  fatG: number
  fiberG?: number
} {
  const factor = quantityG / 100
  return {
    kcal: Math.round(food.kcalPer100 * factor),
    proteinG: Math.round(food.proteinPer100 * factor * 10) / 10,
    carbsG: Math.round(food.carbsPer100 * factor * 10) / 10,
    fatG: Math.round(food.fatPer100 * factor * 10) / 10,
    fiberG: food.fiberPer100 != null ? Math.round(food.fiberPer100 * factor * 10) / 10 : undefined,
  }
}
