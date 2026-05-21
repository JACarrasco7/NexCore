/**
 * exercisedb-provider.ts
 *
 * Provider ExerciseDB (AscendAPI) vía RapidAPI.
 * Requiere EXERCISEDB_RAPIDAPI_KEY en .env
 *
 * Plan mínimo: $12.99/mes — uso comercial permitido.
 * Docs: https://docs.ascendapi.com/api-reference/introduction
 *
 * Datos: 1,300+ ejercicios con GIFs animados (HD), músculos,
 * equipamiento, instrucciones paso a paso.
 */

const BASE = 'https://exercisedb.p.rapidapi.com'

export type ExerciseDBItem = {
  exerciseId: string
  name: string
  gifUrl: string // GIF animado (HD)
  targetMuscles: string[] // músculos primarios
  secondaryMuscles: string[] // músculos secundarios
  bodyParts: string[] // grupos corporales
  equipments: string[] // equipamiento necesario
  instructions: string[] // instrucciones paso a paso
}

export type ExerciseDBResult = {
  exerciseId: string
  name: string
  gifUrl: string
  targetMuscles: string[]
  secondaryMuscles: string[]
  bodyParts: string[]
  equipment: string[]
  instructions: string[]
  source: 'exercisedb'
}

function normalize(item: ExerciseDBItem): ExerciseDBResult {
  return {
    exerciseId: item.exerciseId,
    name: item.name,
    gifUrl: item.gifUrl,
    targetMuscles: item.targetMuscles ?? [],
    secondaryMuscles: item.secondaryMuscles ?? [],
    bodyParts: item.bodyParts ?? [],
    equipment: item.equipments ?? [],
    instructions: item.instructions ?? [],
    source: 'exercisedb',
  }
}

function headers(apiKey: string) {
  return {
    'X-RapidAPI-Key': apiKey,
    'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com',
    Accept: 'application/json',
  }
}

export function isExerciseDBConfigured(): boolean {
  return Boolean(process.env.EXERCISEDB_RAPIDAPI_KEY)
}

/**
 * Busca ejercicios por nombre.
 * @param name   Nombre del ejercicio (en inglés o español)
 * @param limit  Máximo de resultados (default 5)
 */
export async function searchExerciseDB(name: string, limit = 5): Promise<ExerciseDBResult[]> {
  const apiKey = process.env.EXERCISEDB_RAPIDAPI_KEY
  if (!apiKey) return []

  const url = new URL(`${BASE}/exercises/name/${encodeURIComponent(name.toLowerCase())}`)
  url.searchParams.set('limit', String(limit))
  url.searchParams.set('offset', '0')

  try {
    const res = await fetch(url.toString(), {
      headers: headers(apiKey),
      signal: AbortSignal.timeout(6000),
      // ⚠️ ExerciseDB prohíbe caché permanente (términos de uso)
      // Usamos revalidate corto para cumplir TOS
      next: { revalidate: 3600 },
    })

    if (!res.ok) {
      console.error(`[exercisedb] search HTTP ${res.status}`)
      return []
    }

    const data: ExerciseDBItem[] = await res.json()
    return (Array.isArray(data) ? data : []).map(normalize).slice(0, limit)
  } catch (err) {
    console.error('[exercisedb] search error', err)
    return []
  }
}

/**
 * Obtiene un ejercicio por su ID único.
 */
export async function getExerciseDBById(exerciseId: string): Promise<ExerciseDBResult | null> {
  const apiKey = process.env.EXERCISEDB_RAPIDAPI_KEY
  if (!apiKey) return null

  try {
    const res = await fetch(`${BASE}/exercises/exercise/${exerciseId}`, {
      headers: headers(apiKey),
      signal: AbortSignal.timeout(6000),
      next: { revalidate: 3600 },
    })

    if (!res.ok) {
      console.error(`[exercisedb] getById HTTP ${res.status}`)
      return null
    }

    const data: ExerciseDBItem = await res.json()
    return normalize(data)
  } catch (err) {
    console.error('[exercisedb] getById error', err)
    return null
  }
}

/**
 * Obtiene ejercicios por músculo objetivo.
 * @param muscle  Nombre del músculo en inglés (ej. "pectorals", "biceps")
 */
export async function getExerciseDBByMuscle(
  muscle: string,
  limit = 10
): Promise<ExerciseDBResult[]> {
  const apiKey = process.env.EXERCISEDB_RAPIDAPI_KEY
  if (!apiKey) return []

  const url = new URL(`${BASE}/exercises/target/${encodeURIComponent(muscle.toLowerCase())}`)
  url.searchParams.set('limit', String(limit))

  try {
    const res = await fetch(url.toString(), {
      headers: headers(apiKey),
      signal: AbortSignal.timeout(6000),
      next: { revalidate: 3600 },
    })

    if (!res.ok) {
      console.error(`[exercisedb] byMuscle HTTP ${res.status}`)
      return []
    }

    const data: ExerciseDBItem[] = await res.json()
    return (Array.isArray(data) ? data : []).map(normalize).slice(0, limit)
  } catch (err) {
    console.error('[exercisedb] byMuscle error', err)
    return []
  }
}
