import { NextResponse } from 'next/server'

type ErrorPayload = { error: string; code?: string; details?: unknown }

function errorJson(payload: ErrorPayload, status = 400) {
  return NextResponse.json(payload, { status })
}

export const badRequest = (message = 'Bad Request', details?: unknown) =>
  errorJson({ error: message, details }, 400)

export const unauthorized = (message = 'No autorizado') => errorJson({ error: message }, 401)

export const forbidden = (message = 'Forbidden') => errorJson({ error: message }, 403)

export const notFound = (message = 'Not found') => errorJson({ error: message }, 404)

export const tooManyRequests = (message = 'Too many requests') =>
  errorJson({ error: message }, 429)

export const serverError = (message = 'Internal server error') =>
  errorJson({ error: message }, 500)

export const unsupportedMediaType = (message = 'Unsupported Media Type') =>
  errorJson({ error: message }, 415)

export const payloadTooLarge = (message = 'Payload Too Large') =>
  errorJson({ error: message }, 413)

export default {
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  tooManyRequests,
  serverError,
}
