export type AthleteProfile = {
  id: string;
  userId: string | null;
  fullName: string;
  teamId?: string | null;
  goal: "volumen" | "definicion" | "mantenimiento" | "peak-week";
  phaseLabel: string;
  coachName: string;
  coachUserId: string | null;
  phone?: string | null;
  contactEmail?: string | null;
  primaryComment?: string | null;
  healthConnections: string[];
};

export type HighIntensityTechnique =
  | "drop_set"
  | "rest_pause"
  | "myo_reps"
  | "super_set"
  | "giant_set"
  | "cluster"
  | "tempo"
  | "pre_fatiga"
  | "eccentrico"
  | "isometrico"
  | "amrap";

export const TECHNIQUE_LABELS: Record<HighIntensityTechnique, string> = {
  drop_set:    "Drop Set",
  rest_pause:  "Rest-Pause",
  myo_reps:    "Myo-Reps",
  super_set:   "Super Set",
  giant_set:   "Giant Set",
  cluster:     "Cluster Set",
  tempo:       "Tempo",
  pre_fatiga:  "Pre-Fatiga",
  eccentrico:  "Excéntrico",
  isometrico:  "Isométrico",
  amrap:       "AMRAP",
};

export type ExercisePrescription = {
  exercise: string;
  sets: number;
  reps: string;
  targetRir?: string;
  restSeconds?: number;
  notes?: string;
  // ── Técnicas de alta intensidad ──────────────────
  technique?: HighIntensityTechnique | string;
  techniqueDetail?: string;
  // ── Carga y tempo ────────────────────────────────
  loadKg?: number;
  loadNote?: string;
  tempoEcc?: number;
  tempoPause?: number;
  tempoConc?: number;
  // ── Coach cues y progresión ──────────────────────
  coachCue?: string;
  progressionNote?: string;
  videoUrl?: string;
};

export type WorkoutSession = {
  id: string;
  name: string;
  block: string;
  exercises: ExercisePrescription[];
};

export type TrainingPlan = {
  id: string;
  athleteId: string;
  title: string;
  weekLabel: string;
  sessions: WorkoutSession[];
};

export type CheckInSummary = {
  athleteId: string;
  weightAverage: string;
  stepsAverage: number;
  adherence: number;
  sleepAverageHours: number;
  summary: string;
};

export type CoachAlert = {
  athleteId: string;
  severity: "info" | "warning" | "danger";
  title: string;
  detail: string;
};

export type CheckInEntry = {
  id: string;
  athleteId: string;
  weekLabel: string;
  date: string;
  weightKg: number;
  stepsAvg: number;
  sleepHours: number;
  adherencePct: number;
  sensations: string;
  notes: string;
  coachNote?: string | null;
};

export type DailyLogEntry = {
  id: string;
  athleteId: string;
  date: string;
  weightKg?: number | null;
  steps?: number | null;
  sleepHours?: number | null;
  waistCm?: number | null;
  bodyFatPct?: number | null;
  notes?: string;
};

export type SetLog = {
  exerciseIndex: number;
  exercise: string;
  setNumber: number;
  loadKg: number;
  reps: number;
  rir: number;
};

export type SessionLog = {
  id: string;
  athleteId: string;
  planId: string;
  sessionId: string;
  sessionName: string;
  date: string;
  notes: string;
  durationMin?: number | null;
  kcalBurned?: number | null;
  heartRateAvg?: number | null;
  source?: string;
  sets: SetLog[];
};

export type MealFood = {
  id: string;
  food: string;
  quantity: number;
  unit: string;
  kcal?: number | null;
  proteinG?: number | null;
  carbsG?: number | null;
  fatG?: number | null;
  order: number;
};

export type Meal = {
  id: string;
  name: string;
  time: string;
  order: number;
  foods: MealFood[];
};

export type NutritionPlan = {
  id: string;
  athleteId: string;
  coachId: string;
  title: string;
  phase: string;
  kcalTarget: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  notes?: string | null;
  isActive: boolean;
  createdAt: string;
  meals: Meal[];
};

export type ServicePlan = {
  id: string;
  coachId: string;
  name: string;
  description?: string | null;
  priceEur: number;
  durationWeeks: number;
  includesNutrition: boolean;
  checkinFreqDays: number;
  createdAt: string;
  _count?: { athletes: number };
};

export type ExerciseNote = {
  id: string;
  athleteId: string;
  exerciseName: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};
