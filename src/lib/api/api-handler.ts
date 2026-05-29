import { NextRequest, NextResponse } from 'next/server'
import { ZodError, ZodSchema } from 'zod'
import { BusinessError, ApiError, ErrorCodes } from '../errors'
import { requireSession } from './auth-helpers'
import type { AppSession } from '@/types/auth'

export type ApiContext = {
  params: Record<string, string>
  session: AppSession
  req: NextRequest
}

/** Context for public routes — session may be null */
export type PublicApiContext = {
  params: Record<string, string>
  session: null
  req: NextRequest
}

export type ApiHandler<T = unknown> = (ctx: ApiContext) => Promise<T>

export interface ApiHandlerOpts<T = unknown> {
  /**
   * Auth requirement: 'public', 'session', 'admin', 'coach', 'athlete', 'team'
   */
  auth?: 'public' | 'session' | 'admin' | 'coach' | 'athlete' | 'team'

  /**
   * Main handler function. Receives context with session + params.
   */
  handler: ApiHandler<T>

  /**
   * Optional: validate params shape before handler runs
   */
  paramsSchema?: ZodSchema

  /**
   * Optional: rate limit { requests, window: 'minute' | 'hour' }
   */
  rateLimit?: { requests: number; window: 'minute' | 'hour' }
}

/**
 * Standard API handler wrapper.
 * Handles auth, error conversion, shape normalization.
 *
 * Usage:
 *   export const GET = apiHandler({
 *     auth: 'session',
 *     handler: async (ctx) => {
 *       const data = await service.list(ctx.session!);
 *       return { items: data, total: data.length };
 *     },
 *   });
 */
export function apiHandler<T = unknown>(opts: ApiHandlerOpts<T>) {
  const { auth = 'public', handler, paramsSchema, rateLimit } = opts

  return async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
    const start = Date.now()
    const resolvedParams = await params

    try {
      // Validate params if schema provided
      if (paramsSchema) {
        paramsSchema.parse(resolvedParams)
      }

      // Auth check
      let session: AppSession | null = null
      if (auth !== 'public') {
        session = await requireSession()

        if (!session) {
          return NextResponse.json(
            { error: 'Unauthorized', code: ErrorCodes.UNAUTHORIZED },
            { status: 401 }
          )
        }

        // Role checks (basic; enhance with more granular checks in service layer)
        const userRole = session?.user?.role
        if (auth === 'admin' && userRole !== 'ADMIN') {
          return NextResponse.json(
            { error: 'Admin required', code: ErrorCodes.INSUFFICIENT_PERMISSION },
            { status: 403 }
          )
        }

        if (auth === 'coach' && !['ADMIN', 'COACH'].includes(userRole ?? '')) {
          return NextResponse.json(
            { error: 'Coach access required', code: ErrorCodes.INSUFFICIENT_PERMISSION },
            { status: 403 }
          )
        }

        if (auth === 'athlete' && !['ADMIN', 'ATHLETE'].includes(userRole ?? '')) {
          return NextResponse.json(
            { error: 'Athlete access required', code: ErrorCodes.INSUFFICIENT_PERMISSION },
            { status: 403 }
          )
        }
      }

      // Rate limit check (basic; enhance with Redis for distributed)
      if (rateLimit && session) {
        // TODO: implement with @upstash/ratelimit
        // const { success } = await limiter.limit(session.user.id);
        // if (!success) return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
      }

      // Call handler
      const data = await handler({
        params: resolvedParams,
        session,
        req,
      })

      const durationMs = Date.now() - start

      // Log successful call
      if (process.env.NODE_ENV === 'development') {
        console.log(`[API] ${req.method} ${req.nextUrl.pathname} ${durationMs}ms - 200`)
      }

      return NextResponse.json(data)
    } catch (error) {
      const durationMs = Date.now() - start

      // Zod validation error
      if (error instanceof ZodError) {
        console.warn(
          `[API] ${req.method} ${req.nextUrl.pathname} ${durationMs}ms - 400 (validation)`
        )
        return NextResponse.json(
          {
            error: 'Validation failed',
            code: ErrorCodes.VALIDATION_FAILED,
            issues: error.issues,
          },
          { status: 400 }
        )
      }

      // Business logic error
      if (error instanceof BusinessError) {
        console.warn(
          `[API] ${req.method} ${req.nextUrl.pathname} ${durationMs}ms - ${error.status} (${error.code})`
        )
        return NextResponse.json(
          { error: error.message, code: error.code },
          { status: error.status }
        )
      }

      // API error
      if (error instanceof ApiError) {
        console.warn(
          `[API] ${req.method} ${req.nextUrl.pathname} ${durationMs}ms - ${error.status}`
        )
        return NextResponse.json(
          { error: error.message, code: error.code },
          { status: error.status }
        )
      }

      // Unexpected error
      console.error(`[API] ${req.method} ${req.nextUrl.pathname} ${durationMs}ms - 500`, error)

      return NextResponse.json(
        { error: 'Internal server error', code: ErrorCodes.INTERNAL_ERROR },
        { status: 500 }
      )
    }
  }
}
