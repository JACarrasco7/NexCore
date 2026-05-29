import { describe, it, expect } from 'vitest'
import {
  checkInSchema,
  bodyMeasurementSchema,
  dailyLogSchema,
  setLogSchema,
  sessionLogSchema,
  nutritionLogSchema,
  nutritionPlanSchema,
  onboardingAthleteSchema,
  verifyEmailSchema,
  twilioWebhookSchema,
  resendWebhookSchema,
  exerciseNoteSchema,
} from '../index'

describe('checkInSchema', () => {
  it('valida check-in válido', () => {
    const result = checkInSchema.safeParse({
      athleteId: 'athlete-123',
      weightKg: 75,
      adherencePct: 85,
      sleepAvg: 7.5,
      stepsAvg: 8000,
    })
    expect(result.success).toBe(true)
  })

  it('rechaza peso fuera de rango', () => {
    const result = checkInSchema.safeParse({
      athleteId: 'athlete-123',
      weightKg: 20,
    })
    expect(result.success).toBe(false)
  })
})

describe('dailyLogSchema', () => {
  it('valida log diario válido', () => {
    const result = dailyLogSchema.safeParse({
      athleteId: 'athlete-123',
      weightKg: 75,
      steps: 10000,
      sleepHours: 8,
    })
    expect(result.success).toBe(true)
  })
})

describe('setLogSchema', () => {
  it('valida serie válida', () => {
    const result = setLogSchema.safeParse({
      exerciseIndex: 0,
      exercise: 'Press de banca',
      setNumber: 1,
      loadKg: 80,
      reps: 10,
      rir: 2,
    })
    expect(result.success).toBe(true)
  })
})

describe('sessionLogSchema', () => {
  it('valida sesión válida', () => {
    const result = sessionLogSchema.safeParse({
      athleteId: 'athlete-123',
      planId: 'plan-123',
      sessionId: 'session-123',
      sessionName: 'Push day',
      sets: [{ exerciseIndex: 0, exercise: 'Press', setNumber: 1, loadKg: 80, reps: 10, rir: 2 }],
    })
    expect(result.success).toBe(true)
  })
})

describe('nutritionLogSchema', () => {
  it('valida log nutricional válido', () => {
    const result = nutritionLogSchema.safeParse({
      athleteId: 'athlete-123',
      mealName: 'Desayuno',
      kcal: 500,
      proteinG: 30,
      carbsG: 50,
      fatG: 15,
    })
    expect(result.success).toBe(true)
  })
})

describe('nutritionPlanSchema', () => {
  it('valida plan nutricional válido', () => {
    const result = nutritionPlanSchema.safeParse({
      athleteId: 'athlete-123',
      title: 'Plan volumen',
      kcalTarget: 2500,
      proteinG: 180,
      carbsG: 300,
      fatG: 80,
      meals: [{ name: 'Desayuno', foods: [{ food: 'Avena', quantity: 100, unit: 'g' }] }],
    })
    expect(result.success).toBe(true)
  })
})

describe('onboardingAthleteSchema', () => {
  it('valida onboarding válido', () => {
    const result = onboardingAthleteSchema.safeParse({
      fullName: 'Juan Pérez',
      goal: 'VOLUMEN',
      weightKg: 75,
    })
    expect(result.success).toBe(true)
  })

  it('rechaza email inválido', () => {
    const result = onboardingAthleteSchema.safeParse({
      fullName: 'Juan Pérez',
      email: 'email-invalido',
      goal: 'volumen',
    })
    expect(result.success).toBe(false)
  })
})

describe('verifyEmailSchema', () => {
  it('valida email y token', () => {
    const result = verifyEmailSchema.safeParse({
      token: 'abc123',
      email: 'test@example.com',
    })
    expect(result.success).toBe(true)
  })

  it('rechaza email inválido', () => {
    const result = verifyEmailSchema.safeParse({
      token: 'abc123',
      email: 'invalido',
    })
    expect(result.success).toBe(false)
  })
})

describe('twilioWebhookSchema', () => {
  it('valida webhook de Twilio', () => {
    const result = twilioWebhookSchema.safeParse({
      MessageSid: 'SM123',
      MessageStatus: 'delivered',
    })
    expect(result.success).toBe(true)
  })
})

describe('resendWebhookSchema', () => {
  it('valida webhook de Resend', () => {
    const result = resendWebhookSchema.safeParse({
      event: 'delivered',
      message: { id: 'msg_123' },
    })
    expect(result.success).toBe(true)
  })
})

describe('exerciseNoteSchema', () => {
  it('valida nota de ejercicio', () => {
    const result = exerciseNoteSchema.safeParse({
      athleteId: 'athlete-123',
      exerciseName: 'Sentadilla',
      content: 'Buena técnica',
    })
    expect(result.success).toBe(true)
  })
})
