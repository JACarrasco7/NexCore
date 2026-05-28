import { z } from 'zod'
import { TAB_KEYS, WIDGET_KEYS } from '@/lib/dashboard-config'

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
})

export type CheckInInput = z.infer<typeof checkInSchema>

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
})

export type BodyMeasurementInput = z.infer<typeof bodyMeasurementSchema>

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
})

export type DailyLogInput = z.infer<typeof dailyLogSchema>

// ─── Session log / set ────────────────────────────────────────────────────────
export const setLogSchema = z.object({
  exerciseIndex: z.number().int().min(0).max(500),
  exercise: z.string().min(1).max(200),
  setNumber: z.number().int().min(1).max(100),
  loadKg: z.number().min(0).max(1000).default(0),
  reps: z.number().int().min(0).max(200).default(0),
  rir: z.number().int().min(0).max(10).default(0),
})

export const sessionLogSchema = z.object({
  athleteId: z.string().min(1),
  planId: z.string().min(1),
  sessionId: z.string().min(1),
  sessionName: z.string().max(200).optional().default(''),
  date: z.string().optional(),
  durationMin: z.number().int().min(0).max(600).optional().nullable(),
  kcalBurned: z.number().int().min(0).max(10000).optional().nullable(),
  heartRateAvg: z.number().int().min(0).max(300).optional().nullable(),
  rpeOverall: z.number().min(1).max(10).optional().nullable(),
  source: z.string().max(50).optional().default('manual'),
  notes: z.string().max(2000).optional().nullable(),
  sets: z.array(setLogSchema).optional().default([]),
})

export type SessionLogInput = z.infer<typeof sessionLogSchema>

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
})

export type NutritionLogInput = z.infer<typeof nutritionLogSchema>

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
  videoUrl: z.string().url().max(500).optional().or(z.literal('')),
  weekNumber: z.number().int().min(1).max(52).optional(),
  order: z.number().int().min(0).optional(),
  warmupSets: z.number().int().min(0).max(10).optional(),
  targetRpe: z.number().min(1).max(10).optional(),
  supersetGroup: z.string().max(50).optional(),
  // ── Progresión estructurada ───────────────────────────────────────────────
  progressionMethod: z.enum(['double', 'rep_target', 'rir_driven']).optional(),
  progressionIncrementKg: z.number().min(0).max(50).optional(),
  repTargetMax: z.number().int().min(1).max(100).optional(),
  supersetGroup: z.string().max(50).optional(),
})

const workoutSessionSchema = z.object({
  name: z.string().min(1).max(200),
  order: z.number().int().min(0).optional(),
  exercises: z.array(exercisePrescriptionSchema).optional().default([]),
})

export const planSchema = z.object({
  athleteId: z.string().min(1),
  block: z.string().max(100).optional().default(''),
  title: z.string().min(1).max(200),
  weeksCount: z.number().int().min(1).max(16).optional().default(4),
  sessions: z.array(workoutSessionSchema).optional().default([]),
})

export type PlanInput = z.infer<typeof planSchema>

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
  weekNumber: z.number().int().min(1).optional().default(1),
})

const nutritionMealSchema = z.object({
  name: z.string().min(1).max(200),
  time: z.string().max(10).optional(),
  order: z.number().int().min(0).optional(),
  foods: z.array(nutritionFoodSchema).optional().default([]),
})

export const nutritionPlanSchema = z.object({
  athleteId: z.string().min(1).optional(),
  title: z.string().min(1).max(200),
  phase: z.string().max(100).optional(),
  kcalTarget: z.number().int().min(0).max(20000).optional(),
  proteinG: z.number().min(0).max(1000).optional(),
  carbsG: z.number().min(0).max(2000).optional(),
  fatG: z.number().min(0).max(1000).optional(),
  notes: z.string().max(3000).optional().nullable(),
  meals: z.array(nutritionMealSchema).optional().default([]),
})

export type NutritionPlanInput = z.infer<typeof nutritionPlanSchema>

// ─── Message ──────────────────────────────────────────────────────────────────
export const messageSchema = z.object({
  toUserId: z.string().min(1),
  content: z.string().min(1).max(5000),
  athleteId: z.string().optional().nullable(),
})

export type MessageInput = z.infer<typeof messageSchema>

// ─── Athlete compare ──────────────────────────────────────────────────────────
export const compareAthletesSchema = z.object({
  ids: z.array(z.string().min(1)).min(2).max(5),
})

export type CompareAthletesInput = z.infer<typeof compareAthletesSchema>

const dashboardTabEnum = z.enum(TAB_KEYS)
const dashboardWidgetEnum = z.enum(WIDGET_KEYS)

export const dashboardLayoutSchema = z.object({
  activeTab: dashboardTabEnum.optional(),
  hidden: z.array(dashboardWidgetEnum).optional(),
  order: z
    .object({
      summary: z.array(dashboardWidgetEnum).optional(),
      training: z.array(dashboardWidgetEnum).optional(),
      recovery: z.array(dashboardWidgetEnum).optional(),
      nutrition: z.array(dashboardWidgetEnum).optional(),
      body: z.array(dashboardWidgetEnum).optional(),
    })
    .partial()
    .optional(),
})

export const nutritionTargetSchema = z.object({
  athleteId: z.string().min(1).optional(),
  mode: z.enum(['FIXED', 'FLEXIBLE']).optional(),
  kcalTarget: z.number().int().min(0).max(10000),
  proteinG: z.number().int().min(0).max(1000),
  carbsG: z.number().int().min(0).max(2000),
  fatG: z.number().int().min(0).max(1000),
})

export type DashboardLayoutInput = z.infer<typeof dashboardLayoutSchema>
export type NutritionTargetInput = z.infer<typeof nutritionTargetSchema>

// ─── Notification ─────────────────────────────────────────────────────────────
export const notificationSchema = z.object({
  userId: z.string().min(1),
  title: z.string().min(1).max(200),
  body: z.string().max(5000).optional().nullable(),
  link: z.string().max(500).optional().nullable(),
  type: z
    .enum([
      'CHECK_IN_RESPONDED',
      'COACH_NOTE',
      'NEW_MESSAGE',
      'PR_ACHIEVED',
      'PLAN_ASSIGNED',
      'REMINDER_CHECK_IN',
      'ALERT_ADHERENCE_LOW',
      'ALERT_SLEEP_LOW',
      'SYSTEM',
    ])
    .optional()
    .default('SYSTEM'),
  read: z.boolean().optional().default(false),
})

export type NotificationInput = z.infer<typeof notificationSchema>

// ─── Notification mark-read ─────────────────────────────────────────────────
export const notificationMarkReadSchema = z.object({
  ids: z.union([z.string(), z.array(z.string()).min(1)]),
})

export type NotificationMarkReadInput = z.infer<typeof notificationMarkReadSchema>

// ─── Webhook OneSignal ────────────────────────────────────────────────────────
export const onesignalWebhookSchema = z.object({
  event: z.string(),
  data: z.record(z.string(), z.any()).optional(),
})

export type OnesignalWebhookInput = z.infer<typeof onesignalWebhookSchema>

// ─── Dashboard preset ───────────────────────────────────────────────────────
export const dashboardPresetSchema = z.object({
  activeTab: z.string().optional(),
  hidden: z.array(z.string()).optional(),
  order: z.record(z.string(), z.array(z.string())).optional(),
})

export type DashboardPresetInput = z.infer<typeof dashboardPresetSchema>

// ─── Coach profile update ───────────────────────────────────────────────────
export const coachUpdateSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  phone: z.string().max(20).optional(),
  bio: z.string().max(500).optional(),
})

export type CoachUpdateInput = z.infer<typeof coachUpdateSchema>

// ─── OTP validate ───────────────────────────────────────────────────────────
export const otpValidateSchema = z.object({
  email: z.string().email('Email inválido'),
  code: z.string().regex(/^\d{6}$/, 'Código debe ser 6 dígitos'),
  type: z.enum(['LOGIN', 'SIGNATURE', 'RESET']).optional().default('LOGIN'),
})

export type OtpValidateInput = z.infer<typeof otpValidateSchema>

// ─── Team ─────────────────────────────────────────────────────────────────────
export const teamCreateSchema = z.object({
  name: z
    .string()
    .min(1)
    .transform((s) => s.trim()),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, 'Slug inválido')
    .transform((s) => s.trim().toLowerCase())
    .optional(),
})

export type TeamCreateInput = z.infer<typeof teamCreateSchema>

// ─── Onboarding ───────────────────────────────────────────────────────────────
export const onboardingAthleteSchema = z.object({
  fullName: z.string().min(1, 'Nombre requerido'),
  goal: z.enum(['VOLUMEN', 'DEFINICION', 'MANTENIMIENTO', 'PEAK_WEEK']),
  coachEmail: z.string().email().optional(),
  coachId: z.string().optional(),
  teamId: z.string().optional(),
  weightKg: z.number().positive().optional(),
  phone: z.string().optional(),
  contactEmail: z.string().email().optional(),
  verificationMethod: z.enum(['EMAIL', 'SMS']).optional(),
})

export type OnboardingAthleteInput = z.infer<typeof onboardingAthleteSchema>

// ─── Athlete creation ───────────────────────────────────────────────────────
export const athleteCreateSchema = z.object({
  fullName: z.string().min(1, 'Nombre requerido'),
  goal: z.enum(['VOLUMEN', 'DEFINICION', 'MANTENIMIENTO', 'PEAK_WEEK']).optional(),
  teamId: z.string().optional(),
  coachId: z.string().optional(),
  phone: z.string().optional(),
  contactEmail: z.string().email().optional(),
  primaryComment: z.string().optional(),
  phaseLabel: z.string().optional(),
  measurementCadence: z.string().optional(),
  measurementEveryDays: z.number().int().optional(),
  reviewCadence: z.string().optional(),
  reviewEveryDays: z.number().int().optional(),
  healthConnections: z.array(z.any()).optional(),
})

export type AthleteCreateInput = z.infer<typeof athleteCreateSchema>

// ─── Register ───────────────────────────────────────────────────────────────
export const registerSchema = z
  .object({
    email: z.string().email('Email inválido').max(254),
    password: z.string().min(8, 'Mínimo 8 caracteres').max(128),
    name: z.string().min(1, 'Nombre requerido').max(100),
    phone: z.string().max(20).optional(),
    role: z.enum(['ATHLETE', 'COACH']).optional().default('ATHLETE'),
    verificationMethod: z.enum(['EMAIL', 'SMS']).optional().default('EMAIL'),
  })
  .refine(
    (data) => {
      if (data.role === 'COACH' && !data.phone?.trim()) return false
      if (data.role === 'ATHLETE' && data.verificationMethod === 'SMS' && !data.phone?.trim())
        return false
      return true
    },
    { message: 'El teléfono es requerido', path: ['phone'] }
  )

export type RegisterInput = z.infer<typeof registerSchema>

// ─── Team coach invite ───────────────────────────────────────────────────────
export const teamCoachInviteSchema = z.object({
  teamId: z.string().min(1),
  invitedEmail: z.string().email(),
  inviteRole: z.enum(['ADMIN', 'COACH', 'MEMBER']).optional().default('MEMBER'),
})

export type TeamCoachInviteInput = z.infer<typeof teamCoachInviteSchema>

// ─── Exercise note ───────────────────────────────────────────────────────────
export const exerciseNoteSchema = z.object({
  athleteId: z.string().min(1),
  exerciseName: z.string().min(1).max(200),
  content: z.string().min(1).max(2000),
})

export type ExerciseNoteInput = z.infer<typeof exerciseNoteSchema>

// ─── Verify email ───────────────────────────────────────────────────────────
export const verifyEmailSchema = z.object({
  token: z.string().min(1),
  email: z.string().email(),
})

export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>

// ─── Webhook payloads ───────────────────────────────────────────────────────
export const resendWebhookSchema = z.object({
  event: z.string().optional(),
  message: z
    .object({
      id: z.string().optional(),
    })
    .optional(),
  id: z.string().optional(),
})

export type ResendWebhookInput = z.infer<typeof resendWebhookSchema>

export const twilioWebhookSchema = z.object({
  MessageSid: z.string().optional(),
  MessageStatus: z.string().optional(),
})

export type TwilioWebhookInput = z.infer<typeof twilioWebhookSchema>
