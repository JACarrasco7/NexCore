/**
 * Utilidades para sistema de evolución y tracking de volumen
 * Cálculos de volumen, correlaciones y sugerencias
 */

import { prisma } from '@/lib/prisma'

export interface VolumeByMuscle {
  muscle: string
  volume: number // Número de series
  targetMin?: number
  targetMax?: number
  progress?: 'increase' | 'stable' | 'decrease'
}

export interface VolumeComparison {
  currentWeek: VolumeByMuscle[]
  previousWeek: VolumeByMuscle[]
  changes: Record<string, number> // porcentaje de cambio
}

export interface Correlation {
  metric1: string // "peso" | "volumen" | "adherencia"
  metric2: string
  correlation: number // -1 to 1
  strength: 'fuerte' | 'moderada' | 'débil'
}

export interface AutoSuggestion {
  muscle: string
  type: 'aumento' | 'reduccion' | 'mantenimiento' | 'advertencia'
  reason: string
  recommendation: string
}

/**
 * Calcula volumen total (número de series) para un músculo en un período
 */
export async function calculateWeeklyVolumeByMuscle(
  athleteId: string,
  weekStart: Date,
  weekEnd: Date
): Promise<VolumeByMuscle[]> {
  const sessionLogs = await prisma.sessionLog.findMany({
    where: {
      athleteId,
      date: {
        gte: weekStart,
        lte: weekEnd,
      },
    },
    include: {
      sets: {
        include: {
          // Aunque SetLog no tiene relación de ejercicio, buscamos por nombre
        },
      },
    },
  })

  // Mapeo de ejercicios a músculos
  const muscleGroups: Record<string, number> = {}

  for (const session of sessionLogs) {
    for (const set of session.sets) {
      // Buscar ejercicio en mapping
      const mapping = await prisma.exerciseMuscleMapping.findUnique({
        where: { exercise: set.exercise },
      })

      if (mapping) {
        // Contar serie para músculo primario
        const primary = mapping.primaryMuscle as string
        muscleGroups[primary] = (muscleGroups[primary] || 0) + 1

        // Contar media serie para músculos secundarios
        if (mapping.secondaryMuscles && Array.isArray(mapping.secondaryMuscles)) {
          for (const secondary of mapping.secondaryMuscles as string[]) {
            muscleGroups[secondary] = (muscleGroups[secondary] || 0) + 0.5
          }
        }
      }
    }
  }

  // Obtener objetivos de volumen del atleta
  const setting = await prisma.evolutionSetting.findUnique({
    where: { athleteId },
  })

  const volumeGoals: Record<string, [number, number]> =
    (setting?.volumeGoals as Record<string, [number, number]>) || {}

  // Convertir a array con objetivos
  const result: VolumeByMuscle[] = Object.entries(muscleGroups).map(([muscle, volume]) => {
    const target = volumeGoals[muscle]
    const progress =
      target && volume < target[0]
        ? 'decrease'
        : target && volume > target[1]
          ? 'increase'
          : 'stable'

    return {
      muscle,
      volume: Math.round(volume * 10) / 10, // Redondear a 1 decimal
      targetMin: target?.[0],
      targetMax: target?.[1],
      progress,
    }
  })

  return result.sort((a, b) => b.volume - a.volume)
}

/**
 * Compara volumen entre semana actual y anterior
 */
export async function getVolumeComparison(athleteId: string): Promise<VolumeComparison> {
  const today = new Date()
  const currentWeekStart = new Date(today)
  currentWeekStart.setDate(today.getDate() - today.getDay()) // Domingo actual
  const currentWeekEnd = new Date(currentWeekStart)
  currentWeekEnd.setDate(currentWeekStart.getDate() + 6) // Sábado

  const previousWeekStart = new Date(currentWeekStart)
  previousWeekStart.setDate(currentWeekStart.getDate() - 7)
  const previousWeekEnd = new Date(previousWeekStart)
  previousWeekEnd.setDate(previousWeekStart.getDate() + 6)

  const currentWeek = await calculateWeeklyVolumeByMuscle(
    athleteId,
    currentWeekStart,
    currentWeekEnd
  )
  const previousWeek = await calculateWeeklyVolumeByMuscle(
    athleteId,
    previousWeekStart,
    previousWeekEnd
  )

  // Calcular cambios porcentuales
  const changes: Record<string, number> = {}
  for (const curr of currentWeek) {
    const prev = previousWeek.find((p) => p.muscle === curr.muscle)
    if (prev && prev.volume > 0) {
      changes[curr.muscle] = Math.round(((curr.volume - prev.volume) / prev.volume) * 100)
    } else if (!prev) {
      changes[curr.muscle] = 100 // Nuevo músculo
    }
  }

  return { currentWeek, previousWeek, changes }
}

/**
 * Genera sugerencias automáticas basadas en volumen y adherencia
 * Reglas simples en español, sin citas académicas
 */
export async function generateAutoSuggestions(athleteId: string): Promise<AutoSuggestion[]> {
  const setting = await prisma.evolutionSetting.findUnique({
    where: { athleteId },
  })

  if (!setting?.enableAutoSuggestions) {
    return []
  }

  const comparison = await getVolumeComparison(athleteId)
  const suggestions: AutoSuggestion[] = []
  const threshold = setting.suggestionThreshold || 15

  // Analizar cada músculo
  for (const muscle of comparison.currentWeek) {
    const change = comparison.changes[muscle.muscle] || 0
    const target =
      muscle.targetMin && muscle.targetMax ? [(muscle.targetMin + muscle.targetMax) / 2] : null

    // Regla 1: Volumen bajo respecto al objetivo
    if (target && muscle.volume < target[0] * 0.8) {
      suggestions.push({
        muscle: muscle.muscle,
        type: 'aumento',
        reason: `Volumen en ${muscle.muscle}: ${muscle.volume} series. Objetivo mínimo: ${muscle.targetMin} series.`,
        recommendation: `Considera aumentar series o frecuencia de ejercicios para ${muscle.muscle}.`,
      })
    }

    // Regla 2: Volumen alto respecto al objetivo
    if (target && muscle.volume > target[0] * 1.3) {
      suggestions.push({
        muscle: muscle.muscle,
        type: 'reduccion',
        reason: `Volumen en ${muscle.muscle}: ${muscle.volume} series. Está por encima del objetivo máximo.`,
        recommendation: `Podrías reducir ligeramente el volumen para evitar sobrecarga.`,
      })
    }

    // Regla 3: Cambio porcentual significativo
    if (Math.abs(change) > threshold) {
      const direction = change > 0 ? 'aumentó' : 'redujo'
      const magnitude = Math.abs(change)

      if (magnitude > 30) {
        suggestions.push({
          muscle: muscle.muscle,
          type: 'advertencia',
          reason: `Volumen en ${muscle.muscle} se ${direction} un ${magnitude}% respecto a la semana anterior.`,
          recommendation: `Revisa si fue intencional o si necesitas ajustar la programación.`,
        })
      }
    }
  }

  return suggestions
}

/**
 * Analiza correlaciones básicas entre métricas
 * MVP: volumen vs peso vs adherencia
 */
export async function analyzeCorrelations(athleteId: string): Promise<Correlation[]> {
  const sessionLogs = await prisma.sessionLog.findMany({
    where: { athleteId },
    include: { sets: true },
    orderBy: { date: 'asc' },
    take: 16, // Últimas 4 semanas (aprox)
  })

  if (sessionLogs.length < 4) {
    return [] // No hay suficientes datos
  }

  // Calcular métricas semanales
  const weeks: Array<{
    volumen: number
    pesoPromedio: number
    sesionesCompletadas: number
  }> = []

  let currentWeek = { volumen: 0, totalPeso: 0, totalReps: 0, sesiones: 0 }
  let lastDate = sessionLogs[0].date

  for (const session of sessionLogs) {
    const daysDiff = Math.floor(
      (session.date.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (daysDiff >= 7) {
      if (currentWeek.sesiones > 0) {
        weeks.push({
          volumen: currentWeek.volumen,
          pesoPromedio: currentWeek.totalPeso / currentWeek.totalReps || 0,
          sesionesCompletadas: currentWeek.sesiones,
        })
      }
      currentWeek = { volumen: 0, totalPeso: 0, totalReps: 0, sesiones: 0 }
      lastDate = session.date
    }

    currentWeek.volumen += session.sets.length
    currentWeek.sesiones += 1

    for (const set of session.sets) {
      currentWeek.totalPeso += set.loadKg || 0
      currentWeek.totalReps += set.reps || 0
    }
  }

  if (weeks.length < 2) {
    return []
  }

  // Calcular correlaciones simples
  const correlations: Correlation[] = []

  // Correlación: Volumen vs Peso Promedio
  const volumenVsPeso = calculatePearsonCorrelation(
    weeks.map((w) => w.volumen),
    weeks.map((w) => w.pesoPromedio)
  )

  if (!isNaN(volumenVsPeso)) {
    correlations.push({
      metric1: 'volumen',
      metric2: 'peso',
      correlation: volumenVsPeso,
      strength:
        Math.abs(volumenVsPeso) > 0.7
          ? 'fuerte'
          : Math.abs(volumenVsPeso) > 0.4
            ? 'moderada'
            : 'débil',
    })
  }

  // Correlación: Adherencia (sesiones) vs Volumen
  const adherenciaVolumen = calculatePearsonCorrelation(
    weeks.map((w) => w.sesionesCompletadas),
    weeks.map((w) => w.volumen)
  )

  if (!isNaN(adherenciaVolumen)) {
    correlations.push({
      metric1: 'adherencia',
      metric2: 'volumen',
      correlation: adherenciaVolumen,
      strength:
        Math.abs(adherenciaVolumen) > 0.7
          ? 'fuerte'
          : Math.abs(adherenciaVolumen) > 0.4
            ? 'moderada'
            : 'débil',
    })
  }

  return correlations
}

/**
 * Calcula correlación de Pearson entre dos arrays
 */
function calculatePearsonCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length < 2) return NaN

  const n = x.length
  const meanX = x.reduce((a, b) => a + b) / n
  const meanY = y.reduce((a, b) => a + b) / n

  let numerator = 0
  let sumX2 = 0
  let sumY2 = 0

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX
    const dy = y[i] - meanY
    numerator += dx * dy
    sumX2 += dx * dx
    sumY2 += dy * dy
  }

  const denominator = Math.sqrt(sumX2 * sumY2)
  return denominator === 0 ? 0 : numerator / denominator
}

/**
 * Marca revisión de evolución como completada
 */
export async function markEvolutionReview(athleteId: string, planId: string): Promise<void> {
  await prisma.plan.update({
    where: { id: planId },
    data: { lastReviewDate: new Date() },
  })
}
