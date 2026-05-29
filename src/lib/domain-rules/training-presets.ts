/**
 * Block periodization presets para culturismo avanzado
 */

export type PresetWeek = {
  sets: number
  reps: string
  rir?: string
  loadPercent?: number
}

export type Preset = {
  name: string
  weeks: PresetWeek[]
}

export const TRAINING_PRESETS: Preset[] = [
  {
    name: 'Acumulación → Intensificación',
    weeks: [
      { sets: 3, reps: '10-12', rir: '3' },
      { sets: 3, reps: '10-12', rir: '2' },
      { sets: 4, reps: '8-10', rir: '2' },
      { sets: 4, reps: '6-8', rir: '1' },
      { sets: 5, reps: '4-6', rir: '1' },
      { sets: 3, reps: '8-10', rir: '3' }, // DELOAD
    ],
  },
  {
    name: 'Lineal fuerza',
    weeks: [
      { sets: 3, reps: '10', loadPercent: 60 },
      { sets: 3, reps: '10', loadPercent: 62.5 },
      { sets: 3, reps: '8', loadPercent: 67.5 },
      { sets: 3, reps: '8', loadPercent: 70 },
      { sets: 3, reps: '6', loadPercent: 75 },
      { sets: 3, reps: '8', rir: '3' }, // DELOAD
    ],
  },
  {
    name: 'Ondulatorio diario',
    weeks: [
      { sets: 3, reps: '12', rir: '2' }, // Lun
      { sets: 5, reps: '4', rir: '1' }, // Vie
      { sets: 3, reps: '10', rir: '2' },
      { sets: 6, reps: '3', rir: '1' },
      { sets: 3, reps: '8', rir: '2' },
      { sets: 4, reps: '6', rir: '2' }, // DELOAD
    ],
  },
  {
    name: 'Especialización',
    weeks: [
      { sets: 4, reps: '8-10', rir: '2' },
      { sets: 4, reps: '8-10', rir: '2' },
      { sets: 5, reps: '6-8', rir: '1' },
      { sets: 5, reps: '6-8', rir: '1' },
      { sets: 6, reps: '4-6', rir: '1' },
      { sets: 3, reps: '10', rir: '3' }, // DELOAD
    ],
  },
  {
    name: 'Volumen alemán',
    weeks: [
      { sets: 10, reps: '10', loadPercent: 60 },
      { sets: 10, reps: '10', loadPercent: 62 },
      { sets: 10, reps: '8', loadPercent: 65 },
      { sets: 10, reps: '8', loadPercent: 67 },
      { sets: 3, reps: '10', rir: '3' }, // DELOAD
    ],
  },
]

/**
 * Aplica un preset a un ejercicio existente
 */
export function applyPresetToExercise(
  exercise: { weeks: { sets: number; reps: string; targetRir?: string }[] },
  preset: Preset
): { sets: number; reps: string; targetRir?: string }[] {
  return preset.weeks.map((w) => ({
    sets: w.sets,
    reps: w.reps,
    targetRir: w.rir,
  }))
}

export function getPresetWeeks(presetName: string): PresetWeek[] | null {
  const preset = TRAINING_PRESETS.find((p) => p.name === presetName)
  return preset?.weeks ?? null
}

export function getPresetByName(name: string): Preset | undefined {
  return TRAINING_PRESETS.find((p) => p.name === name)
}
