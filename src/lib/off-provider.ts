/**
 * off-provider.ts
 *
 * Provider Open Food Facts directo (sin pasar por wger).
 * Añade búsqueda por código de barras, imágenes de producto, NOVA score y alérgenos.
 *
 * API gratuita, sin key, rate limit generoso.
 * Docs: https://openfoodfacts.github.io/openfoodfacts-server/api/
 */

const BASE = 'https://world.openfoodfacts.org'
const FIELDS =
  'code,product_name,product_name_es,brands,nutriments,nutriscore_grade,nova_group,image_front_url,allergens_tags,ecoscore_grade'

export type OFFNutriments = {
  'energy-kcal_100g'?: number
  proteins_100g?: number
  carbohydrates_100g?: number
  fat_100g?: number
  fiber_100g?: number
  sodium_100g?: number
  sugars_100g?: number
  'saturated-fat_100g'?: number
}

export type OFFRawProduct = {
  code?: string
  product_name?: string
  product_name_es?: string
  brands?: string
  nutriments?: OFFNutriments
  nutriscore_grade?: string // "a" | "b" | "c" | "d" | "e"
  nova_group?: number // 1=sin procesar … 4=ultraprocesado
  image_front_url?: string
  allergens_tags?: string[] // ["en:gluten", "en:milk"]
  ecoscore_grade?: string // "a" | "b" | "c" | "d" | "e" (impacto ambiental)
}

export type OFFFoodResult = {
  barcode?: string
  name: string
  brand?: string
  kcalPer100: number
  proteinPer100: number
  carbsPer100: number
  fatPer100: number
  fiberPer100?: number
  sodiumPer100?: number
  sugarsPer100?: number
  saturatedFatPer100?: number
  nutriscore?: string
  novaGroup?: number
  ecoScore?: string
  imageUrl?: string
  allergens?: string[] // ["gluten", "milk"]
  unit: 'g'
  source: 'open-food-facts'
}

function normalize(raw: OFFRawProduct): OFFFoodResult | null {
  const n = raw.nutriments ?? {}
  const kcal = n['energy-kcal_100g'] ?? 0
  const name = (raw.product_name_es || raw.product_name || '').trim()

  if (!name || kcal <= 0) return null

  return {
    barcode: raw.code,
    name,
    brand: raw.brands?.trim() || undefined,
    kcalPer100: kcal,
    proteinPer100: n.proteins_100g ?? 0,
    carbsPer100: n.carbohydrates_100g ?? 0,
    fatPer100: n.fat_100g ?? 0,
    fiberPer100: n.fiber_100g,
    sodiumPer100: n.sodium_100g,
    sugarsPer100: n.sugars_100g,
    saturatedFatPer100: n['saturated-fat_100g'],
    nutriscore: raw.nutriscore_grade || undefined,
    novaGroup: raw.nova_group,
    ecoScore: raw.ecoscore_grade || undefined,
    imageUrl: raw.image_front_url || undefined,
    allergens: raw.allergens_tags?.map((t) => t.replace(/^en:/, '')).filter(Boolean),
    unit: 'g',
    source: 'open-food-facts',
  }
}

/**
 * Busca alimentos por nombre.
 * @param query  Texto de búsqueda
 * @param limit  Máximo de resultados (default 12)
 */
export async function searchOFFFoods(query: string, limit = 12): Promise<OFFFoodResult[]> {
  if (!query.trim()) return []

  const url = new URL(`${BASE}/cgi/search.pl`)
  url.searchParams.set('search_terms', query.trim())
  url.searchParams.set('action', 'process')
  url.searchParams.set('json', '1')
  url.searchParams.set('page_size', String(limit))
  url.searchParams.set('fields', FIELDS)

  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(6000),
      next: { revalidate: 3600 }, // 1h
    })

    if (!res.ok) {
      console.error(`[off] search HTTP ${res.status}`)
      return []
    }

    const data: { products?: OFFRawProduct[] } = await res.json()
    return (data.products ?? [])
      .map(normalize)
      .filter((x): x is OFFFoodResult => x !== null)
      .slice(0, limit)
  } catch (err) {
    console.error('[off] search error', err)
    return []
  }
}

/**
 * Busca por código de barras (EAN-13, EAN-8, UPC, etc.).
 * @param barcode  Código de barras del producto
 */
export async function getOFFProductByBarcode(barcode: string): Promise<OFFFoodResult | null> {
  const clean = barcode.trim().replace(/\D/g, '')
  if (!clean) return null

  const url = `${BASE}/api/v2/product/${clean}.json?fields=${FIELDS}`

  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(6000),
      next: { revalidate: 3600 }, // 1h
    })

    if (!res.ok) {
      console.error(`[off] barcode HTTP ${res.status}`)
      return null
    }

    const data: { status: number; product?: OFFRawProduct } = await res.json()

    if (data.status !== 1 || !data.product) return null
    return normalize(data.product)
  } catch (err) {
    console.error('[off] barcode error', err)
    return null
  }
}

/**
 * Calcula macros para una cantidad en gramos.
 */
export function macrosForOFFFood(food: OFFFoodResult, quantityG: number) {
  const factor = quantityG / 100
  return {
    quantity: quantityG,
    unit: 'g',
    kcal: Math.round(food.kcalPer100 * factor),
    protein: Math.round(food.proteinPer100 * factor * 10) / 10,
    carbs: Math.round(food.carbsPer100 * factor * 10) / 10,
    fat: Math.round(food.fatPer100 * factor * 10) / 10,
    fiber: food.fiberPer100 != null ? Math.round(food.fiberPer100 * factor * 10) / 10 : undefined,
    sodium:
      food.sodiumPer100 != null ? Math.round(food.sodiumPer100 * factor * 100) / 100 : undefined,
  }
}
