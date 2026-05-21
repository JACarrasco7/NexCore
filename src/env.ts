import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

export const env = createEnv({
  /**
   * Variables de servidor — nunca expuestas al cliente.
   */
  server: {
    // Base de datos
    DATABASE_URL: z.string().min(1),

    // NextAuth
    AUTH_SECRET: z.string().min(32),
    NEXTAUTH_URL: z.string().url().optional(),
    AUTH_TRUST_HOST: z
      .string()
      .optional()
      .transform((v) => v === 'true'),

    // Email (Resend)
    RESEND_API_KEY: z.string().min(1),
    EMAIL_FROM: z.string().email(),

    // Push (OneSignal)
    ONESIGNAL_APP_ID: z.string().optional(),
    ONESIGNAL_API_KEY: z.string().optional(),

    // SMS (Twilio) — opcional, puede reemplazarse por push+email
    SMS_ENABLED: z
      .string()
      .optional()
      .transform((v) => v === 'true'),
    TWILIO_ACCOUNT_SID: z.string().optional(),
    TWILIO_AUTH_TOKEN: z.string().optional(),
    TWILIO_FROM_NUMBER: z.string().optional(),

    // Caché (Upstash Redis)
    UPSTASH_REDIS_REST_URL: z.string().url().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

    // MyFitnessPal API (opcional)
    MFP_USE_RAPIDAPI: z
      .string()
      .optional()
      .transform((v) => v === 'true'),
    MFP_API_KEY: z.string().optional(),
    MFP_API_HOST: z.string().optional(),
    MFP_API_BASE_URL: z.string().url().optional().or(z.literal('')),

    // ExerciseDB vía RapidAPI (opcional — GIFs animados, plan desde $12.99/mes)
    EXERCISEDB_RAPIDAPI_KEY: z.string().optional(),

    // Nutritionix (opcional — búsqueda de alimentos premium)
    NUTRITIONIX_APP_ID: z.string().optional(),
    NUTRITIONIX_API_KEY: z.string().optional(),

    // Observabilidad (FASE C)
    SENTRY_DSN: z.string().url().optional(),

    // Storage Cloudflare R2 (FASE D)
    R2_ACCOUNT_ID: z.string().optional(),
    R2_ACCESS_KEY_ID: z.string().optional(),
    R2_SECRET_ACCESS_KEY: z.string().optional(),
    R2_BUCKET_NAME: z.string().optional(),
    R2_PUBLIC_URL: z.string().url().optional(),
  },

  /**
   * Variables de cliente — deben empezar por NEXT_PUBLIC_.
   */
  client: {
    NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
    NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional(),
  },

  /**
   * Necesario para que @t3-oss/env-nextjs lea correctamente las variables.
   * En Next.js el runtime no las inyecta en process.env en el lado cliente
   * salvo que se declaren aquí explícitamente.
   */
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    AUTH_TRUST_HOST: process.env.AUTH_TRUST_HOST,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
    ONESIGNAL_APP_ID: process.env.ONESIGNAL_APP_ID,
    ONESIGNAL_API_KEY: process.env.ONESIGNAL_API_KEY,
    SMS_ENABLED: process.env.SMS_ENABLED,
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
    TWILIO_FROM_NUMBER: process.env.TWILIO_FROM_NUMBER,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    MFP_USE_RAPIDAPI: process.env.MFP_USE_RAPIDAPI,
    MFP_API_KEY: process.env.MFP_API_KEY,
    MFP_API_HOST: process.env.MFP_API_HOST,
    MFP_API_BASE_URL: process.env.MFP_API_BASE_URL,
    EXERCISEDB_RAPIDAPI_KEY: process.env.EXERCISEDB_RAPIDAPI_KEY,
    NUTRITIONIX_APP_ID: process.env.NUTRITIONIX_APP_ID,
    NUTRITIONIX_API_KEY: process.env.NUTRITIONIX_API_KEY,
    SENTRY_DSN: process.env.SENTRY_DSN,
    R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
    R2_BUCKET_NAME: process.env.R2_BUCKET_NAME,
    R2_PUBLIC_URL: process.env.R2_PUBLIC_URL,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  },

  /**
   * Salta la validación en tests/CI donde solo se necesitan mocks.
   * Activa con: SKIP_ENV_VALIDATION=true
   */
  skipValidation: process.env.SKIP_ENV_VALIDATION === 'true',
})
