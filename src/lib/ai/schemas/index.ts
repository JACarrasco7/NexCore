import { z } from 'zod';

/**
 * Output schemas for LLM tasks.
 * Use with tool_use to enforce structure.
 */

// ============ Haiku tasks ============

/**
 * Classify message intent and urgency.
 */
export const classifyMessageSchema = z.object({
  intent: z.enum(['question', 'complaint', 'update', 'emergency', 'other']),
  urgency: z.enum(['low', 'medium', 'high']),
  summary: z.string().max(100),
});
export type ClassifyMessage = z.infer<typeof classifyMessageSchema>;

/**
 * Parse food items from text.
 */
export const parseFoodSchema = z.object({
  items: z.array(
    z.object({
      raw: z.string().describe('Original text'),
      food: z.string().describe('Food name'),
      grams: z.number().min(0).describe('Amount in grams'),
      confidence: z.number().min(0).max(1).describe('0-1 confidence'),
    })
  ),
});
export type ParseFood = z.infer<typeof parseFoodSchema>;

/**
 * Parse set execution (weight, reps, RIR).
 */
export const parseSetSchema = z.object({
  reps: z.number().min(1).max(100),
  weight: z.number().min(0),
  rir: z.number().min(0).max(10),
  notes: z.string().optional(),
});
export type ParseSet = z.infer<typeof parseSetSchema>;

/**
 * Suggest tags for exercise.
 */
export const tagExerciseSchema = z.object({
  muscleGroups: z.array(
    z.enum([
      'chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms',
      'legs', 'quads', 'hamstrings', 'glutes', 'calves', 'core'
    ])
  ),
  equipment: z.array(
    z.enum([
      'barbell', 'dumbbell', 'kettlebell', 'cable', 'machine', 'bodyweight',
      'band', 'foam_roller', 'plate', 'medicine_ball', 'other'
    ])
  ),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
});
export type TagExercise = z.infer<typeof tagExerciseSchema>;

/**
 * Normalize exercise name to canonical slug.
 */
export const normalizeExerciseSchema = z.object({
  slug: z.string().toLowerCase().regex(/^[a-z0-9-]+$/),
  canonical: z.string(),
  aliases: z.array(z.string()),
});
export type NormalizeExercise = z.infer<typeof normalizeExerciseSchema>;

/**
 * Summarize check-in to bullets.
 */
export const summarizeCheckinSchema = z.object({
  bullets: z.array(z.string()).min(1).max(5),
  mood: z.enum(['positive', 'neutral', 'negative']).optional(),
});
export type SummarizeCheckin = z.infer<typeof summarizeCheckinSchema>;

/**
 * Tag notification priority.
 */
export const tagNotificationSchema = z.object({
  priority: z.number().min(1).max(5),
  category: z.enum(['training', 'nutrition', 'progress', 'message', 'system']),
  delay: z.enum(['immediate', 'batched']),
});
export type TagNotification = z.infer<typeof tagNotificationSchema>;

// ============ Sonnet tasks ============

/**
 * Generate training plan draft.
 */
export const generatePlanTrainingSchema = z.object({
  title: z.string(),
  block: z.string(),
  sessions: z.array(
    z.object({
      dayIndex: z.number(),
      title: z.string(),
      notes: z.string().optional(),
      exercises: z.array(
        z.object({
          name: z.string(),
          sets: z.number(),
          reps: z.string(),
          notes: z.string().optional(),
        })
      ),
    })
  ),
  notes: z.string().optional(),
});
export type GeneratePlanTraining = z.infer<typeof generatePlanTrainingSchema>;

/**
 * Generate nutrition plan draft.
 */
export const generatePlanNutritionSchema = z.object({
  title: z.string(),
  kcalTarget: z.number(),
  proteinG: z.number(),
  carbsG: z.number(),
  fatG: z.number(),
  meals: z.array(
    z.object({
      name: z.string(),
      time: z.string(),
      foods: z.array(
        z.object({
          name: z.string(),
          grams: z.number(),
        })
      ),
    })
  ),
  notes: z.string().optional(),
});
export type GeneratePlanNutrition = z.infer<typeof generatePlanNutritionSchema>;

/**
 * Analyze progress and suggest improvements.
 */
export const analyzeProgressSchema = z.object({
  summary: z.string(),
  trends: z.array(
    z.object({
      metric: z.string(),
      direction: z.enum(['up', 'down', 'stable']),
      magnitude: z.string(),
    })
  ),
  recommendations: z.array(z.string()),
  alerts: z.array(
    z.object({
      level: z.enum(['info', 'warning', 'critical']),
      message: z.string(),
    })
  ),
});
export type AnalyzeProgress = z.infer<typeof analyzeProgressSchema>;

/**
 * Coach assistant reply with suggested actions.
 */
export const coachAssistantSchema = z.object({
  reply: z.string(),
  suggestedActions: z.array(
    z.object({
      type: z.enum(['update_plan_set', 'send_message', 'schedule_checkin', 'create_target']),
      label: z.string(),
      payload: z.unknown(),
    })
  ),
  confidence: z.number().min(0).max(1),
});
export type CoachAssistant = z.infer<typeof coachAssistantSchema>;

/**
 * Rewrite feedback to be professional and empathetic.
 */
export const rewriteFeedbackSchema = z.object({
  original: z.string(),
  rewritten: z.string(),
  tone: z.enum(['supportive', 'professional', 'challenging']),
});
export type RewriteFeedback = z.infer<typeof rewriteFeedbackSchema>;
