/**
 * Proxy para la API WGER (wger.de) — ejercicios con músculos trabajados
 *
 * GET /api/wger/exercise-muscles?name=sentadilla
 *
 * Devuelve los músculos principales y secundarios del ejercicio más relevante
 * encontrado en la base de datos WGER (gratuita, sin autenticación).
 *
 * Cacheo en memoria de 24h para no saturar la API externa.
 */

import { NextRequest, NextResponse } from "next/server";

interface WgerMuscle {
  id: number;
  name: string;
  name_en: string;
}

interface WgerExerciseInfo {
  id: number;
  muscles: WgerMuscle[];
  muscles_secondary: WgerMuscle[];
  category: { id: number; name: string };
  translations: { language: number; name: string; description: string }[];
}

interface WgerListResponse {
  count: number;
  results: WgerExerciseInfo[];
}

// Caché en memoria (por instancia de servidor) — TTL 24h
const cache = new Map<string, { data: ExerciseMuscleResult; ts: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export interface ExerciseMuscleResult {
  found: boolean;
  exerciseName?: string;
  category?: string;
  muscles: string[];
  musclesSecondary: string[];
  muscleIds: number[];
  source: "wger" | "cache" | "not-found";
}

// Mapeo WGER ID → nombre en español (basado en lista oficial wger.de/api/v2/muscle/)
const WGER_MUSCLE_NAMES_ES: Record<number, string> = {
  1: "Bíceps",
  2: "Deltoides",
  3: "Serrato anterior",
  4: "Pectoral",
  5: "Tríceps",
  6: "Core (abdomen)",
  7: "Gemelos",
  8: "Glúteos",
  9: "Trapecio",
  10: "Cuádriceps",
  11: "Isquios",
  12: "Espalda (lat)",
  13: "Espalda (lumbar)",
  14: "Oblicuos",
  15: "Sóleo",
};

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name")?.trim();
  if (!name) {
    return NextResponse.json({ error: "Parámetro 'name' requerido" }, { status: 400 });
  }

  const key = name.toLowerCase();

  // Devolver caché si está vigente
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return NextResponse.json({ ...cached.data, source: "cache" });
  }

  try {
    // WGER no tiene endpoint de búsqueda por nombre funcional, así que usamos
    // exerciseinfo con paginación y filtramos por nombre en las traducciones
    // Idioma 4 = Español, 2 = Inglés
    const url = `https://wger.de/api/v2/exerciseinfo/?format=json&language=2&limit=20&offset=0`;
    const res = await fetch(url, {
      next: { revalidate: 86400 }, // cache de Next.js 24h
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      throw new Error(`WGER API HTTP ${res.status}`);
    }

    const data: WgerListResponse = await res.json();

    // Buscar ejercicio cuyo nombre (en cualquier idioma) coincida parcialmente
    const nameLower = key;
    let best: WgerExerciseInfo | null = null;
    let bestScore = 0;

    for (const ex of data.results) {
      for (const t of ex.translations) {
        const tLow = t.name.toLowerCase();
        // Puntuación: coincidencia exacta > contiene > solapamiento
        let score = 0;
        if (tLow === nameLower) score = 100;
        else if (tLow.includes(nameLower) || nameLower.includes(tLow)) score = 50;
        else {
          const words = nameLower.split(/\s+/);
          const matches = words.filter((w) => tLow.includes(w) && w.length > 3).length;
          score = matches * 15;
        }
        if (score > bestScore) {
          bestScore = score;
          best = ex;
        }
      }
    }

    if (!best || bestScore === 0) {
      const result: ExerciseMuscleResult = { found: false, muscles: [], musclesSecondary: [], muscleIds: [], source: "not-found" };
      cache.set(key, { data: result, ts: Date.now() });
      return NextResponse.json(result);
    }

    const muscles = best.muscles.map((m) => WGER_MUSCLE_NAMES_ES[m.id] ?? m.name_en);
    const musclesSecondary = best.muscles_secondary.map((m) => WGER_MUSCLE_NAMES_ES[m.id] ?? m.name_en);
    const muscleIds = best.muscles.map((m) => m.id);

    const exName = best.translations.find((t) => t.language === 2)?.name
      ?? best.translations[0]?.name
      ?? "Ejercicio";

    const result: ExerciseMuscleResult = {
      found: true,
      exerciseName: exName,
      category: best.category.name,
      muscles,
      musclesSecondary,
      muscleIds,
      source: "wger",
    };

    cache.set(key, { data: result, ts: Date.now() });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[WGER proxy] Error:", err);
    // Devuelve no-encontrado sin cachear el error para reintentar
    return NextResponse.json({ found: false, muscles: [], musclesSecondary: [], muscleIds: [], source: "not-found" } satisfies ExerciseMuscleResult);
  }
}
