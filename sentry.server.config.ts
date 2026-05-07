import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Server: samplear menos, errores son más costosos
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1.0,

  enabled: !!process.env.SENTRY_DSN,

  environment: process.env.NODE_ENV,
})
