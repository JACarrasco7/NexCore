export type LocalExercise = {
  exercise: string
  sets: number
  reps: string
  targetRir?: string
  restSeconds?: number
  notes?: string
  loadKg?: number
  loadNote?: string
  coachCue?: string
  progressionNote?: string
}

export type LocalSession = {
  name: string
  exercises: LocalExercise[]
}
