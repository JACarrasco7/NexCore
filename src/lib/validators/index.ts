import { z } from "zod";
import { TAB_KEYS, WIDGET_KEYS } from "@/lib/dashboard-config";

// ─── Check-in ─────────────────────────────────────────────────────────────────
export const checkInSchema = z.object({
  athleteId: z.string().min(1),
  date: z.string().optional(),
  weekLabel: z.string().optional(),
  weightKg: z.number().min(30).max(300).optional().nullable(),
  adherencePct: z.number().min(0).max(100).optional().nullable(),
  sleepAvg: z.number().min(0).max(24).optional().nullable(),
  stepsAvg: z.number().min(0).max(100000).optional().nullable(),
  moodAvg: z.number().min(1).max(10).optional().nullable(),
  fatigueAvg: z.number().min(1).max(10).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  coachNote: z.string().max(2000).optional().nullable(),
  photos: z.array(z.string()).optional(),
});

export type CheckInInput = z.infer<typeof checkInSchema>;

// ─── Body measurement ─────────────────────────────────────────────────────────
export const bodyMeasurementSchema = z.object({
  athleteId: z.string().min(1),
  date: z.string().optional(),
  weightKg: z.number().min(30).max(300).optional().nullable(),
  bodyFatPct: z.number().min(0).max(60).optional().nullable(),
  muscleMassKg: z.number().min(0).max(120).optional().nullable(),
  neckCm: z.number().min(0).max(100).optional().nullable(),
  shoulderCm: z.number().min(0).max(200).optional().nullable(),
  chestCm: z.number().min(0).max(200).optional().nullable(),
  waistCm: z.number().min(0).max(200).optional().nullable(),
  hipCm: z.number().min(0).max(200).optional().nullable(),
  leftArmCm: z.number().min(0).max(100).optional().nullable(),
  rightArmCm: z.number().min(0).max(100).optional().nullable(),
  leftThighCm: z.number().min(0).max(150).optional().nullable(),
  rightThighCm: z.number().min(0).max(150).optional().nullable(),
  leftCalfCm: z.number().min(0).max(100).optional().nullable(),
  rightCalfCm: z.number().min(0).max(100).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export type BodyMeasurementInput = z.infer<typeof bodyMeasurementSchema>;

// ─── Daily log ────────────────────────────────────────────────────────────────
export const dailyLogSchema = z.object({
  athleteId: z.string().min(1),
  date: z.string().optional(),
  weightKg: z.number().min(30).max(300).optional().nullable(),
  steps: z.number().min(0).max(100000).int().optional().nullable(),
  sleepHours: z.number().min(0).max(24).optional().nullable(),
  waistCm: z.number().min(0).max(200).optional().nullable(),
  bodyFatPct: z.number().min(0).max(60).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export type DailyLogInput = z.infer<typeof dailyLogSchema>;

// ─── Session log / set ────────────────────────────────────────────────────────
export const setLogSchema = z.object({
  exerciseIndex: z.number().int().min(0).max(500),
  exercise: z.string().min(1).max(200),
  setNumber: z.number().int().min(1).max(100),
  loadKg: z.number().min(0).max(1000).default(0),
  reps: z.number().int().min(0).max(200).default(0),
  rir: z.number().int().min(0).max(10).default(0),
});

export const sessionLogSchema = z.object({
  athleteId: z.string().min(1),
  planId: z.string().min(1),
  sessionId: z.string().min(1),
  sessionName: z.string().max(200).optional().default(""),
  date: z.string().optional(),
  durationMin: z.number().int().min(0).max(600).optional().nullable(),
  kcalBurned: z.number().int().min(0).max(10000).optional().nullable(),
  heartRateAvg: z.number().int().min(0).max(300).optional().nullable(),
  rpeOverall: z.number().min(1).max(10).optional().nullable(),
  source: z.string().max(50).optional().default("manual"),
  notes: z.string().max(2000).optional().nullable(),
  sets: z.array(setLogSchema).optional().default([]),
});

export type SessionLogInput = z.infer<typeof sessionLogSchema>;

// ─── Nutrition log ────────────────────────────────────────────────────────────
export const nutritionLogSchema = z.object({
  athleteId: z.string().min(1),
  mealName: z.string().max(200).optional().nullable(),
  kcal: z.number().min(0).max(10000).optional().nullable(),
  proteinG: z.number().min(0).max(500).optional().nullable(),
  carbsG: z.number().min(0).max(1000).optional().nullable(),
  fatG: z.number().min(0).max(500).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  loggedAt: z.string().optional(),
});

export type NutritionLogInput = z.infer<typeof nutritionLogSchema>;

// ─── Plan ─────────────────────────────────────────────────────────────────────
const exercisePrescriptionSchema = z.object({
  exercise: z.string().min(1).max(200),
  sets: z.number().int().min(1).max(100),
  reps: z.string().max(50),
  targetRir: z.string().max(20).optional(),
  restSeconds: z.number().int().min(0).max(600).optional(),
  notes: z.string().max(1000).optional(),
  technique: z.string().max(50).optional(),
  techniqueDetail: z.string().max(500).optional(),
  loadKg: z.number().min(0).max(1000).optional(),
  loadNote: z.string().max(200).optional(),
  tempoEcc: z.number().min(0).max(30).optional(),
  tempoPause: z.number().min(0).max(30).optional(),
  tempoConc: z.number().min(0).max(30).optional(),
  coachCue: z.string().max(500).optional(),
  progressionNote: z.string().max(500).optional(),
  videoUrl: z.string().url().max(500).optional().or(z.literal("")),
  order: z.number().int().min(0).optional(),
});

const workoutSessionSchema = z.object({
  name: z.string().min(1).max(200),
  block: z.string().max(100).optional().default(""),
  order: z.number().int().min(0).optional(),
  exercises: z.array(exercisePrescriptionSchema).optional().default([]),
});

export const planSchema = z.object({
  athleteId: z.string().min(1),
  coachId: z.string().min(1),
  title: z.string().min(1).max(200),
  weekLabel: z.string().min(1).max(100),
  sessions: z.array(workoutSessionSchema).optional().default([]),
});

export type PlanInput = z.infer<typeof planSchema>;

// ─── Nutrition plan ───────────────────────────────────────────────────────────
const nutritionFoodSchema = z.object({
  food: z.string().min(1).max(200),
  quantity: z.number().min(0).max(5000).optional(),
  unit: z.string().max(20).optional(),
  kcal: z.number().min(0).max(5000).optional().nullable(),
  proteinG: z.number().min(0).max(500).optional().nullable(),
  carbsG: z.number().min(0).max(1000).optional().nullable(),
  fatG: z.number().min(0).max(500).optional().nullable(),
  order: z.number().int().min(0).optional(),
});

const nutritionMealSchema = z.object({
  name: z.string().min(1).max(200),
  time: z.string().max(10).optional(),
  order: z.number().int().min(0).optional(),
  foods: z.array(nutritionFoodSchema).optional().default([]),
});

export const nutritionPlanSchema = z.object({
  athleteId: z.string().min(1),
  title: z.string().min(1).max(200),
  phase: z.string().max(100).optional(),
  kcalTarget: z.number().int().min(0).max(20000).optional(),
  proteinG: z.number().min(0).max(1000).optional(),
  carbsG: z.number().min(0).max(2000).optional(),
  fatG: z.number().min(0).max(1000).optional(),
  notes: z.string().max(3000).optional().nullable(),
  meals: z.array(nutritionMealSchema).optional().default([]),
});

export type NutritionPlanInput = z.infer<typeof nutritionPlanSchema>;

// ─── Message ──────────────────────────────────────────────────────────────────
export const messageSchema = z.object({
  toUserId: z.string().min(1),
  content: z.string().min(1).max(5000),
  athleteId: z.string().optional().nullable(),
});

export type MessageInput = z.infer<typeof messageSchema>;

// ─── Athlete compare ──────────────────────────────────────────────────────────
export const compareAthletesSchema = z.object({
  ids: z.array(z.string().min(1)).min(2).max(5),
});

export type CompareAthletesInput = z.infer<typeof compareAthletesSchema>;

const dashboardTabEnum = z.enum(TAB_KEYS);
const dashboardWidgetEnum = z.enum(WIDGET_KEYS);

export const dashboardLayoutSchema = z.object({
  activeTab: dashboardTabEnum.optional(),
  hidden: z.array(dashboardWidgetEnum).optional(),
  order: z.object({
    summary: z.array(dashboardWidgetEnum).optional(),
    training: z.array(dashboardWidgetEnum).optional(),
    recovery: z.array(dashboardWidgetEnum).optional(),
    nutrition: z.array(dashboardWidgetEnum).optional(),
    body: z.array(dashboardWidgetEnum).optional(),
  }).partial().optional(),
});

export const nutritionTargetSchema = z.object({
  athleteId: z.string().min(1).optional(),
  mode: z.enum(["FIXED", "FLEXIBLE"]).optional(),
  kcalTarget: z.number().int().min(0).max(10000),
  proteinG: z.number().int().min(0).max(1000),
  carbsG: z.number().int().min(0).max(2000),
  fatG: z.number().int().min(0).max(1000),
});

export type DashboardLayoutInput = z.infer<typeof dashboardLayoutSchema>;
export type NutritionTargetInput = z.infer<typeof nutritionTargetSchema>;
