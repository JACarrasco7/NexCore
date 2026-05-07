import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Performance sampling — 10 % en prod, 100 % en dev
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // No enviar si no hay DSN (dev local sin config)
  enabled: !!process.env.SENTRY_DSN,

  environment: process.env.NODE_ENV,
})
