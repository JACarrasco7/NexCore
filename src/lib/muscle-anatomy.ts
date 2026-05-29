/**
 * Mapa de músculos → color + coordenadas para resalte anatómico SVG
 * Cada músculo tiene un path SVG que se colorea cuando está activo.
 */

export type MuscleKey =
  | 'pecho'
  | 'espalda'
  | 'biceps'
  | 'triceps'
  | 'deltoides'
  | 'deltoides_anterior'
  | 'deltoides_lateral'
  | 'deltoides_posterior'
  | 'abdominales'
  | 'oblicuos'
  | 'cuadriceps'
  | 'isquiotibiales'
  | 'gluteos'
  | 'gemelos'
  | 'soleo'
  | 'aductores'
  | 'antebrazos'
  | 'trapecio'
  | 'espalda_baja'
  | 'pantorrilla'

export const MUSCLE_COLORS: Record<string, string> = {
  pecho: '#ef4444',
  espalda: '#3b82f6',
  biceps: '#f59e0b',
  triceps: '#8b5cf6',
  deltoides: '#ec4899',
  deltoides_anterior: '#ec4899',
  deltoides_lateral: '#f472b6',
  deltoides_posterior: '#db2777',
  abdominales: '#10b981',
  oblicuos: '#06b6d4',
  cuadriceps: '#f97316',
  isquiotibiales: '#eab308',
  gluteos: '#a855f7',
  gemelos: '#14b8a6',
  soleo: '#0d9488',
  aductores: '#6366f1',
  antebrazos: '#64748b',
  trapecio: '#0891b2',
  espalda_baja: '#1d4ed8',
  pantorrilla: '#14b8a6',
}

// SVG paths for front view muscles
export const FRONT_MUSCLES: Record<string, string> = {
  pecho:
    'M55,65 C55,80 45,95 50,105 L70,105 C75,95 65,80 65,65 Z M45,65 C45,80 35,95 40,105 L60,105 C65,95 55,80 55,65 Z',
  deltoides:
    'M38,45 L30,65 C28,70 30,80 35,85 L45,85 L50,65 Z M82,45 L90,65 C92,70 90,80 85,85 L75,85 L70,65 Z',
  biceps: 'M45,85 L40,115 L52,115 L55,85 Z M75,85 L70,115 L58,115 L65,85 Z',
  abdominales: 'M52,115 L68,115 L66,140 L54,140 Z',
  oblicuos: 'M45,115 L52,115 L54,140 L44,138 Z M75,115 L68,115 L66,140 L76,138 Z',
  cuadriceps: 'M48,148 L44,195 L58,195 L56,148 Z M72,148 L68,195 L54,195 L64,148 Z',
  gemelos: 'M48,200 L46,245 L58,245 L56,200 Z M72,200 L70,245 L58,245 L64,200 Z',
}

export function getMuscleColor(muscle: string): string {
  return MUSCLE_COLORS[muscle] || '#6b7280'
}

export function getMuscleLabel(muscle: string): string {
  const labels: Record<string, string> = {
    pecho: 'Pecho',
    espalda: 'Espalda',
    biceps: 'Bíceps',
    triceps: 'Tríceps',
    deltoides: 'Deltoides',
    deltoides_anterior: 'Deltoides anterior',
    deltoides_lateral: 'Deltoides lateral',
    deltoides_posterior: 'Deltoides posterior',
    abdominales: 'Abdominales',
    oblicuos: 'Oblicuos',
    cuadriceps: 'Cuádriceps',
    isquiotibiales: 'Isquiotibiales',
    gluteos: 'Glúteos',
    gemelos: 'Gemelos',
    soleo: 'Sóleo',
    aductores: 'Aductores',
    antebrazos: 'Antebrazos',
    trapecio: 'Trapecio',
    espalda_baja: 'Espalda baja',
    pantorrilla: 'Pantorrilla',
  }
  return labels[muscle] || muscle
}
