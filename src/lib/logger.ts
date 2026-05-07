/**
 * Logger estructurado basado en Pino.
 *
 * - En desarrollo: pretty-print con colores para legibilidad.
 * - En producción: JSON crudo para consumo por Loki / Logtail / Datadog.
 *
 * Uso:
 *   import { logger } from '@/lib/logger'
 *   logger.info({ userId, action: 'login' }, 'User authenticated')
 *   logger.error({ err }, 'Unexpected failure')
 */

import pino from 'pino'

const isDev = process.env.NODE_ENV === 'development'

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info'),

  // En desarrollo formateamos bonito; en prod JSON puro
  ...(isDev && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:HH:MM:ss',
        ignore: 'pid,hostname',
      },
    },
  }),

  // Campos base en cada log en producción
  base: isDev
    ? undefined
    : {
        env: process.env.NODE_ENV,
        service: 'app-fitness',
      },

  // Redactar campos sensibles — nunca loguear credenciales
  redact: {
    paths: [
      'password',
      'token',
      'accessToken',
      'refreshToken',
      'authorization',
      'cookie',
      '*.password',
      '*.token',
    ],
    censor: '[REDACTED]',
  },

  // Serializar errores correctamente
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
})

/** Logger con contexto de módulo. Útil para trazabilidad por servicio. */
export function createLogger(module: string) {
  return logger.child({ module })
}
